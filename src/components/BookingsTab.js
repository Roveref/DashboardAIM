// Format date in French format
const formatDateFR = (date) => {
  if (!date) return "";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
import React, { useState, useEffect } from "react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  Button,
  Divider,
  useTheme,
  alpha,
  Fade,
  Slider,
  Chip,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import OpportunityList from "./OpportunityList";
import {
  sumBy,
  getMonthlyYearlyTotals,
  formatYearOverYearData,
  getNewOpportunities,
  getNewWins,
  getNewLosses,
} from "../utils/dataUtils";

const BookingsTab = ({ data, loading, onSelection, selectedOpportunities }) => {
  const [periodRange, setPeriodRange] = useState([0, 100]);

  // Generate timeline marks for the slider that correspond to month beginnings
  const generateTimelineMarks = (startDate, endDate) => {
    if (!startDate || !endDate) return [];

    const marks = [];

    // Create a copy of the start date and set to first of the month
    const currentDate = new Date(startDate);
    currentDate.setDate(1); // Set to first day of month

    // Create end date copy for calculations
    const endDateCopy = new Date(endDate);
    // Set to the first day of the next month to include the last month
    endDateCopy.setMonth(endDateCopy.getMonth() + 1);
    endDateCopy.setDate(1);

    // Get the total duration in milliseconds for percentage calculations
    const totalDuration = endDateCopy.getTime() - currentDate.getTime();
    if (totalDuration <= 0) return [];

    // Loop through each month until we reach the end date
    while (currentDate < endDateCopy) {
      // Calculate position percentage for this month
      const position =
        ((currentDate.getTime() - startDate.getTime()) / totalDuration) * 100;

      // Make sure the position is within the slider range (0-100)
      if (position >= 0 && position <= 100) {
        // Determine label format - show year for January or if it's the first mark
        const isYearChange = currentDate.getMonth() === 0 || marks.length === 0;

        marks.push({
          value: position,
          label: isYearChange
            ? currentDate.toLocaleDateString("fr-FR", {
                month: "short",
                year: "numeric",
              })
            : currentDate.toLocaleDateString("fr-FR", { month: "short" }),
          // Store the actual date for reference
          date: new Date(currentDate),
        });
      }

      // Move to first day of next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return marks;
  };

  // Snap to month beginnings when updating date range
  const prepareDateRange = () => {
    if (!data || data.length === 0) return;

    // Sort data by Last Status Change Date
    const sortedData = [...data].sort(
      (a, b) =>
        new Date(a["Last Status Change Date"]) -
        new Date(b["Last Status Change Date"])
    );

    const firstDate = new Date(sortedData[0]["Last Status Change Date"]);
    const lastDate = new Date(
      sortedData[sortedData.length - 1]["Last Status Change Date"]
    );
    const totalDuration = lastDate.getTime() - firstDate.getTime();

    // Calculate raw start and end dates based on slider
    const rawStart = new Date(
      firstDate.getTime() + (totalDuration * periodRange[0]) / 100
    );
    const rawEnd = new Date(
      firstDate.getTime() + (totalDuration * periodRange[1]) / 100
    );

    // Snap start date to beginning of month
    const start = new Date(rawStart);
    start.setDate(1);

    // Snap end date to beginning of month and add a month (to include the whole month)
    const end = new Date(rawEnd);
    end.setDate(1);
    if (periodRange[1] < 100) {
      // If not at the very end
      end.setMonth(end.getMonth() + 1);
    }

    setDateRange([start, end]);
  };

  const handlePeriodChange = (event, newValue) => {
    setPeriodRange(newValue);

    // Find matching timeline marks for the selection
    if (data && data.length > 0) {
      const sortedData = [...data].sort(
        (a, b) =>
          new Date(a["Last Status Change Date"]) -
          new Date(b["Last Status Change Date"])
      );

      const firstDate = new Date(sortedData[0]["Last Status Change Date"]);
      const lastDate = new Date(
        sortedData[sortedData.length - 1]["Last Status Change Date"]
      );

      // Get all available month marks
      const timelineMarks = generateTimelineMarks(firstDate, lastDate);

      // Find closest marks to selection points
      // This ensures we're selecting exactly at month boundaries
      if (timelineMarks.length > 0) {
        // Find closest mark to start position
        const startMarkIndex = timelineMarks.reduce(
          (closest, current, index) => {
            const currentDiff = Math.abs(current.value - newValue[0]);
            const closestDiff = Math.abs(
              timelineMarks[closest].value - newValue[0]
            );
            return currentDiff < closestDiff ? index : closest;
          },
          0
        );

        // Find closest mark to end position
        const endMarkIndex = timelineMarks.reduce((closest, current, index) => {
          const currentDiff = Math.abs(current.value - newValue[1]);
          const closestDiff = Math.abs(
            timelineMarks[closest].value - newValue[1]
          );
          return currentDiff < closestDiff ? index : closest;
        }, 0);

        // Get the actual dates from marks
        if (timelineMarks[startMarkIndex] && timelineMarks[endMarkIndex]) {
          // Directly set the date range to the exact month beginnings from marks
          setDateRange([
            timelineMarks[startMarkIndex].date,
            // If end mark is not the last one, increase by a month to include the whole month
            endMarkIndex < timelineMarks.length - 1
              ? new Date(
                  new Date(timelineMarks[endMarkIndex + 1].date).setDate(0)
                ) // Last day of month
              : lastDate,
          ]);
        }
      }
    }
  };
  const [yoyBookings, setYoyBookings] = useState([]);
  const [bookingsByServiceLine, setBookingsByServiceLine] = useState([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [filteredOpportunities, setFilteredOpportunities] = useState([]);
  const [dateRange, setDateRange] = useState([
    new Date(new Date().setDate(1)),
    new Date(),
  ]);
  const [newOpportunities, setNewOpportunities] = useState([]);
  const [newWins, setNewWins] = useState([]);
  const [newLosses, setNewLosses] = useState([]);
  const [analysisTab, setAnalysisTab] = useState(0);
  const [years, setYears] = useState([]);
  const [cumulativeData, setCumulativeData] = useState([]);

  const theme = useTheme();

  // More distinct color palette
  const COLORS = [
    {
      bar: "#1E88E5", // Vibrant Blue
      line: "#0D47A1", // Dark Blue
      opacity: 0.7,
    },
    {
      bar: "#D81B60", // Vibrant Pink
      line: "#880E4F", // Dark Maroon
      opacity: 0.7,
    },
    {
      bar: "#FFC107", // Amber
      line: "#FF6F00", // Dark Orange
      opacity: 0.7,
    },
    {
      bar: "#004D40", // Dark Teal
      line: "#00251A", // Almost Black Teal
      opacity: 0.7,
    },
    {
      bar: "#6A1B9A", // Deep Purple
      line: "#4A148C", // Darker Purple
      opacity: 0.7,
    },
  ];

  // Update date analysis method to use Last Status Change Date
  const updateDateAnalysis = () => {
    if (!data || !dateRange[0] || !dateRange[1]) return;

    const startDate = dateRange[0];
    const endDate = dateRange[1];

    console.log("Updating Date Analysis:");
    console.log("Start Date:", startDate);
    console.log("End Date:", endDate);

    // Get new bookings and losses within the date range, based on Last Status Change Date
    // For booking (status 14), the winning date is the last status change date
    const wins = data.filter((item) => {
      if (item["Status"] !== 14) return false;
      const statusDate = new Date(item["Last Status Change Date"]);
      return statusDate >= startDate && statusDate <= endDate;
    });

    // For losses (status 15), the lost date is the last status change date
    const losses = data.filter((item) => {
      if (item["Status"] !== 15) return false;
      const statusDate = new Date(item["Last Status Change Date"]);
      return statusDate >= startDate && statusDate <= endDate;
    });

    console.log("Wins:", wins.length);
    console.log("Losses:", losses.length);

    setNewWins(wins);
    setNewLosses(losses);

    // Update filtered opportunities based on current tab
    if (analysisTab === 0) {
      setFilteredOpportunities(wins);
    } else if (analysisTab === 1) {
      setFilteredOpportunities(losses);
    }
  };

  // Calculate cumulative data for years
  const calculateCumulativeTotals = (bookingsData) => {
    return bookingsData.map((monthData, index) => {
      const cumulativeMonth = { ...monthData };

      // Calculate cumulative totals for each year
      years.forEach((year) => {
        // Sum all previous months' values for this year
        const cumulativeValue = bookingsData
          .slice(0, index + 1)
          .reduce((sum, prevMonth) => {
            return sum + (prevMonth[year] || 0);
          }, 0);

        // Add cumulative value for this year
        cumulativeMonth[`${year}_cumulative`] = cumulativeValue;
      });

      return cumulativeMonth;
    });
  };

  const handleChartClick = (data) => {
    if (!data || !data.activePayload || data.activePayload.length === 0) return;

    const clickedItem = data.activePayload[0].payload;
    const clickedKey = data.activePayload[0].dataKey;

    // Defensive parsing of the clicked key
    const yearMatch = String(clickedKey).match(/^(\d+)(_cumulative)?$/);

    if (!yearMatch) return;

    const year = yearMatch[1];

    // Get the opportunities for this month and year
    const opps = clickedItem[`${year}Opps`] || [];

    if (opps.length > 0) {
      setFilteredOpportunities(opps);
    }
  };

  const handleDateChange = (index, date) => {
    const newDateRange = [...dateRange];
    newDateRange[index] = date;
    setDateRange(newDateRange);
  };

  const handleAnalysisTabChange = (event, newValue) => {
    setAnalysisTab(newValue);

    // Update filtered opportunities based on tab
    if (newValue === 0) {
      // Wins (booked opportunities)
      setFilteredOpportunities(newWins);
    } else if (newValue === 1) {
      // Lost opportunities
      setFilteredOpportunities(newLosses);
    }
  };
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Card
          sx={{
            p: 1.5,
            backgroundColor: "white",
            border: "1px solid",
            borderColor: alpha(theme.palette.primary.main, 0.1),
            boxShadow: theme.shadows[3],
            borderRadius: 2,
          }}
        >
          <Typography variant="subtitle2" fontWeight={600}>
            {label}
          </Typography>
          {payload.map((entry, index) => {
            // Defensive check for dataKey
            const dataKey = String(entry.dataKey || "");

            // Check for cumulative using regex
            const isCumulative = dataKey.includes("_cumulative");
            const year = dataKey.replace("_cumulative", "");

            // Skip entries that don't look like valid year data
            if (!/^\d+(_cumulative)?$/.test(dataKey)) return null;

            return (
              <Box key={`item-${index}`} sx={{ mt: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      backgroundColor: entry.color,
                      borderRadius: "50%",
                      mr: 1,
                    }}
                  />
                  <Typography variant="body2" sx={{ mr: 1 }}>
                    {isCumulative ? "Cumulative " : ""}
                    {year}:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(entry.value || 0)}
                  </Typography>
                </Box>
                {!isCumulative && (
                  <Typography variant="caption" color="text.secondary">
                    {payload[0].payload[`${year}Count`] || 0} opportunities
                  </Typography>
                )}
              </Box>
            );
          })}
        </Card>
      );
    }
    return null;
  };

  useEffect(() => {
    // Prepare date range whenever period slider changes
    prepareDateRange();
  }, [periodRange, data]);

  useEffect(() => {
    // Trigger date analysis when date range is updated
    if (dateRange[0] && dateRange[1]) {
      updateDateAnalysis();
    }
  }, [dateRange]);

  useEffect(() => {
    if (!data || loading) return;

    // Reset filtered opportunities
    setFilteredOpportunities(data);

    // Calculate total bookings revenue
    const total = sumBy(
      data,
      data[0] && data[0]["Is Allocated"]
        ? "Allocated Gross Revenue"
        : "Gross Revenue"
    );
    setTotalBookings(total);

    // Calculate monthly yearly bookings for the bar chart
    // Use Last Status Change Date instead of Creation Date
    const bookedData = data.filter((item) => item["Status"] === 14);
    const monthly = getMonthlyYearlyTotals(
      bookedData, // Use only booked opportunities
      "Last Status Change Date", // Use Last Status Change Date instead of Creation Date
      "Gross Revenue"
    );
    const uniqueYears = [...new Set(monthly.map((item) => item.year))].sort();
    setYears(uniqueYears);

    // Format data for YoY comparison
    const yoyData = formatYearOverYearData(monthly);
    setYoyBookings(yoyData);

    // Calculate cumulative data
    const cumData = calculateCumulativeTotals(yoyData);
    setCumulativeData(cumData);

    // Group data by service line for pie chart
    const byServiceLine = [];
    const serviceLinesMap = {};

    data.forEach((opp) => {
      const serviceLine = opp["Service Line 1"];
      if (!serviceLine) return;

      const revenue =
        opp["Is Allocated"] && opp["Allocated Gross Revenue"]
          ? opp["Allocated Gross Revenue"]
          : opp["Gross Revenue"] || 0;

      if (!serviceLinesMap[serviceLine]) {
        serviceLinesMap[serviceLine] = {
          name: serviceLine,
          value: 0,
          count: 0,
        };
        byServiceLine.push(serviceLinesMap[serviceLine]);
      }

      serviceLinesMap[serviceLine].value += revenue;
      serviceLinesMap[serviceLine].count += 1;
    });

    // Sort by value descending
    byServiceLine.sort((a, b) => b.value - a.value);
    setBookingsByServiceLine(byServiceLine);

    // Calculate new opportunities, wins, and losses
    updateDateAnalysis();
  }, [data, loading]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Filter for 2025 bookings
  const bookings2025 = filteredOpportunities.filter(
    (item) =>
      item["Status"] === 14 &&
      new Date(item["Last Status Change Date"]).getFullYear() === 2025
  );

  // Filter for 2025 losses
  const losses2025 = filteredOpportunities.filter(
    (item) =>
      item["Status"] === 15 &&
      new Date(item["Last Status Change Date"]).getFullYear() === 2025
  );

  // Get total revenue for 2025 bookings
  const bookings2025Revenue = sumBy(bookings2025, (item) => {
    // Check if allocation exists and is meaningful
    if (item["Is Allocated"] && item["Allocated Gross Revenue"] > 0) {
      return item["Allocated Gross Revenue"];
    }
    // Fallback to Gross Revenue if no meaningful allocation
    return item["Gross Revenue"] || 0;
  });

  // Get total revenue for 2025 losses
  const losses2025Revenue = sumBy(losses2025, (item) => {
    // Check if allocation exists and is meaningful
    if (item["Is Allocated"] && item["Allocated Gross Revenue"] > 0) {
      return item["Allocated Gross Revenue"];
    }
    // Fallback to Gross Revenue if no meaningful allocation
    return item["Gross Revenue"] || 0;
  });

  // Calculate average booking size for 2025
  const averageBookingSize2025 =
    bookings2025.length > 0 ? bookings2025Revenue / bookings2025.length : 0;

  // All 2025 bookings for total card comparison
  const allBookings2025 = data.filter(
    (item) =>
      item["Status"] === 14 &&
      new Date(item["Last Status Change Date"]).getFullYear() === 2025
  );

  // All 2025 losses for total card comparison
  const allLosses2025 = data.filter(
    (item) =>
      item["Status"] === 15 &&
      new Date(item["Last Status Change Date"]).getFullYear() === 2025
  );

  // Get total revenue for all 2025 bookings
  const allBookings2025Revenue = sumBy(allBookings2025, "Gross Revenue");

  // Get total revenue for all 2025 losses
  const allLosses2025Revenue = sumBy(allLosses2025, "Gross Revenue");

  // Calculate average booking size for all 2025 bookings
  const allAverageBookingSize2025 =
    allBookings2025.length > 0
      ? allBookings2025Revenue / allBookings2025.length
      : 0;

  return (
    <Fade in={!loading} timeout={500}>
      <Box sx={{ width: "100%" }}>
        {/* Updated Calculation Logic for Allocation */}
        <Grid
          container
          spacing={3}
          sx={{
            width: "100%",
            mb: 3,
          }}
        >
          {/* Total Bookings Card */}
          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                p: 3,
                backgroundColor: alpha(theme.palette.primary.main, 0.04),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Total Bookings 2025
                </Typography>

                <Chip
                  label={`${bookings2025.length} opps`}
                  color="primary"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: "0.675rem",
                    fontWeight: 600,
                  }}
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Box>
                  <Typography
                    variant="h5"
                    color="primary.main"
                    fontWeight={700}
                    sx={{ mb: 0.5 }}
                  >
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(bookings2025Revenue)}
                  </Typography>
                  {filteredOpportunities.length !== data.length && (
                    <Typography variant="caption" color="text.secondary">
                      (Total:{" "}
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(allBookings2025Revenue)}
                      )
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {bookings2025.length} opportunities
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    color: theme.palette.success.main,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="inherit"
                    fontWeight={600}
                    sx={{ mr: 1 }}
                  >
                    {filteredOpportunities.length !== data.length
                      ? `${Math.round(
                          (bookings2025.length / allBookings2025.length) * 100
                        )}%`
                      : "100%"}{" "}
                    vs total
                  </Typography>
                  <ArrowUpwardIcon fontSize="small" color="inherit" />
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Total Lost Opportunities Card */}
          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                p: 3,
                backgroundColor: alpha(theme.palette.error.main, 0.04),
                border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Total Lost 2025
                </Typography>

                <Chip
                  label={`${losses2025.length} opps`}
                  color="error"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: "0.675rem",
                    fontWeight: 600,
                  }}
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Box>
                  <Typography
                    variant="h5"
                    color="error.main"
                    fontWeight={700}
                    sx={{ mb: 0.5 }}
                  >
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(losses2025Revenue)}
                  </Typography>
                  {filteredOpportunities.length !== data.length && (
                    <Typography variant="caption" color="text.secondary">
                      (Total:{" "}
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(allLosses2025Revenue)}
                      )
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {losses2025.length} lost opportunities
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    color: theme.palette.error.main,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="inherit"
                    fontWeight={600}
                    sx={{ mr: 1 }}
                  >
                    {filteredOpportunities.length !== data.length &&
                    allLosses2025.length > 0
                      ? `${Math.round(
                          (losses2025.length / allLosses2025.length) * 100
                        )}%`
                      : "100%"}{" "}
                    vs total
                  </Typography>
                  <ArrowDownwardIcon fontSize="small" color="inherit" />
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Average Booking Size Card */}
          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                p: 3,
                backgroundColor: alpha(theme.palette.secondary.main, 0.04),
                border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Average Booking Size 2025
                </Typography>

                <Chip
                  label={`${bookings2025.length} opps`}
                  color="secondary"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: "0.675rem",
                    fontWeight: 600,
                  }}
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Box>
                  <Typography
                    variant="h5"
                    color="secondary.main"
                    fontWeight={700}
                    sx={{ mb: 0.5 }}
                  >
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(averageBookingSize2025)}
                  </Typography>
                  {filteredOpportunities.length !== data.length && (
                    <Typography variant="caption" color="text.secondary">
                      (Total:{" "}
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(allAverageBookingSize2025)}
                      )
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Range:{" "}
                  {bookings2025.length > 0 ? (
                    <>
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(
                        Math.min(
                          ...bookings2025.map((opp) =>
                            opp["Allocated Gross Revenue"] > 0
                              ? opp["Allocated Gross Revenue"]
                              : opp["Gross Revenue"] || 0
                          )
                        )
                      )}{" "}
                      -
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(
                        Math.max(
                          ...bookings2025.map((opp) =>
                            opp["Allocated Gross Revenue"] > 0
                              ? opp["Allocated Gross Revenue"]
                              : opp["Gross Revenue"] || 0
                          )
                        )
                      )}
                    </>
                  ) : (
                    "N/A"
                  )}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    color: theme.palette.success.main,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="inherit"
                    fontWeight={600}
                    sx={{ mr: 1 }}
                  >
                    {filteredOpportunities.length !== data.length &&
                    allBookings2025.length > 0
                      ? `${Math.round(
                          (bookings2025.length / allBookings2025.length) * 100
                        )}%`
                      : "100%"}{" "}
                    vs total
                  </Typography>
                  <ArrowUpwardIcon fontSize="small" color="inherit" />
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
        {/* Monthly Bookings Chart */}
        <Grid item xs={12}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              height: 500,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Monthly Bookings Year-over-Year with Cumulative Trend
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Click on bars or lines to see opportunities
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <ComposedChart
                data={cumulativeData}
                margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                onClick={handleChartClick}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="monthName" axisLine={false} tickLine={false} />

                {/* Left Y-Axis for Monthly Values */}
                <YAxis
                  yAxisId="monthly"
                  orientation="left"
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      notation: "compact",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(value)
                  }
                  axisLine={false}
                  tickLine={false}
                />

                {/* Right Y-Axis for Cumulative Values */}
                <YAxis
                  yAxisId="cumulative"
                  orientation="right"
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      notation: "compact",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(value)
                  }
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {/* Bars and Lines for each year */}
                {years.map((year, index) => {
                  const colorSet = COLORS[index % COLORS.length];
                  return (
                    <React.Fragment key={year}>
                      {/* Monthly Bars */}
                      <Bar
                        yAxisId="monthly"
                        dataKey={year}
                        name={`${year} Monthly`}
                        fill={colorSet.bar}
                        fillOpacity={colorSet.opacity}
                        stackId={`${year}-stack`}
                      />

                      {/* Cumulative Line */}
                      <Line
                        yAxisId="cumulative"
                        type="monotone"
                        dataKey={`${year}_cumulative`}
                        name={`${year} Cumulative`}
                        stroke={colorSet.line}
                        strokeWidth={3}
                        dot={false}
                      />
                    </React.Fragment>
                  );
                })}
              </ComposedChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Date Range Analysis */}
        <Grid item xs={12}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Period Analysis
            </Typography>
            <Box sx={{ px: 4, mb: 4 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Select a date range on the timeline
                </Typography>
              </Box>

              {data && data.length > 0 && (
                <>
                  {/* Timeline Slider */}
                  <Box
                    sx={{
                      mt: 3,
                      mb: 4,
                      height: 100, // Increased height for the timeline
                      position: "relative",
                    }}
                  >
                    {/* First get date range for the marks */}
                    {(() => {
                      const sortedData = [...data].sort(
                        (a, b) =>
                          new Date(a["Last Status Change Date"]) -
                          new Date(b["Last Status Change Date"])
                      );

                      const firstDate = new Date(
                        sortedData[0]["Last Status Change Date"]
                      );
                      const lastDate = new Date(
                        sortedData[sortedData.length - 1][
                          "Last Status Change Date"
                        ]
                      );

                      // Generate timeline marks
                      const timelineMarks = generateTimelineMarks(
                        firstDate,
                        lastDate
                      );

                      return (
                        <Slider
                          value={periodRange}
                          onChange={handlePeriodChange}
                          valueLabelDisplay="auto"
                          valueLabelFormat={(value) => {
                            // Find the corresponding date
                            const totalDuration =
                              lastDate.getTime() - firstDate.getTime();
                            const selectedDate = new Date(
                              firstDate.getTime() +
                                (totalDuration * value) / 100
                            );
                            return formatDateFR(selectedDate);
                          }}
                          marks={timelineMarks}
                          step={null} // This forces selection only at mark points
                          sx={{
                            "& .MuiSlider-markLabel": {
                              fontSize: "0.7rem",
                              color: "text.secondary",
                              transform: "rotate(-45deg) translateX(-100%)",
                              transformOrigin: "top left",
                              whiteSpace: "nowrap",
                              marginTop: "8px",
                            },
                            "& .MuiSlider-thumb": {
                              height: 16,
                              width: 16,
                              backgroundColor: theme.palette.primary.main,
                            },
                            "& .MuiSlider-track": {
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: theme.palette.primary.main,
                              border: "none", // Remove border to fix the blue line issue
                            },
                            "& .MuiSlider-rail": {
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: alpha(
                                theme.palette.primary.main,
                                0.2
                              ),
                              opacity: 1,
                            },
                            "& .MuiSlider-mark": {
                              backgroundColor: theme.palette.primary.main,
                              height: 8,
                              width: 1,
                              marginTop: -3,
                            },
                            mt: 4, // Extra margin at top to accommodate rotated labels
                            "& .MuiSlider-root": {
                              border: "none", // Remove any border on root element
                            },
                          }}
                        />
                      );
                    })()}

                    {/* Visual indicator of selected period (positioned below slider) */}
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: -10,
                        left: `${periodRange[0]}%`,
                        width: `${periodRange[1] - periodRange[0]}%`,
                        height: 4,
                        backgroundColor: alpha(theme.palette.primary.main, 0.6),
                        borderRadius: 2,
                        border: "none",
                      }}
                    />
                  </Box>
                </>
              )}

              {/* Date Range Display Panel */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mt: 2,
                  mb: 1,
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  borderRadius: 2,
                  p: 1.5,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Start date:
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="primary.main"
                  >
                    {dateRange[0] ? formatDateFR(dateRange[0]) : "Start"}
                  </Typography>
                </Box>

                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="caption" color="text.secondary">
                    Duration:
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="primary.dark"
                  >
                    {dateRange[0] && dateRange[1]
                      ? `${Math.round(
                          (dateRange[1] - dateRange[0]) / (1000 * 60 * 60 * 24)
                        )} days`
                      : "-"}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    align="right"
                  >
                    End date:
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="primary.main"
                    align="right"
                  >
                    {dateRange[1] ? formatDateFR(dateRange[1]) : "End"}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Tabs
              value={analysisTab}
              onChange={handleAnalysisTabChange}
              aria-label="analysis tabs"
              variant="fullWidth"
              sx={{ mb: 2 }}
            >
              <Tab label={`Wins (${newWins.length})`} />
              <Tab label={`Lost (${newLosses.length})`} />
            </Tabs>

            <Box sx={{ mb: 3 }}>
              {analysisTab === 0 && (
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={600}>
                      Won Opportunities in Period
                    </Typography>
                    <Box>
                      <Chip
                        label={`${newWins.length} wins`}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        label={new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(sumBy(newWins, "Gross Revenue"))}
                        size="small"
                        color="success"
                      />
                    </Box>
                  </Box>
                </Box>
              )}

              {analysisTab === 1 && (
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={600}>
                      Lost Opportunities in Period
                    </Typography>
                    <Box>
                      <Chip
                        label={`${newLosses.length} losses`}
                        size="small"
                        color="error"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        label={new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(sumBy(newLosses, "Gross Revenue"))}
                        size="small"
                        color="error"
                      />
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Opportunity List */}
        <Grid item xs={12}>
          <OpportunityList
            data={filteredOpportunities}
            title="Bookings"
            selectedOpportunities={selectedOpportunities}
            onSelectionChange={onSelection}
          />
        </Grid>
      </Box>
    </Fade>
  );
};

export default BookingsTab;
