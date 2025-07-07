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
  LinearProgress,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
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
  calculateRevenueWithSegmentLogic,
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

const TopAccountsSection = ({ data, dateRange, showNetRevenue = false }) => {
  const theme = useTheme();
  const [sortConfig, setSortConfig] = useState({
    key: "calculatedAmount", // Default sort by I&O amount
    direction: "desc",
  });

  // State for the top accounts data
  const [topAccounts, setTopAccounts] = useState([]);
  const [totalBookingsAmount, setTotalBookingsAmount] = useState(0);
  const [totalIOAmount, setTotalIOAmount] = useState(0);
  const [allAccountsBookingsTotal, setAllAccountsBookingsTotal] = useState(0);
  const [allAccountsIOTotal, setAllAccountsIOTotal] = useState(0);
  const [specialSegmentBookingsTotal, setSpecialSegmentBookingsTotal] =
    useState(0);
  const [specialSegmentIOTotal, setSpecialSegmentIOTotal] = useState(0);

  // Target amount in euros for I&O
  const IO_TARGET = 1000000; // 1 million euros

  // Revenue calculation function to match previous implementation
  useEffect(() => {
    if (!data || data.length === 0) return;

    // Filter to only include booked opportunities (Status 14)
    let bookedOpportunities = data.filter((item) => item.Status === 14);

    // Apply date range filter if available
    if (dateRange && dateRange[0] && dateRange[1]) {
      bookedOpportunities = bookedOpportunities.filter((item) => {
        const statusDate = new Date(item["Booking/Lost Date"]);
        return statusDate >= dateRange[0] && statusDate <= dateRange[1];
      });
    }

    // Calculate total bookings and I&O amounts for ALL filtered accounts
    const totalAllBookings = bookedOpportunities.reduce(
      (sum, opp) =>
        sum +
        (showNetRevenue ? opp["Net Revenue"] || 0 : opp["Gross Revenue"] || 0),
      0
    );

    const totalAllIO = bookedOpportunities.reduce(
      (sum, opp) => sum + calculateRevenueWithSegmentLogic(opp, showNetRevenue),
      0
    );

    // Calculate special segment totals (CLR, IEM, AUTO)
    const specialSegmentBookings = bookedOpportunities
      .filter((opp) => ["AUTO", "CLR", "IEM"].includes(opp["Sub Segment Code"]))
      .reduce(
        (sum, opp) =>
          sum +
          (showNetRevenue
            ? opp["Net Revenue"] || 0
            : opp["Gross Revenue"] || 0),
        0
      );

    const specialSegmentIO = bookedOpportunities
      .filter((opp) => ["AUTO", "CLR", "IEM"].includes(opp["Sub Segment Code"]))
      .reduce(
        (sum, opp) =>
          sum + calculateRevenueWithSegmentLogic(opp, showNetRevenue),
        0
      );

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
          // Track if this is a special segment account
          hasSpecialSegment: false,
        };
      }

      // Add to total amount
      const bookingAmount = showNetRevenue
        ? opportunity["Net Revenue"] || 0
        : opportunity["Gross Revenue"] || 0;
      const calculatedAmount = calculateRevenueWithSegmentLogic(
        opportunity,
        showNetRevenue
      );

      accountMap[account].bookingAmount += bookingAmount;
      accountMap[account].calculatedAmount += calculatedAmount;
      accountMap[account].opportunityCount += 1;
      accountMap[account].opportunities.push(opportunity);

      // Check for special segment
      if (["AUTO", "CLR", "IEM"].includes(opportunity["Sub Segment Code"])) {
        accountMap[account].hasSpecialSegment = true;
      }

      // Track service lines
      if (opportunity["Service Line 1"]) {
        accountMap[account].serviceLines.add(opportunity["Service Line 1"]);
      }

      // Track latest booking date
      const bookingDate = new Date(
        opportunity["Booking/Lost Date"] ||
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
      ioProgressPercentage: Math.min(
        (account.calculatedAmount / IO_TARGET) * 100,
        100
      ), // Calculate progress toward 1M€ target
    }));

    // Sort by I&O amount (calculatedAmount) by default - largest to smallest
    accountsArray.sort((a, b) => b.calculatedAmount - a.calculatedAmount);

    // Take top 10 accounts (after sorting by I&O amount)
    const top10 = accountsArray.slice(0, 10);

    // Calculate totals for only the top 10 accounts
    const top10BookingsTotal = top10.reduce(
      (sum, account) => sum + account.bookingAmount,
      0
    );

    const top10IOTotal = top10.reduce(
      (sum, account) => sum + account.calculatedAmount,
      0
    );

    setTotalBookingsAmount(top10BookingsTotal);
    setTotalIOAmount(top10IOTotal);

    // Store full period totals for all accounts
    setAllAccountsBookingsTotal(totalAllBookings);
    setAllAccountsIOTotal(totalAllIO);

    // Store special segment totals
    setSpecialSegmentBookingsTotal(specialSegmentBookings);
    setSpecialSegmentIOTotal(specialSegmentIO);

    // Add percentage of total (using all accounts total)
    top10.forEach((account) => {
      account.percentOfTotal = (account.bookingAmount / totalAllBookings) * 100;
    });

    setTopAccounts(top10);
  }, [data, dateRange]);

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

  // Get progress bar color based on percentage
  const getProgressColor = (percentage) => {
    if (percentage >= 100) return theme.palette.success.main;
    if (percentage >= 70) return theme.palette.success.light;
    if (percentage >= 30) return theme.palette.warning.main;
    return theme.palette.error.main;
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
        Top 10 Accounts
      </Typography>

      {/* Date range indicator */}
      {dateRange && dateRange[0] && dateRange[1] && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          For period: {formatDateFR(dateRange[0])} to{" "}
          {formatDateFR(dateRange[1])}
        </Typography>
      )}

      <Grid container spacing={3}>
        {/* Table with Progress Bars - now full width */}
        <Grid item xs={12}>
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
                      active={sortConfig.key === "calculatedAmount"}
                      direction={
                        sortConfig.key === "calculatedAmount"
                          ? sortConfig.direction
                          : "desc"
                      }
                      onClick={() => handleSort("calculatedAmount")}
                    >
                      I&O Amount
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center" colSpan={2}>
                    <Typography variant="body2" fontWeight={600}>
                      €1M I&O Target
                    </Typography>
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
                {topAccounts.map((account) => {
                  // Check if account has any opportunities with special segment codes
                  const hasSpecialSegment = account.opportunities.some((opp) =>
                    ["AUTO", "CLR", "IEM"].includes(opp["Sub Segment Code"])
                  );

                  return (
                    <TableRow
                      key={account.account}
                      hover
                      sx={
                        hasSpecialSegment
                          ? {
                              backgroundColor: alpha(
                                theme.palette.info.light,
                                0.15
                              ),
                              "&:hover": {
                                backgroundColor: alpha(
                                  theme.palette.info.light,
                                  0.25
                                ),
                              },
                            }
                          : {}
                      }
                    >
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
                            {hasSpecialSegment && (
                              <Chip
                                label="AUTO/CLR/IEM"
                                size="small"
                                color="info"
                                sx={{ ml: 1, height: 20, fontSize: "0.65rem" }}
                              />
                            )}
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
                          color="text.secondary"
                          display="block"
                        >
                          Avg:{" "}
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(account.avgBookingSize)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color="primary.main"
                        >
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(account.calculatedAmount)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          {(
                            (account.calculatedAmount / account.bookingAmount) *
                            100
                          ).toFixed(1)}
                          % of bookings
                        </Typography>
                      </TableCell>
                      <TableCell align="right" width="15%">
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ mb: 0.5 }}
                        >
                          {account.ioProgressPercentage.toFixed(1)}%
                        </Typography>
                      </TableCell>
                      <TableCell width="20%">
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Box sx={{ width: "100%", mr: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={account.ioProgressPercentage}
                              sx={{
                                height: 10,
                                borderRadius: 5,
                                backgroundColor: alpha(
                                  theme.palette.grey[300],
                                  0.5
                                ),
                                "& .MuiLinearProgress-bar": {
                                  borderRadius: 5,
                                  backgroundColor: getProgressColor(
                                    account.ioProgressPercentage
                                  ),
                                },
                              }}
                            />
                          </Box>
                        </Box>
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
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Box
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.background.paper, 0.7),
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              boxShadow: `0 4px 20px 0 ${alpha(theme.palette.grey[500], 0.08)}`,
            }}
          >
            <Grid container spacing={2}>
              {/* Total Bookings Card */}
              <Grid item xs={12} md={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 0,
                    height: "100%",
                    borderRadius: 2,
                    overflow: "hidden",
                    boxShadow: `0 4px 20px 0 ${alpha(
                      theme.palette.grey[500],
                      0.1
                    )}`,
                    border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                  }}
                >
                  <Box
                    sx={{
                      p: 1.5,
                      backgroundColor: alpha(theme.palette.grey[100], 0.7),
                      borderBottom: `1px solid ${alpha(
                        theme.palette.divider,
                        0.1
                      )}`,
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      color="text.primary"
                    >
                      Bookings
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: alpha(
                        theme.palette.background.paper,
                        0.9
                      ),
                    }}
                  >
                    <Grid container alignItems="center">
                      {/* Total Value */}
                      <Grid item xs={5}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Total
                        </Typography>
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          color="text.primary"
                        >
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(allAccountsBookingsTotal)}
                        </Typography>
                      </Grid>

                      {/* Arrow & Percentage */}
                      <Grid item xs={2} sx={{ textAlign: "center" }}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography
                            variant="caption"
                            fontWeight={600}
                            color="text.secondary"
                          >
                            {(
                              (totalBookingsAmount / allAccountsBookingsTotal) *
                              100
                            ).toFixed(1)}
                            %
                          </Typography>
                          <Box
                            component="span"
                            sx={{
                              color: theme.palette.text.secondary,
                              fontSize: "1.5rem",
                              lineHeight: 1,
                            }}
                          >
                            →
                          </Box>
                        </Box>
                      </Grid>

                      {/* Top 10 Value */}
                      <Grid item xs={5}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Top 10
                        </Typography>
                        <Typography
                          variant="h6"
                          fontWeight={700}
                          color="text.primary"
                        >
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(totalBookingsAmount)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
              </Grid>

              {/* I&O Card */}
              <Grid item xs={12} md={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 0,
                    height: "100%",
                    borderRadius: 2,
                    overflow: "hidden",
                    boxShadow: `0 4px 20px 0 ${alpha(
                      theme.palette.grey[500],
                      0.1
                    )}`,
                    border: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.2
                    )}`,
                  }}
                >
                  <Box
                    sx={{
                      p: 1.5,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      borderBottom: `1px solid ${alpha(
                        theme.palette.primary.main,
                        0.2
                      )}`,
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      color="primary.dark"
                    >
                      I&O
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: alpha(theme.palette.primary.light, 0.04),
                    }}
                  >
                    <Grid container alignItems="center">
                      {/* Total Value */}
                      <Grid item xs={5}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Total
                        </Typography>
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          color="primary.main"
                        >
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(allAccountsIOTotal)}
                        </Typography>
                      </Grid>

                      {/* Arrow & Percentage */}
                      <Grid item xs={2} sx={{ textAlign: "center" }}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography
                            variant="caption"
                            fontWeight={600}
                            color="primary.main"
                          >
                            {(
                              (totalIOAmount / allAccountsIOTotal) *
                              100
                            ).toFixed(1)}
                            %
                          </Typography>
                          <Box
                            component="span"
                            sx={{
                              color: theme.palette.primary.main,
                              fontSize: "1.5rem",
                              lineHeight: 1,
                            }}
                          >
                            →
                          </Box>
                        </Box>
                      </Grid>

                      {/* Top 10 Value */}
                      <Grid item xs={5}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Top 10
                        </Typography>
                        <Typography
                          variant="h6"
                          fontWeight={700}
                          color="primary.main"
                        >
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(totalIOAmount)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
              </Grid>

              {/* AUTO/CLR/IEM Card */}
              <Grid item xs={12} md={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 0,
                    height: "100%",
                    borderRadius: 2,
                    overflow: "hidden",
                    boxShadow: `0 4px 20px 0 ${alpha(
                      theme.palette.info.main,
                      0.1
                    )}`,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  }}
                >
                  <Box
                    sx={{
                      p: 1.5,
                      backgroundColor: alpha(theme.palette.info.main, 0.1),
                      borderBottom: `1px solid ${alpha(
                        theme.palette.info.main,
                        0.2
                      )}`,
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      color="info.dark"
                    >
                      AUTO/CLR/IEM
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: alpha(theme.palette.info.light, 0.04),
                    }}
                  >
                    <Grid container alignItems="center">
                      {/* Total Value */}
                      <Grid item xs={5}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Top 10 Total
                        </Typography>
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          color="text.primary"
                        >
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(totalBookingsAmount)}
                        </Typography>
                      </Grid>

                      {/* Arrow & Percentage */}
                      <Grid item xs={2} sx={{ textAlign: "center" }}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography
                            variant="caption"
                            fontWeight={600}
                            color="info.main"
                          >
                            {totalBookingsAmount > 0
                              ? (
                                  (specialSegmentBookingsTotal /
                                    totalBookingsAmount) *
                                  100
                                ).toFixed(1)
                              : "0.0"}
                            %
                          </Typography>
                          <Box
                            component="span"
                            sx={{
                              color: theme.palette.info.main,
                              fontSize: "1.5rem",
                              lineHeight: 1,
                            }}
                          >
                            →
                          </Box>
                        </Box>
                      </Grid>

                      {/* Special Segment Value */}
                      <Grid item xs={5}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          In Segment
                        </Typography>
                        <Typography
                          variant="h6"
                          fontWeight={700}
                          color="info.main"
                        >
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(specialSegmentBookingsTotal)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
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

  // Reset date filter to the 1st of the current year to today
  const handleResetDateFilter = () => {
    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear(), 0, 1); // January 1st of current year

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
        Période:
      </Typography>

      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DatePicker
          label="Date de début"
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
          à
        </Typography>

        <DatePicker
          label="Date de fin"
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
        {" "}
      </Button>

      <IconButton
        size="small"
        onClick={handleResetDateFilter}
        color="primary"
        title="Réinitialiser au 1er janvier de l'année en cours"
      >
        <RestartAltIcon />
      </IconButton>
    </Box>
  );
};

const BookingsTab = ({
  data,
  loading,
  onSelection,
  selectedOpportunities,
  showNetRevenue = false,
}) => {
  const [yoyBookings, setYoyBookings] = useState([]);
  const [bookingsByServiceLine, setBookingsByServiceLine] = useState([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [filteredOpportunities, setFilteredOpportunities] = useState([]);

  // Set default date range to January 1st of current year to today
  const currentYear = new Date().getFullYear();
  const [dateRange, setDateRange] = useState([
    new Date(currentYear, 0, 1), // January 1st of current year
    new Date(), // Today
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

  // Update date analysis method to use Booking/Lost Date
  const updateDateAnalysis = () => {
    if (!data) return;

    const startDate = dateRange[0] || new Date(currentYear, 0, 1);
    const endDate = dateRange[1] || new Date();

    // Get new bookings and losses within the date range
    const wins = data.filter((item) => {
      if (item["Status"] !== 14) return false;
      if (!item["Booking/Lost Date"]) return false;
      const statusDate = new Date(item["Booking/Lost Date"]);
      return statusDate >= startDate && statusDate <= endDate;
    });

    const losses = data.filter((item) => {
      if (item["Status"] !== 15) return false;
      if (!item["Booking/Lost Date"]) return false;
      const statusDate = new Date(item["Booking/Lost Date"]);
      return statusDate >= startDate && statusDate <= endDate;
    });

    setNewWins(wins);
    setNewLosses(losses);

    // Update filtered opportunities based on current tab
    if (analysisTab === 0) {
      setFilteredOpportunities(wins);
    } else {
      setFilteredOpportunities(losses);
    }
  };

  // Calculate cumulative data for years
  const calculateCumulativeTotals = (bookingsData) => {
    const result = bookingsData.map((monthData, index) => {
      const cumulativeMonth = { ...monthData };
  
      // Calculate cumulative totals for each year
      years.forEach((year) => {
        // Get monthly opportunities for this year
        const monthlyOpps = monthData[`${year}Opps`] || [];
        
        // Calculate I&O revenue for this month
        const monthlyIORevenue = monthlyOpps.reduce(
          (sum, opp) => sum + calculateRevenueWithSegmentLogic(opp, showNetRevenue),
          0
        );
        
        // Calculate total revenue for this month
        const monthlyTotalRevenue = monthData[year] || 0;
        
        // Calculate complement (total - I&O)
        const monthlyComplement = Math.max(0, monthlyTotalRevenue - monthlyIORevenue);
  
        // Add monthly breakdown
        cumulativeMonth[`${year}_io`] = monthlyIORevenue;
        cumulativeMonth[`${year}_complement`] = monthlyComplement;
  
        // Sum all previous months' values for this year (cumulative)
        const cumulativeValue = bookingsData
          .slice(0, index + 1)
          .reduce((sum, prevMonth) => {
            return sum + (prevMonth[year] || 0);
          }, 0);
  
        // Add cumulative value for this year
        cumulativeMonth[`${year}_cumulative`] = cumulativeValue;
  
        // Create cumulative opportunities list for this year
        cumulativeMonth[`${year}Opps_cumulative`] = bookingsData
          .slice(0, index + 1)
          .flatMap((prevMonth) => prevMonth[`${year}Opps`] || []);
      });
  
      return cumulativeMonth;
    });
  
    // Calculate cumulative I&O data for each year
    years.forEach((year) => {
      let cumulativeIO = 0;
      
      result.forEach((monthData, index) => {
        // Get all opportunities up to this month for this year
        const cumulativeOpps = bookingsData
          .slice(0, index + 1)
          .flatMap((prevMonth) => prevMonth[`${year}Opps`] || []);
        
        // Calculate cumulative I&O revenue
        cumulativeIO = cumulativeOpps.reduce(
          (sum, opp) => sum + calculateRevenueWithSegmentLogic(opp, showNetRevenue),
          0
        );
        
        // Add cumulative I&O to the month data
        monthData[`${year}_io_cumulative`] = cumulativeIO;
      });
    });
  
    // FONCTION POUR CALCULER LA COURBE D'OBJECTIF I&O - DÉPLACÉE ICI
    const calculateIOTargetCurve = (cumulativeData, years) => {
      const TARGET_IO_ANNUAL = 55000000; // 55M€
      
      // Trouve les données 2024 pour la référence
      const data2024 = cumulativeData.map(month => month['2024_cumulative'] || 0);
      const max2024 = Math.max(...data2024.filter(val => val > 0));
      
      // Si pas de données 2024, utilise une progression linéaire
      if (max2024 === 0) {
        return cumulativeData.map((month, index) => {
          const progressRatio = (index + 1) / 12; // Progression linéaire sur 12 mois
          return TARGET_IO_ANNUAL * progressRatio;
        });
      }
      
      // Calcule la courbe homothétique basée sur 2024
      return cumulativeData.map(month => {
        const ref2024 = month['2024_cumulative'] || 0;
        if (ref2024 === 0) return 0;
        
        // Ratio homothétique : (valeur 2024 / max 2024) * objectif 55M
        return (ref2024 / max2024) * TARGET_IO_ANNUAL;
      });
    };
  
    // AJOUTER LA COURBE D'OBJECTIF I&O AUX DONNÉES
    const ioTargetCurve = calculateIOTargetCurve(result, years);
    
    result.forEach((month, index) => {
      month.ioTarget = ioTargetCurve[index];
    });
  
    return result;
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
        new Date(opp["Booking/Lost Date"]).getFullYear() === 2025
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
// Custom tooltip complet pour le graphique
// Custom tooltip avec affichage en colonnes 2024 | 2025
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    // Group entries by year
    const entriesByYear = {};

    // Trouvez l'objectif I&O dans le payload
    const ioTargetEntry = payload.find(entry => entry.dataKey === 'ioTarget');

    // First pass: organize data by year
    payload.forEach((entry) => {
      const dataKey = String(entry.dataKey || "");

      // Skip the ioTarget entry as we handle it separately
      if (dataKey === 'ioTarget') return;

      // Parse year and type (I&O, complement, or cumulative)
      const isCumulative = dataKey.includes("_cumulative");
      const isIO = dataKey.includes("_io");
      const isComplement = dataKey.includes("_complement");
      
      // Extract year from dataKey
      let year;
      if (isCumulative) {
        year = dataKey.replace("_cumulative", "");
      } else if (isIO) {
        year = dataKey.replace("_io", "");
      } else if (isComplement) {
        year = dataKey.replace("_complement", "");
      } else {
        year = dataKey;
      }

      // Skip entries that don't look like valid year data
      if (!/^\d+$/.test(year)) return;

      // Initialize year entry if not exists
      if (!entriesByYear[year]) {
        entriesByYear[year] = {
          year,
          ioRevenue: 0,
          complementRevenue: 0,
          cumulative: null,
          color: entry.color,
          oppCount: 0,
          oppCountCumulative: 0,
          // Nouveaux champs pour le split cumulative
          cumulativeIO: 0,
          cumulativeComplement: 0,
        };
      }

      // Set value based on type
      if (isCumulative) {
        entriesByYear[year].cumulative = entry.value || 0;
        entriesByYear[year].cumulativeColor = entry.color;
      } else if (isIO) {
        entriesByYear[year].ioRevenue = entry.value || 0;
        entriesByYear[year].color = entry.color;
      } else if (isComplement) {
        entriesByYear[year].complementRevenue = entry.value || 0;
      }
    });

    // Second pass: add opportunities count, calculate totals, and cumulative I&O split
    Object.keys(entriesByYear).forEach((year) => {
      const yearEntry = entriesByYear[year];
      
      // Get monthly opportunity list
      const oppList = payload[0].payload[`${year}Opps`] || [];
      yearEntry.oppCount = oppList.length || 0;

      // Get cumulative opportunity list
      const cumulativeOppList = payload[0].payload[`${year}Opps_cumulative`] || [];
      yearEntry.oppCountCumulative = cumulativeOppList.length || 0;

      // Calculate cumulative I&O and complement split
      if (cumulativeOppList.length > 0) {
        // Calculate cumulative I&O from all opportunities up to this month
        yearEntry.cumulativeIO = cumulativeOppList.reduce(
          (sum, opp) => sum + calculateRevenueWithSegmentLogic(opp, showNetRevenue),
          0
        );
        
        // Calculate cumulative complement (total - I&O)
        yearEntry.cumulativeComplement = Math.max(0, yearEntry.cumulative - yearEntry.cumulativeIO);
      }
    });

    // Get sorted years and separate 2024/2025 data
    const data2024 = entriesByYear['2024'] || null;
    const data2025 = entriesByYear['2025'] || null;

    return (
      <Card
        sx={{
          p: 1,
          backgroundColor: "white",
          border: "1px solid",
          borderColor: alpha(theme.palette.primary.main, 0.1),
          boxShadow: theme.shadows[3],
          borderRadius: 1,
          minWidth: 380,
          maxWidth: 380,
          fontFamily: 'Calibri, sans-serif',
        }}
      >
        <Typography variant="caption" fontWeight={600} mb={1} textAlign="center" sx={{ display: 'block', fontSize: '0.8rem', fontFamily: 'Calibri, sans-serif' }}>
          {label}
        </Typography>

        {/* OBJECTIF I&O EN PREMIER */}
        {ioTargetEntry && (
          <Box sx={{ 
            mb: 1, 
            p: 0.5, 
            backgroundColor: alpha(theme.palette.warning.main, 0.1), 
            borderRadius: 0.5,
            textAlign: 'center'
          }}>
            <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ fontSize: '0.75rem', fontFamily: 'Calibri, sans-serif' }}>
              Objectif I&O: {new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(ioTargetEntry.value)}
            </Typography>
          </Box>
        )}

        {/* EN-TÊTES DES COLONNES */}
        <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
          <Grid item xs={6}>
            <Typography variant="caption" fontWeight={700} textAlign="center" 
                       sx={{ color: data2024 ? data2024.color : theme.palette.text.secondary, fontSize: '0.8rem', fontFamily: 'Calibri, sans-serif' }}>
              2024
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" fontWeight={700} textAlign="center"
                       sx={{ color: data2025 ? data2025.color : theme.palette.text.secondary, fontSize: '0.8rem', fontFamily: 'Calibri, sans-serif' }}>
              2025
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ mb: 1 }} />

        {/* SECTION MENSUELLE */}
        <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block', fontSize: '0.75rem', fontFamily: 'Calibri, sans-serif' }}>
          Mensuel
        </Typography>
        
        <Grid container spacing={0.5} sx={{ mb: 1 }}>
          {/* Colonne 2024 */}
          <Grid item xs={6}>
            <Box sx={{ 
              p: 0.5, 
              backgroundColor: alpha(data2024?.color || theme.palette.grey[500], 0.05),
              borderRadius: 0.5,
              border: `1px solid ${alpha(data2024?.color || theme.palette.grey[500], 0.2)}`
            }}>
              {data2024 ? (
                <>
                  <Typography variant="caption" fontWeight={600} sx={{ mb: 0.2, display: 'block', fontSize: '0.75rem', fontFamily: 'Calibri, sans-serif' }}>
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(data2024.ioRevenue + data2024.complementRevenue)}
                  </Typography>
                  
                  <Typography variant="caption" color="primary.main" sx={{ display: "block", fontSize: '0.7rem', fontFamily: 'Calibri, sans-serif' }}>
                    I&O: {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(data2024.ioRevenue)} ({((data2024.ioRevenue / (data2024.ioRevenue + data2024.complementRevenue)) * 100).toFixed(0)}%)
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: '0.65rem', fontFamily: 'Calibri, sans-serif' }}>
                    {data2024.oppCount} opp.
                  </Typography>
                </>
              ) : (
                <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ fontSize: '0.75rem', fontFamily: 'Calibri, sans-serif' }}>
                  -
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Colonne 2025 */}
          <Grid item xs={6}>
            <Box sx={{ 
              p: 0.5, 
              backgroundColor: alpha(data2025?.color || theme.palette.grey[500], 0.05),
              borderRadius: 0.5,
              border: `1px solid ${alpha(data2025?.color || theme.palette.grey[500], 0.2)}`
            }}>
              {data2025 ? (
                <>
                  <Typography variant="caption" fontWeight={600} sx={{ mb: 0.2, display: 'block', fontSize: '0.75rem', fontFamily: 'Calibri, sans-serif' }}>
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(data2025.ioRevenue + data2025.complementRevenue)}
                  </Typography>
                  
                  <Typography variant="caption" color="primary.main" sx={{ display: "block", fontSize: '0.7rem', fontFamily: 'Calibri, sans-serif' }}>
                    I&O: {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(data2025.ioRevenue)} ({((data2025.ioRevenue / (data2025.ioRevenue + data2025.complementRevenue)) * 100).toFixed(0)}%)
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: '0.65rem', fontFamily: 'Calibri, sans-serif' }}>
                    {data2025.oppCount} opp.
                  </Typography>
                </>
              ) : (
                <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ fontSize: '0.75rem', fontFamily: 'Calibri, sans-serif' }}>
                  -
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ mb: 1 }} />

        {/* SECTION CUMULATIVE */}
        <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block', fontSize: '0.75rem', fontFamily: 'Calibri, sans-serif' }}>
          Cumulé
        </Typography>
        
        <Grid container spacing={0.5}>
          {/* Colonne 2024 Cumulé */}
          <Grid item xs={6}>
            <Box sx={{ 
              p: 0.5, 
              backgroundColor: alpha(data2024?.cumulativeColor || data2024?.color || theme.palette.grey[500], 0.05),
              borderRadius: 0.5,
              border: `1px dashed ${alpha(data2024?.cumulativeColor || data2024?.color || theme.palette.grey[500], 0.4)}`
            }}>
              {data2024 && data2024.cumulative !== null ? (
                <>
                  <Typography variant="caption" fontWeight={600} sx={{ mb: 0.2, display: 'block', fontSize: '0.75rem', fontFamily: 'Calibri, sans-serif' }}>
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(data2024.cumulative)}
                  </Typography>
                  
                  <Typography variant="caption" color="primary.main" sx={{ display: "block", fontSize: '0.7rem', fontFamily: 'Calibri, sans-serif' }}>
                    I&O: {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(data2024.cumulativeIO)} ({data2024.cumulative > 0 ? ((data2024.cumulativeIO / data2024.cumulative) * 100).toFixed(0) : 0}%)
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: '0.65rem', fontFamily: 'Calibri, sans-serif' }}>
                    {data2024.oppCountCumulative} opp.
                  </Typography>
                </>
              ) : (
                <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ fontSize: '0.75rem', fontFamily: 'Calibri, sans-serif' }}>
                  -
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Colonne 2025 Cumulé */}
          <Grid item xs={6}>
            <Box sx={{ 
              p: 0.5, 
              backgroundColor: alpha(data2025?.cumulativeColor || data2025?.color || theme.palette.grey[500], 0.05),
              borderRadius: 0.5,
              border: `1px dashed ${alpha(data2025?.cumulativeColor || data2025?.color || theme.palette.grey[500], 0.4)}`
            }}>
              {data2025 && data2025.cumulative !== null ? (
                <>
                  <Typography variant="caption" fontWeight={600} sx={{ mb: 0.2, display: 'block', fontSize: '0.75rem', fontFamily: 'Calibri, sans-serif' }}>
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(data2025.cumulative)}
                  </Typography>
                  
                  <Typography variant="caption" color="primary.main" sx={{ display: "block", fontSize: '0.7rem', fontFamily: 'Calibri, sans-serif' }}>
                    I&O: {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(data2025.cumulativeIO)} ({data2025.cumulative > 0 ? ((data2025.cumulativeIO / data2025.cumulative) * 100).toFixed(0) : 0}%)
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: '0.65rem', fontFamily: 'Calibri, sans-serif' }}>
                    {data2025.oppCountCumulative} opp.
                  </Typography>
                </>
              ) : (
                <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ fontSize: '0.75rem', fontFamily: 'Calibri, sans-serif' }}>
                  -
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Card>
    );
  }
  return null;
};

  // Add this useEffect to trigger the initial data processing and chart population
  useEffect(() => {
    if (data && data.length > 0 && !loading) {
      // Process data for chart when component mounts
      const bookedData = data.filter((item) => item["Status"] === 14);

      // Log what revenue type we're using
      console.log(
        "Chart using revenue type:",
        showNetRevenue ? "Net Revenue" : "Gross Revenue"
      );

      const monthly = getMonthlyYearlyTotals(
        bookedData,
        "Booking/Lost Date",
        showNetRevenue ? "Net Revenue" : "Gross Revenue"
      );

      const uniqueYears = [...new Set(monthly.map((item) => item.year))].sort();
      setYears(uniqueYears);

      // Format data for YoY comparison
      const yoyData = formatYearOverYearData(monthly);
      setYoyBookings(yoyData);

      

      // Calculate cumulative data
      const cumData = calculateCumulativeTotals(yoyData);
      setCumulativeData(cumData);

      // Also trigger the date analysis to ensure filtered opportunities are set
      updateDateAnalysis();
    }
  }, [data, loading, showNetRevenue]); // Include showNetRevenue in dependencies

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

    // Calculate total bookings revenue - use correct field based on showNetRevenue
    const total = sumBy(data, showNetRevenue ? "Net Revenue" : "Gross Revenue");
    setTotalBookings(total);

    // Calculate monthly yearly bookings for the bar chart
    const bookedData = data.filter((item) => item["Status"] === 14);
    const monthly = getMonthlyYearlyTotals(
      bookedData,
      "Booking/Lost Date",
      showNetRevenue ? "Net Revenue" : "Gross Revenue"
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
  }, [data, loading, showNetRevenue]);

  // Bookings 2025 calculation with new revenue logic
 const bookings2025 = data.filter(
  (item) =>
    item["Status"] === 14 &&
    item["Booking/Lost Date"] &&
    new Date(item["Booking/Lost Date"]).getFullYear() === 2025
);

const losses2025 = data.filter(
  (item) =>
    item["Status"] === 15 &&
    item["Booking/Lost Date"] &&
    new Date(item["Booking/Lost Date"]).getFullYear() === 2025
);

// Calculate TOTAL revenues (original amounts)
const bookings2025TotalRevenue = bookings2025.reduce(
  (sum, item) =>
    sum + (showNetRevenue ? (item["Net Revenue"] || 0) : (item["Gross Revenue"] || 0)),
  0
);

const losses2025TotalRevenue = losses2025.reduce(
  (sum, item) =>
    sum + (showNetRevenue ? (item["Net Revenue"] || 0) : (item["Gross Revenue"] || 0)),
  0
);

// Calculate ALLOCATED revenues (filtered amounts)
const bookings2025AllocatedRevenue = bookings2025.reduce((sum, item) => {
  if (item["Is Allocated"]) {
    return sum + (showNetRevenue ? (item["Allocated Net Revenue"] || 0) : (item["Allocated Gross Revenue"] || 0));
  } else {
    return sum + (showNetRevenue ? (item["Net Revenue"] || 0) : (item["Gross Revenue"] || 0));
  }
}, 0);

const losses2025AllocatedRevenue = losses2025.reduce((sum, item) => {
  if (item["Is Allocated"]) {
    return sum + (showNetRevenue ? (item["Allocated Net Revenue"] || 0) : (item["Allocated Gross Revenue"] || 0));
  } else {
    return sum + (showNetRevenue ? (item["Net Revenue"] || 0) : (item["Gross Revenue"] || 0));
  }
}, 0);

// Calculate average booking sizes (both total and allocated)
const averageBookingSize2025Total = bookings2025.length > 0 ? bookings2025TotalRevenue / bookings2025.length : 0;
const averageBookingSize2025Allocated = bookings2025.length > 0 ? bookings2025AllocatedRevenue / bookings2025.length : 0;

// Check if we have any allocation applied (to show/hide the allocated figures)
const hasAllocation = bookings2025.some(item => item["Is Allocated"]) || losses2025.some(item => item["Is Allocated"]);


  return (
    <Fade in={!loading} timeout={500}>
      <Box sx={{ width: "100%" }}>
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

    <Box sx={{ mt: 3, mb: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* Total Bookings */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Total Bookings Value
          </Typography>
          <Typography
            variant="h4"
            component="div"
            fontWeight={700}
            color="text.primary"
          >
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(bookings2025TotalRevenue)}
          </Typography>
          <Typography 
            variant="body2" 
            color="primary.main"
            sx={{ mt: 0.5 }}
          >
            (I&O: {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(
              bookings2025.reduce(
                (sum, item) =>
                  sum +
                  calculateRevenueWithSegmentLogic(
                    item,
                    showNetRevenue
                  ),
                0
              )
            )})
          </Typography>
        </Box>

        {/* Center arrow with percentage - only when allocation is active */}
        {hasAllocation && (
          <Box
            sx={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              px: 1,
              py: 0.5,
              borderRadius: 4,
              bgcolor: alpha(theme.palette.secondary.main, 0.1),
              zIndex: 1,
            }}
          >
            <Typography
              variant="caption"
              color="secondary.main"
              fontWeight={600}
              sx={{ mb: 0.5 }}
            >
              {bookings2025TotalRevenue > 0
                ? `${((bookings2025AllocatedRevenue / bookings2025TotalRevenue) * 100).toFixed(0)}%`
                : "0%"}
            </Typography>
            <ArrowRightAltIcon color="secondary" fontSize="small" />
          </Box>
        )}

        {/* Filtered Bookings - only when allocation is active */}
        {hasAllocation && (
          <Box sx={{ flex: 1, textAlign: "right" }}>
            <Typography
              variant="body2"
              color="secondary.main"
              gutterBottom
            >
              Filtered Bookings Value
            </Typography>
            <Typography
              variant="h4"
              component="div"
              color="secondary.main"
              fontWeight={700}
            >
              {new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(bookings2025AllocatedRevenue)}
            </Typography>
          </Box>
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
          100% vs total
        </Typography>
        <ArrowUpwardIcon fontSize="small" color="inherit" />
      </Box>
    </Box>
  </Paper>
</Grid>

{/* Total Lost Opportunities Card - Updated */}
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

    <Box sx={{ mt: 3, mb: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* Total Lost */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Total Lost Value
          </Typography>
          <Typography
            variant="h4"
            component="div"
            fontWeight={700}
            color="text.primary"
          >
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(losses2025TotalRevenue)}
          </Typography>
          {/* FIXED: Use calculateRevenueWithSegmentLogic like in bookings card */}
          <Typography 
            variant="body2" 
            color="primary.main"
            sx={{ mt: 0.5 }}
          >
            (I&O: {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(
              losses2025.reduce(
                (sum, item) =>
                  sum +
                  calculateRevenueWithSegmentLogic(
                    item,
                    showNetRevenue
                  ),
                0
              )
            )})
          </Typography>
        </Box>

        {/* Center arrow with percentage - only when allocation is active */}
        {hasAllocation && (
          <Box
            sx={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              px: 1,
              py: 0.5,
              borderRadius: 4,
              bgcolor: alpha(theme.palette.secondary.main, 0.1),
              zIndex: 1,
            }}
          >
            <Typography
              variant="caption"
              color="secondary.main"
              fontWeight={600}
              sx={{ mb: 0.5 }}
            >
              {losses2025TotalRevenue > 0
                ? `${((losses2025AllocatedRevenue / losses2025TotalRevenue) * 100).toFixed(0)}%`
                : "0%"}
            </Typography>
            <ArrowRightAltIcon color="secondary" fontSize="small" />
          </Box>
        )}

        {/* Filtered Lost - only when allocation is active */}
        {hasAllocation && (
          <Box sx={{ flex: 1, textAlign: "right" }}>
            <Typography
              variant="body2"
              color="secondary.main"
              gutterBottom
            >
              Filtered Lost Value
            </Typography>
            <Typography
              variant="h4"
              component="div"
              color="secondary.main"
              fontWeight={700}
            >
              {new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(losses2025AllocatedRevenue)}
            </Typography>
          </Box>
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
          100% vs total
        </Typography>
        <ArrowDownwardIcon fontSize="small" color="inherit" />
      </Box>
    </Box>
  </Paper>
</Grid>

{/* Average Booking Size Card - Updated */}
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

    <Box sx={{ mt: 3, mb: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* Total Average */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Average Booking Size
          </Typography>
          <Typography
            variant="h4"
            component="div"
            fontWeight={700}
            color="text.primary"
          >
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(averageBookingSize2025Total)}
          </Typography>
          <Typography 
            variant="body2" 
            color="primary.main"
            sx={{ mt: 0.5 }}
          >
            (I&O: {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(
              bookings2025.length > 0
                ? bookings2025.reduce(
                    (sum, item) =>
                      sum +
                      calculateRevenueWithSegmentLogic(
                        item,
                        showNetRevenue
                      ),
                    0
                  ) / bookings2025.length
                : 0
            )})
          </Typography>
        </Box>

        {/* Center arrow with percentage - only when allocation is active */}
        {hasAllocation && (
          <Box
            sx={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              px: 1,
              py: 0.5,
              borderRadius: 4,
              bgcolor: alpha(theme.palette.secondary.main, 0.1),
              zIndex: 1,
            }}
          >
            <Typography
              variant="caption"
              color="secondary.main"
              fontWeight={600}
              sx={{ mb: 0.5 }}
            >
              {averageBookingSize2025Total > 0
                ? `${((averageBookingSize2025Allocated / averageBookingSize2025Total) * 100).toFixed(0)}%`
                : "0%"}
            </Typography>
            <ArrowRightAltIcon color="secondary" fontSize="small" />
          </Box>
        )}

        {/* Filtered Average - only when allocation is active */}
        {hasAllocation && (
          <Box sx={{ flex: 1, textAlign: "right" }}>
            <Typography
              variant="body2"
              color="secondary.main"
              gutterBottom
            >
              Filtered Average
            </Typography>
            <Typography
              variant="h4"
              component="div"
              color="secondary.main"
              fontWeight={700}
            >
              {new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(averageBookingSize2025Allocated)}
            </Typography>
          </Box>
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
                ...bookings2025
                  .filter((opp) =>
                    showNetRevenue
                      ? opp["Net Revenue"] > 0
                      : opp["Gross Revenue"] > 0
                  )
                  .map((opp) =>
                    showNetRevenue
                      ? opp["Net Revenue"] || 0
                      : opp["Gross Revenue"] || 0
                  )
              )
            )}{" "}
            -{" "}
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(
              Math.max(
                ...bookings2025.map((opp) =>
                  showNetRevenue
                    ? opp["Net Revenue"] || 0
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
          100% vs total
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

    {/* Bars and Lines for each year */}
    {years.map((year, index) => {
      const colorSet = COLORS[index % COLORS.length];
      return (
        <React.Fragment key={year}>
          {/* I&O Revenue Bar (Bottom) */}
          <Bar
            yAxisId="monthly"
            dataKey={`${year}_io`}
            name={index === 0 ? `${year} Revenue` : ""}
            fill={colorSet.bar}
            fillOpacity={0.9}
            stackId={`${year}-stack`}
          />

          {/* Complement Revenue Bar (Top) */}
          <Bar
            yAxisId="monthly"
            dataKey={`${year}_complement`}
            name=""
            fill={colorSet.bar}
            fillOpacity={0.4}
            stackId={`${year}-stack`}
          />

          {/* Cumulative Line */}
          <Line
            yAxisId="cumulative"
            type="monotone"
            dataKey={`${year}_cumulative`}
            name={`${year} Cumulatif`}
            stroke={colorSet.line}
            strokeWidth={3}
            dot={false}
          />

          {/* Cumulative I&O Line */}
          <Line
            yAxisId="cumulative"
            type="monotone"
            dataKey={`${year}_io_cumulative`}
            name=""
            stroke={colorSet.line}
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{
              fill: colorSet.line,
              stroke: colorSet.line,
              strokeWidth: 2,
              r: 2
            }}
          />
        </React.Fragment>
      );
    })}

    {/* LIGNE D'OBJECTIF I&O - APRÈS LA BOUCLE DES ANNÉES */}
    <Line
      yAxisId="cumulative"
      type="monotone"
      dataKey="ioTarget"
      name="2025 I&O Target"
      stroke="#FF6B35"
      strokeWidth={2}
      strokeDasharray="8 8"
      dot={{
        fill: "#FF6B35",
        stroke: "#FF6B35",
        strokeWidth: 2,
        r: 3
      }}
    />
  </ComposedChart>
</ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}></Grid>
        {/* Period Filter MOVED HERE - between chart and Top 10 accounts */}
        <Grid item xs={12}>
          <PeriodFilter
            dateRange={dateRange}
            setDateRange={setDateRange}
            updateDateAnalysis={updateDateAnalysis}
          />
        </Grid>

        {/* NEW: Top 10 Accounts Section with date range filter */}
        <TopAccountsSection
          data={data}
          dateRange={dateRange}
          showNetRevenue={showNetRevenue}
        />

        {/* Period Analysis Results - Improved Design */}
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

            {/* Date range indicator */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              For period: {formatDateFR(dateRange[0])} to{" "}
              {formatDateFR(dateRange[1])}
            </Typography>

            <Divider sx={{ mb: 3 }} />

            <Tabs
              value={analysisTab}
              onChange={handleAnalysisTabChange}
              aria-label="analysis tabs"
              variant="fullWidth"
              sx={{
                mb: 3,
                "& .MuiTab-root": {
                  fontWeight: 600,
                },
                "& .Mui-selected": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  borderRadius: "8px 8px 0 0",
                },
              }}
            >
              <Tab
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body1">Wins</Typography>
                    <Chip
                      label={newWins.length}
                      size="small"
                      color="success"
                      sx={{ fontWeight: "bold" }}
                    />
                  </Box>
                }
              />
              <Tab
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body1">Lost</Typography>
                    <Chip
                      label={newLosses.length}
                      size="small"
                      color="error"
                      sx={{ fontWeight: "bold" }}
                    />
                  </Box>
                }
              />
            </Tabs>

            <Box sx={{ mb: 3 }}>
              {analysisTab === 0 && (
                <Box
                  sx={{
                    backgroundColor: alpha(theme.palette.success.main, 0.05),
                    borderRadius: 2,
                    p: 2,
                    border: `1px solid ${alpha(
                      theme.palette.success.main,
                      0.1
                    )}`,
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="subtitle1"
                        fontWeight={600}
                        color="success.main"
                        gutterBottom
                      >
                        Won Opportunities in Selected Period
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total number of opportunities won:{" "}
                        <strong>{newWins.length}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Average win size:{" "}
                        <strong>
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(
                            newWins.length > 0
                              ? sumBy(newWins, "Gross Revenue") / newWins.length
                              : 0
                          )}
                        </strong>
                      </Typography>
                    </Grid>
                    <Grid
                      item
                      xs={12}
                      md={6}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "flex-end",
                      }}
                    >
                      <Typography
                        variant="h5"
                        fontWeight={700}
                        color="success.main"
                      >
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(
                          sumBy(
                            newWins,
                            showNetRevenue ? "Net Revenue" : "Gross Revenue"
                          )
                        )}
                      </Typography>

                      {/* I&O amount directly below the main figure */}
                      <Typography
                        variant="body1"
                        fontWeight={600}
                        color="primary.main"
                        sx={{ mt: 0.5 }}
                      >
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(
                          newWins.reduce(
                            (sum, item) =>
                              sum +
                              calculateRevenueWithSegmentLogic(
                                item,
                                showNetRevenue
                              ),
                            0
                          )
                        )}
                        {newWins.length > 0 && (
                          <Typography
                            component="span"
                            variant="caption"
                            color="primary.main"
                            sx={{ ml: 1 }}
                          >
                            (
                            {(
                              (newWins.reduce(
                                (sum, item) =>
                                  sum +
                                  calculateRevenueWithSegmentLogic(
                                    item,
                                    showNetRevenue
                                  ),
                                0
                              ) /
                                sumBy(
                                  newWins,
                                  showNetRevenue
                                    ? "Net Revenue"
                                    : "Gross Revenue"
                                )) *
                              100
                            ).toFixed(1)}
                            %)
                          </Typography>
                        )}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {analysisTab === 1 && (
                <Box
                  sx={{
                    backgroundColor: alpha(theme.palette.error.main, 0.05),
                    borderRadius: 2,
                    p: 2,
                    border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="subtitle1"
                        fontWeight={600}
                        color="error.main"
                        gutterBottom
                      >
                        Lost Opportunities in Selected Period
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total number of opportunities lost:{" "}
                        <strong>{newLosses.length}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Average loss size:{" "}
                        <strong>
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(
                            newLosses.length > 0
                              ? sumBy(
                                  newLosses,
                                  showNetRevenue
                                    ? "Net Revenue"
                                    : "Gross Revenue"
                                ) / newLosses.length
                              : 0
                          )}
                        </strong>
                      </Typography>
                    </Grid>
                    <Grid
                      item
                      xs={12}
                      md={6}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "flex-end",
                      }}
                    >
                      <Typography
                        variant="h5"
                        fontWeight={700}
                        color="error.main"
                      >
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(
                          sumBy(
                            newLosses,
                            showNetRevenue ? "Net Revenue" : "Gross Revenue"
                          )
                        )}
                      </Typography>

                      {/* I&O amount directly below the main figure */}
                      <Typography
                        variant="body1"
                        fontWeight={600}
                        color="primary.main"
                        sx={{ mt: 0.5 }}
                      >
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(
                          newLosses.reduce(
                            (sum, item) =>
                              sum +
                              calculateRevenueWithSegmentLogic(
                                item,
                                showNetRevenue
                              ),
                            0
                          )
                        )}
                        {newLosses.length > 0 && (
                          <Typography
                            component="span"
                            variant="caption"
                            color="primary.main"
                            sx={{ ml: 1 }}
                          >
                            (
                            {(
                              (newLosses.reduce(
                                (sum, item) =>
                                  sum +
                                  calculateRevenueWithSegmentLogic(
                                    item,
                                    showNetRevenue
                                  ),
                                0
                              ) /
                                sumBy(
                                  newLosses,
                                  showNetRevenue
                                    ? "Net Revenue"
                                    : "Gross Revenue"
                                )) *
                              100
                            ).toFixed(1)}
                            %)
                          </Typography>
                        )}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Opportunity List */}
        <Grid item xs={12} sx={{ mt: 3 }}>
          <OpportunityList
            data={filteredOpportunities}
            title={`Bookings`}
            selectedOpportunities={selectedOpportunities}
            onSelectionChange={onSelection}
            showNetRevenue={showNetRevenue}
          />
        </Grid>
      </Box>
    </Fade>
  );
};

export default BookingsTab;
