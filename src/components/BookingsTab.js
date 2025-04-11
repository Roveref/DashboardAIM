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

  const prepareDateRange = () => {
    if (!data || data.length === 0) return;

    // Sort data by creation date
    const sortedData = [...data].sort(
      (a, b) => new Date(a["Creation Date"]) - new Date(b["Creation Date"])
    );

    const firstDate = new Date(sortedData[0]["Creation Date"]);
    const lastDate = new Date(
      sortedData[sortedData.length - 1]["Creation Date"]
    );
    const totalDuration = lastDate.getTime() - firstDate.getTime();

    // Calculate start and end dates based on slider
    const start = new Date(
      firstDate.getTime() + (totalDuration * periodRange[0]) / 100
    );
    const end = new Date(
      firstDate.getTime() + (totalDuration * periodRange[1]) / 100
    );

    setDateRange([start, end]);
  };

  const handlePeriodChange = (event, newValue) => {
    setPeriodRange(newValue);
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

  // Update date analysis method
  const updateDateAnalysis = () => {
    if (!data || !dateRange[0] || !dateRange[1]) return;

    const startDate = dateRange[0];
    const endDate = dateRange[1];

    console.log("Updating Date Analysis:");
    console.log("Start Date:", startDate);
    console.log("End Date:", endDate);

    // Get new opportunities, wins, and losses within the date range
    const newOpps = getNewOpportunities(data, startDate, endDate);
    const wins = getNewWins(data, startDate, endDate);
    const losses = getNewLosses(data, startDate, endDate);

    console.log("New Opportunities:", newOpps.length);
    console.log("Wins:", wins.length);
    console.log("Losses:", losses.length);

    setNewOpportunities(newOpps);
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
                    {new Intl.NumberFormat("en-US", {
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

    const calculateRevenueWithAllocation = (opportunities) => {
      return opportunities.reduce((sum, item) => {
        // Check if the item has meaningful allocation
        if (item["Is Allocated"] && item["Allocation Percentage"] > 0) {
          return sum + (item["Allocated Gross Revenue"] || 0);
        }
        // Fallback to gross revenue if no allocation
        return sum + (item["Gross Revenue"] || 0);
      }, 0);
    };

    // Calculate monthly yearly bookings for the bar chart
    const bookedData = data.filter((item) => item["Status"] === 14);
    const monthly = getMonthlyYearlyTotals(
      bookedData, // Use only booked opportunities
      "Creation Date",
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
                  label={`${filteredOpportunities.length} opps`}
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
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(
                      filteredOpportunities
                        .filter(
                          (item) =>
                            item["Status"] === 14 &&
                            new Date(item["Creation Date"]).getFullYear() ===
                              2025
                        )
                        .reduce((sum, item) => {
                          // Check if the item has meaningful allocation
                          if (
                            item["Is Allocated"] &&
                            item["Allocation Percentage"] > 0
                          ) {
                            return sum + (item["Allocated Gross Revenue"] || 0);
                          }
                          // Fallback to gross revenue if no allocation
                          return sum + (item["Gross Revenue"] || 0);
                        }, 0)
                    )}
                  </Typography>
                  {filteredOpportunities.length !== data.length && (
                    <Typography variant="caption" color="text.secondary">
                      (Total:{" "}
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(
                        sumBy(
                          data.filter(
                            (item) =>
                              item["Status"] === 14 &&
                              new Date(item["Creation Date"]).getFullYear() ===
                                2025
                          ),
                          "Gross Revenue"
                        )
                      )}
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
                  {
                    filteredOpportunities.filter(
                      (item) =>
                        item["Status"] === 14 &&
                        new Date(item["Creation Date"]).getFullYear() === 2025
                    ).length
                  }{" "}
                  opportunities
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
                      ? `${filteredOpportunities.length}%`
                      : "10%"}{" "}
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
                  label={`${filteredOpportunities.length} opps`}
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
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(
                      sumBy(
                        filteredOpportunities.filter(
                          (item) =>
                            item["Status"] === 15 &&
                            new Date(item["Lost Date"]).getFullYear() === 2025
                        ),
                        (item) => {
                          // First check if allocation exists and is meaningful
                          if (item["Allocated Gross Revenue"] > 0) {
                            return item["Allocated Gross Revenue"];
                          }
                          // Fallback to Gross Revenue if no meaningful allocation
                          return item["Gross Revenue"] || 0;
                        }
                      )
                    )}
                  </Typography>
                  {filteredOpportunities.length !== data.length && (
                    <Typography variant="caption" color="text.secondary">
                      (Total:{" "}
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(
                        sumBy(
                          data.filter(
                            (item) =>
                              item["Status"] === 15 &&
                              new Date(item["Lost Date"]).getFullYear() === 2025
                          ),
                          "Gross Revenue"
                        )
                      )}
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
                  {
                    filteredOpportunities.filter(
                      (item) =>
                        item["Status"] === 15 &&
                        new Date(item["Lost Date"]).getFullYear() === 2025
                    ).length
                  }{" "}
                  lost opportunities
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
                    {filteredOpportunities.length !== data.length
                      ? `${filteredOpportunities.length}%`
                      : "-67%"}{" "}
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
                  label={`${filteredOpportunities.length} opps`}
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
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(
                      filteredOpportunities.filter(
                        (item) =>
                          item["Status"] === 14 &&
                          new Date(item["Creation Date"]).getFullYear() === 2025
                      ).length > 0
                        ? sumBy(
                            filteredOpportunities.filter(
                              (item) =>
                                item["Status"] === 14 &&
                                new Date(
                                  item["Creation Date"]
                                ).getFullYear() === 2025
                            ),
                            (item) => {
                              // First check if allocation exists and is meaningful
                              if (item["Allocated Gross Revenue"] > 0) {
                                return item["Allocated Gross Revenue"];
                              }
                              // Fallback to Gross Revenue if no meaningful allocation
                              return item["Gross Revenue"] || 0;
                            }
                          ) /
                            filteredOpportunities.filter(
                              (item) =>
                                item["Status"] === 14 &&
                                new Date(
                                  item["Creation Date"]
                                ).getFullYear() === 2025
                            ).length
                        : 0
                    )}
                  </Typography>
                  {filteredOpportunities.length !== data.length && (
                    <Typography variant="caption" color="text.secondary">
                      (Total:{" "}
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(
                        data.filter(
                          (item) =>
                            item["Status"] === 14 &&
                            new Date(item["Creation Date"]).getFullYear() ===
                              2025
                        ).length > 0
                          ? sumBy(
                              data.filter(
                                (item) =>
                                  item["Status"] === 14 &&
                                  new Date(
                                    item["Creation Date"]
                                  ).getFullYear() === 2025
                              ),
                              "Gross Revenue"
                            ) /
                              data.filter(
                                (item) =>
                                  item["Status"] === 14 &&
                                  new Date(
                                    item["Creation Date"]
                                  ).getFullYear() === 2025
                              ).length
                          : 0
                      )}
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
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(
                    Math.min(
                      ...filteredOpportunities
                        .filter(
                          (item) =>
                            item["Status"] === 14 &&
                            new Date(item["Creation Date"]).getFullYear() ===
                              2025
                        )
                        .map((opp) =>
                          opp["Allocated Gross Revenue"] > 0
                            ? opp["Allocated Gross Revenue"]
                            : opp["Gross Revenue"] || 0
                        )
                    )
                  )}{" "}
                  -
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(
                    Math.max(
                      ...filteredOpportunities
                        .filter(
                          (item) =>
                            item["Status"] === 14 &&
                            new Date(item["Creation Date"]).getFullYear() ===
                              2025
                        )
                        .map((opp) =>
                          opp["Allocated Gross Revenue"] > 0
                            ? opp["Allocated Gross Revenue"]
                            : opp["Gross Revenue"] || 0
                        )
                    )
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
                    {filteredOpportunities.length !== data.length
                      ? `${filteredOpportunities.length}%`
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
                    new Intl.NumberFormat("en-US", {
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
                    new Intl.NumberFormat("en-US", {
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
              <Slider
                value={periodRange}
                onChange={handlePeriodChange}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => {
                  if (!data || data.length === 0) return "";
                  const sortedData = [...data].sort(
                    (a, b) =>
                      new Date(a["Creation Date"]) -
                      new Date(b["Creation Date"])
                  );
                  const firstDate = new Date(sortedData[0]["Creation Date"]);
                  const lastDate = new Date(
                    sortedData[sortedData.length - 1]["Creation Date"]
                  );
                  const totalDuration =
                    lastDate.getTime() - firstDate.getTime();
                  const selectedDate = new Date(
                    firstDate.getTime() + (totalDuration * value) / 100
                  );
                  return selectedDate.toLocaleDateString();
                }}
              />
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  {dateRange[0] ? dateRange[0].toLocaleDateString() : "Start"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {dateRange[1] ? dateRange[1].toLocaleDateString() : "End"}
                </Typography>
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
                        label={new Intl.NumberFormat("en-US", {
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
                        label={new Intl.NumberFormat("en-US", {
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
