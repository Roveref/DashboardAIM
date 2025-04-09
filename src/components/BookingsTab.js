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
  Chip,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
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

  const theme = useTheme();

  // Custom colors for charts
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.main,
  ];

  useEffect(() => {
    if (!data || loading) return;

    // Reset filtered opportunities when data changes
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
    const monthly = getMonthlyYearlyTotals(
      data,
      "Creation Date",
      "Gross Revenue"
    );
    const uniqueYears = [...new Set(monthly.map((item) => item.year))].sort();
    setYears(uniqueYears);

    // Format data for YoY comparison
    const yoyData = formatYearOverYearData(monthly);
    setYoyBookings(yoyData);

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

    // Calculate new opportunities, wins, and losses for the selected date range
    updateDateAnalysis();
  }, [data, loading]);

  // Update analysis when date range changes
  const updateDateAnalysis = () => {
    if (!data || !dateRange[0] || !dateRange[1]) return;

    const startDate = dateRange[0];
    const endDate = dateRange[1];

    // Get new opportunities, wins, and losses within the date range
    const newOpps = getNewOpportunities(data, startDate, endDate);
    const wins = getNewWins(data, startDate, endDate);
    const losses = getNewLosses(data, startDate, endDate);

    setNewOpportunities(newOpps);
    setNewWins(wins);
    setNewLosses(losses);

    // Update filtered opportunities based on current tab
    if (analysisTab === 0) {
      setFilteredOpportunities(newOpps);
    } else if (analysisTab === 1) {
      setFilteredOpportunities(wins);
    } else if (analysisTab === 2) {
      setFilteredOpportunities(losses);
    }
  };

  const handleChartClick = (data) => {
    if (!data || !data.activePayload || data.activePayload.length === 0) return;

    const clickedItem = data.activePayload[0].payload;
    const clickedYear = data.activePayload[0].dataKey;

    // Only process if it's a year property (not month, monthName, etc)
    if (!isNaN(parseInt(clickedYear))) {
      // Get the opportunities for this month and year
      const opps = clickedItem[`${clickedYear}Opps`] || [];

      if (opps.length > 0) {
        setFilteredOpportunities(opps);
      }
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
      setFilteredOpportunities(newOpportunities);
    } else if (newValue === 1) {
      setFilteredOpportunities(newWins);
    } else if (newValue === 2) {
      setFilteredOpportunities(newLosses);
    } else {
      setFilteredOpportunities(data);
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
            // Skip non-year entries
            if (isNaN(parseInt(entry.dataKey))) return null;

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
                    {entry.dataKey}:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(entry.value)}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {payload[0].payload[`${entry.dataKey}Count`] || 0}{" "}
                  opportunities
                </Typography>
              </Box>
            );
          })}
        </Card>
      );
    }
    return null;
  };

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
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: "100%",
              borderRadius: 3,
              transition: "all 0.3s",
              "&:hover": {
                boxShadow: 6,
                transform: "translateY(-4px)",
              },
            }}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Total Bookings
              </Typography>
              <Typography
                variant="h3"
                color="primary.main"
                fontWeight={700}
                sx={{ mb: 1 }}
              >
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "EUR",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(totalBookings)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {data.length} booked opportunities
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: "100%",
              borderRadius: 3,
              transition: "all 0.3s",
              "&:hover": {
                boxShadow: 6,
                transform: "translateY(-4px)",
              },
            }}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Average Booking Size
              </Typography>
              <Typography
                variant="h3"
                color="secondary.main"
                fontWeight={700}
                sx={{ mb: 1 }}
              >
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "EUR",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(data.length > 0 ? totalBookings / data.length : 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Range:{" "}
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "EUR",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(
                  Math.min(...data.map((opp) => opp["Gross Revenue"] || 0))
                )}{" "}
                -
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "EUR",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(
                  Math.max(...data.map((opp) => opp["Gross Revenue"] || 0))
                )}
              </Typography>
            </CardContent>
          </Card>
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
              Monthly Bookings Year-over-Year
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Click on bars to see opportunities for that month and year
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart
                data={yoyBookings}
                margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                onClick={handleChartClick}
                barSize={30}
                barGap={2}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="monthName" axisLine={false} tickLine={false} />
                <YAxis
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
                {years.map((year, index) => (
                  <Bar
                    key={year}
                    dataKey={`${year}`}
                    name={`${year}`}
                    fill={COLORS[index % COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
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
            <Box sx={{ mb: 3 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <DatePicker
                      label="From Date"
                      value={dateRange[0]}
                      onChange={(date) => handleDateChange(0, date)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: "small",
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <DatePicker
                      label="To Date"
                      value={dateRange[1]}
                      onChange={(date) => handleDateChange(1, date)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: "small",
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Button
                      variant="contained"
                      onClick={updateDateAnalysis}
                      fullWidth
                    >
                      Analyze Period
                    </Button>
                  </Grid>
                </Grid>
              </LocalizationProvider>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Tabs
              value={analysisTab}
              onChange={handleAnalysisTabChange}
              aria-label="analysis tabs"
              variant="fullWidth"
              sx={{ mb: 2 }}
            >
              <Tab label={`New (${newOpportunities.length})`} />
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
                      New Opportunities in Period
                    </Typography>
                    <Box>
                      <Chip
                        label={`${newOpportunities.length} opportunities`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        label={new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(sumBy(newOpportunities, "Gross Revenue"))}
                        size="small"
                        color="primary"
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
                      New Wins in Period
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

              {analysisTab === 2 && (
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={600}>
                      New Losses in Period
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
      </Grid>
    </Fade>
  );
};

export default BookingsTab;
