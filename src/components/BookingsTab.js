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
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Stack,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import FilterListIcon from "@mui/icons-material/FilterList";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

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
  PieChart,
  Pie,
  Cell,
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

// Format date in French format
const formatDateFR = (date) => {
  if (!date) return "";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// Custom component for the Top Accounts Section
const TopAccountsSection = ({ data }) => {
  const theme = useTheme();
  const [sortConfig, setSortConfig] = useState({
    key: "bookingAmount",
    direction: "desc",
  });

  // State for the top accounts data
  const [topAccounts, setTopAccounts] = useState([]);
  const [totalBookingsAmount, setTotalBookingsAmount] = useState(0);
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.main,
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7300",
  ];

  // Revenue calculation function to match previous implementation
  const calculateRevenueWithSegmentLogic = (item) => {
    // Check if segment code is AUTO, CLR, or IEM
    const specialSegmentCodes = ["AUTO", "CLR", "IEM"];
    const isSpecialSegmentCode = specialSegmentCodes.includes(
      item["Sub Segment Code"]
    );

    // If special segment code, return full gross revenue
    if (isSpecialSegmentCode) {
      return item["Gross Revenue"] || 0;
    }

    // Check each service line (1, 2, and 3)
    const serviceLines = [
      {
        line: item["Service Line 1"],
        percentage: item["Service Offering 1 %"] || 0,
      },
      {
        line: item["Service Line 2"],
        percentage: item["Service Offering 2 %"] || 0,
      },
      {
        line: item["Service Line 3"],
        percentage: item["Service Offering 3 %"] || 0,
      },
    ];

    // Calculate total allocated revenue for Operations
    const operationsAllocation = serviceLines.reduce((total, service) => {
      if (service.line === "Operations") {
        return (
          total + (item["Gross Revenue"] || 0) * (service.percentage / 100)
        );
      }
      return total;
    }, 0);

    // If any Operations allocation is found, return that
    if (operationsAllocation > 0) {
      return operationsAllocation;
    }

    // If no specific Operations allocation, return full gross revenue
    return item["Gross Revenue"] || 0;
  };

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Filter to only include booked opportunities (Status 14)
    const bookedOpportunities = data.filter((item) => item.Status === 14);

    // Group by account
    const accountMap = {};

    bookedOpportunities.forEach((opportunity) => {
      const account = opportunity.Account || "Unknown";
      if (!accountMap[account]) {
        accountMap[account] = {
          account: account,
          bookingAmount: 0,
          calculatedAmount: 0,
          opportunityCount: 0,
          avgBookingSize: 0,
          opportunities: [],
          serviceLines: new Set(),
          // Track dates for latest booking
          latestBookingDate: null,
        };
      }

      // Add to total amount
      const bookingAmount = opportunity["Gross Revenue"] || 0;
      const calculatedAmount = calculateRevenueWithSegmentLogic(opportunity);

      accountMap[account].bookingAmount += bookingAmount;
      accountMap[account].calculatedAmount += calculatedAmount;
      accountMap[account].opportunityCount += 1;
      accountMap[account].opportunities.push(opportunity);

      // Track service lines
      if (opportunity["Service Line 1"]) {
        accountMap[account].serviceLines.add(opportunity["Service Line 1"]);
      }

      // Track latest booking date
      const bookingDate = new Date(
        opportunity["Last Status Change Date"] ||
          opportunity["Winning Date"] ||
          opportunity["Creation Date"]
      );
      if (
        !accountMap[account].latestBookingDate ||
        bookingDate > accountMap[account].latestBookingDate
      ) {
        accountMap[account].latestBookingDate = bookingDate;
      }
    });

    // Convert to array, calculate averages and convert sets to arrays
    const accountsArray = Object.values(accountMap).map((account) => ({
      ...account,
      avgBookingSize:
        account.opportunityCount > 0
          ? account.bookingAmount / account.opportunityCount
          : 0,
      serviceLines: Array.from(account.serviceLines),
      percentOfTotal: 0, // Will be calculated after sorting
    }));

    // Sort by booking amount by default
    accountsArray.sort((a, b) => b.bookingAmount - a.bookingAmount);

    // Calculate total bookings amount for percentage calculations
    const total = accountsArray.reduce(
      (sum, account) => sum + account.bookingAmount,
      0
    );
    setTotalBookingsAmount(total);

    // Add percentage of total
    accountsArray.forEach((account) => {
      account.percentOfTotal = (account.bookingAmount / total) * 100;
    });

    // Take top 10 accounts
    const top10 = accountsArray.slice(0, 10);
    setTopAccounts(top10);
  }, [data]);

  // Handle sort
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    // Sort the data
    const sortedData = [...topAccounts].sort((a, b) => {
      if (a[key] < b[key]) {
        return direction === "asc" ? -1 : 1;
      }
      if (a[key] > b[key]) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    setTopAccounts(sortedData);
  };

  // Prepare data for pie chart
  const pieChartData = topAccounts.map((account) => ({
    name: account.account,
    value: account.bookingAmount,
    calculatedValue: account.calculatedAmount,
    count: account.opportunityCount,
  }));

  // Custom tooltip for pie chart
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card
          sx={{
            p: 2,
            backgroundColor: "white",
            border: "1px solid",
            borderColor: alpha(theme.palette.primary.main, 0.1),
            boxShadow: theme.shadows[3],
            borderRadius: 2,
            maxWidth: 300,
          }}
        >
          <Typography variant="subtitle2" fontWeight={600}>
            {data.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Booking Amount:{" "}
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(data.value)}
          </Typography>
          <Typography variant="body2" color="primary.main">
            I&O Amount:{" "}
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(data.calculatedValue)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Opportunities: {data.count}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            % of Total: {((data.value / totalBookingsAmount) * 100).toFixed(1)}%
          </Typography>
        </Card>
      );
    }
    return null;
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        mb: 3,
      }}
    >
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Top 10 Accounts by Booking Amount
      </Typography>

      <Grid container spacing={3}>
        {/* Pie Chart */}
        <Grid item xs={12} md={5}>
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={150}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => {
                    if (percent < 0.05) return null; // Don't show labels for tiny slices
                    return `${name}: ${(percent * 100).toFixed(0)}%`;
                  }}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Grid>

        {/* Table */}
        <Grid item xs={12} md={7}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.key === "account"}
                      direction={
                        sortConfig.key === "account"
                          ? sortConfig.direction
                          : "asc"
                      }
                      onClick={() => handleSort("account")}
                    >
                      Account
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortConfig.key === "bookingAmount"}
                      direction={
                        sortConfig.key === "bookingAmount"
                          ? sortConfig.direction
                          : "desc"
                      }
                      onClick={() => handleSort("bookingAmount")}
                    >
                      Booking Amount
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortConfig.key === "opportunityCount"}
                      direction={
                        sortConfig.key === "opportunityCount"
                          ? sortConfig.direction
                          : "desc"
                      }
                      onClick={() => handleSort("opportunityCount")}
                    >
                      Opps
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortConfig.key === "avgBookingSize"}
                      direction={
                        sortConfig.key === "avgBookingSize"
                          ? sortConfig.direction
                          : "desc"
                      }
                      onClick={() => handleSort("avgBookingSize")}
                    >
                      Avg Size
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortConfig.key === "percentOfTotal"}
                      direction={
                        sortConfig.key === "percentOfTotal"
                          ? sortConfig.direction
                          : "desc"
                      }
                      onClick={() => handleSort("percentOfTotal")}
                    >
                      % of Total
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topAccounts.map((account) => (
                  <TableRow key={account.account} hover>
                    <TableCell component="th" scope="row">
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          flexDirection: "column",
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {account.account}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Latest: {formatDateFR(account.latestBookingDate)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={500}>
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(account.bookingAmount)}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="primary.main"
                        display="block"
                      >
                        I&O:{" "}
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(account.calculatedAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={account.opportunityCount}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(account.avgBookingSize)}
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${account.percentOfTotal.toFixed(1)}%`}
                        size="small"
                        color="secondary"
                        sx={{
                          backgroundColor: alpha(
                            theme.palette.secondary.main,
                            0.1
                          ),
                          color: theme.palette.secondary.main,
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: alpha(theme.palette.info.main, 0.05),
              borderRadius: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Total booked amount:{" "}
              {new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(totalBookingsAmount)}
            </Typography>

            <Typography variant="body2" fontWeight={500}>
              Top 10 accounts:{" "}
              {new Intl.NumberFormat("fr-FR", {
                style: "percent",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(
                topAccounts.reduce(
                  (sum, account) => sum + account.percentOfTotal,
                  0
                ) / 100
              )}{" "}
              of total bookings
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

// Custom component for the Period Filter
const PeriodFilter = ({ dateRange, setDateRange, updateDateAnalysis }) => {
  const theme = useTheme();

  // Handle date change
  const handleDateChange = (index, date) => {
    const newDateRange = [...dateRange];
    newDateRange[index] = date;
    setDateRange(newDateRange);
  };

  // Reset date filter to the last 30 days
  const handleResetDateFilter = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    setDateRange([startDate, endDate]);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        backgroundColor: alpha(theme.palette.primary.main, 0.05),
        borderRadius: 2,
        p: 2,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        mb: 2,
      }}
    >
      <CalendarTodayIcon color="primary" />

      <Typography variant="body2" fontWeight={500} sx={{ mr: 1 }}>
        Period:
      </Typography>

      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DatePicker
          label="Start Date"
          value={dateRange[0]}
          onChange={(date) => handleDateChange(0, date)}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              sx={{ width: 150 }}
              variant="outlined"
            />
          )}
          inputFormat="dd/MM/yyyy"
        />

        <Typography variant="body2" sx={{ mx: 1 }}>
          to
        </Typography>

        <DatePicker
          label="End Date"
          value={dateRange[1]}
          onChange={(date) => handleDateChange(1, date)}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              sx={{ width: 150 }}
              variant="outlined"
            />
          )}
          inputFormat="dd/MM/yyyy"
        />
      </LocalizationProvider>

      <Button
        variant="outlined"
        size="small"
        startIcon={<FilterListIcon />}
        onClick={updateDateAnalysis}
        color="primary"
        sx={{ ml: 1 }}
      >
        Apply Filter
      </Button>

      <IconButton
        size="small"
        onClick={handleResetDateFilter}
        color="primary"
        title="Reset to last 30 days"
      >
        <RestartAltIcon />
      </IconButton>
    </Box>
  );
};

const BookingsTab = ({ data, loading, onSelection, selectedOpportunities }) => {
  const [yoyBookings, setYoyBookings] = useState([]);
  const [bookingsByServiceLine, setBookingsByServiceLine] = useState([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [filteredOpportunities, setFilteredOpportunities] = useState([]);
  const [dateRange, setDateRange] = useState([
    // Default to last 30 days
    new Date(new Date().setDate(new Date().getDate() - 30)),
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
    // Only consider opportunities in 2025
    const opps = (clickedItem[`${year}Opps`] || []).filter(
      (opp) =>
        opp["Status"] === 14 && // Booked opportunities
        new Date(opp["Last Status Change Date"]).getFullYear() === 2025
    );

    if (opps.length > 0) {
      setFilteredOpportunities(opps);
    }
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

  // Revenue calculation function to match previous implementation
  const calculateRevenueWithSegmentLogic = (item) => {
    // Check if segment code is AUTO, CLR, or IEM
    const specialSegmentCodes = ["AUTO", "CLR", "IEM"];
    const isSpecialSegmentCode = specialSegmentCodes.includes(
      item["Sub Segment Code"]
    );

    // If special segment code, return full gross revenue
    if (isSpecialSegmentCode) {
      return item["Gross Revenue"] || 0;
    }

    // Check each service line (1, 2, and 3)
    const serviceLines = [
      {
        line: item["Service Line 1"],
        percentage: item["Service Offering 1 %"] || 0,
      },
      {
        line: item["Service Line 2"],
        percentage: item["Service Offering 2 %"] || 0,
      },
      {
        line: item["Service Line 3"],
        percentage: item["Service Offering 3 %"] || 0,
      },
    ];

    // Calculate total allocated revenue for Operations
    const operationsAllocation = serviceLines.reduce((total, service) => {
      if (service.line === "Operations") {
        return (
          total + (item["Gross Revenue"] || 0) * (service.percentage / 100)
        );
      }
      return total;
    }, 0);

    // If any Operations allocation is found, return that
    if (operationsAllocation > 0) {
      return operationsAllocation;
    }

    // If no specific Operations allocation, return full gross revenue
    return item["Gross Revenue"] || 0;
  };

  // Bookings 2025 calculation with new revenue logic
  const bookings2025 = data.filter(
    (item) =>
      item["Status"] === 14 &&
      item["Last Status Change Date"] &&
      new Date(item["Last Status Change Date"]).getFullYear() === 2025
  );

  const losses2025 = data.filter(
    (item) =>
      item["Status"] === 15 &&
      item["Last Status Change Date"] &&
      new Date(item["Last Status Change Date"]).getFullYear() === 2025
  );

  // Calculate revenues with new logic
  const bookings2025Revenue = bookings2025.reduce(
    (sum, item) => sum + calculateRevenueWithSegmentLogic(item),
    0
  );

  const losses2025Revenue = losses2025.reduce(
    (sum, item) => sum + (item["Gross Revenue"] || 0),
    0
  );

  // Calculate average booking size
  const averageBookingSize2025 =
    bookings2025.length > 0 ? bookings2025Revenue / bookings2025.length : 0;

  return (
    <Fade in={!loading} timeout={500}>
      <Box sx={{ width: "100%" }}>
        {/* Period Filter at the top - NEW PLACEMENT */}
        <Grid item xs={12}>
          <PeriodFilter
            dateRange={dateRange}
            setDateRange={setDateRange}
            updateDateAnalysis={updateDateAnalysis}
          />
        </Grid>

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
                    {selectedOpportunities.length > 0
                      ? `${Math.round(
                          (bookings2025.length /
                            data.filter(
                              (item) =>
                                item["Status"] === 14 &&
                                new Date(
                                  item["Last Status Change Date"]
                                ).getFullYear() === 2025
                            ).length) *
                            100
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
                    {selectedOpportunities.length > 0
                      ? `${Math.round(
                          (losses2025.length /
                            data.filter(
                              (item) =>
                                item["Status"] === 15 &&
                                new Date(
                                  item["Last Status Change Date"]
                                ).getFullYear() === 2025
                            ).length) *
                            100
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
                          ...bookings2025.map(
                            (opp) => opp["Gross Revenue"] || 0
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
                          ...bookings2025.map(
                            (opp) => opp["Gross Revenue"] || 0
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
                    {selectedOpportunities.length > 0
                      ? `${Math.round(
                          (bookings2025.length /
                            data.filter(
                              (item) =>
                                item["Status"] === 14 &&
                                new Date(
                                  item["Last Status Change Date"]
                                ).getFullYear() === 2025
                            ).length) *
                            100
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
              mb: 3,
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

        {/* NEW: Top 10 Accounts Section */}
        <TopAccountsSection data={data} />

        {/* Period Analysis Results */}
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
              Period Analysis Results
            </Typography>

            <Divider sx={{ mb: 3 }} />

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
        <Grid item xs={12} sx={{ mt: 3 }}>
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
