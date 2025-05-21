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
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import FilterListIcon from "@mui/icons-material/FilterList";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import AnimatedRankings from "./AnimatedRankings";

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

const TopAccountsSection = ({ data, dateRange }) => {
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
  const [specialSegmentBookingsTotal, setSpecialSegmentBookingsTotal] = useState(0);
  const [specialSegmentIOTotal, setSpecialSegmentIOTotal] = useState(0);
  
  // Target amount in euros for I&O
  const IO_TARGET = 1000000; // 1 million euros

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
    let bookedOpportunities = data.filter((item) => item.Status === 14);
    
    // Apply date range filter if available
    if (dateRange && dateRange[0] && dateRange[1]) {
      bookedOpportunities = bookedOpportunities.filter((item) => {
        const statusDate = new Date(item["Last Status Change Date"]);
        return statusDate >= dateRange[0] && statusDate <= dateRange[1];
      });
    }

    // Calculate total bookings and I&O amounts for ALL filtered accounts
    const totalAllBookings = bookedOpportunities.reduce(
      (sum, opp) => sum + (opp["Gross Revenue"] || 0),
      0
    );
    
    const totalAllIO = bookedOpportunities.reduce(
      (sum, opp) => sum + calculateRevenueWithSegmentLogic(opp),
      0
    );
    
    // Calculate special segment totals (CLR, IEM, AUTO)
    const specialSegmentBookings = bookedOpportunities
      .filter(opp => ["AUTO", "CLR", "IEM"].includes(opp["Sub Segment Code"]))
      .reduce((sum, opp) => sum + (opp["Gross Revenue"] || 0), 0);
    
    const specialSegmentIO = bookedOpportunities
      .filter(opp => ["AUTO", "CLR", "IEM"].includes(opp["Sub Segment Code"]))
      .reduce((sum, opp) => sum + calculateRevenueWithSegmentLogic(opp), 0);
    
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
          hasSpecialSegment: false
        };
      }

      // Add to total amount
      const bookingAmount = opportunity["Gross Revenue"] || 0;
      const calculatedAmount = calculateRevenueWithSegmentLogic(opportunity);

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
      ioProgressPercentage: Math.min((account.calculatedAmount / IO_TARGET) * 100, 100) // Calculate progress toward 1M€ target
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
          For period: {formatDateFR(dateRange[0])} to {formatDateFR(dateRange[1])}
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
                  const hasSpecialSegment = account.opportunities.some(opp => 
                    ["AUTO", "CLR", "IEM"].includes(opp["Sub Segment Code"])
                  );
                  
                  return (
                    <TableRow 
                      key={account.account} 
                      hover
                      sx={hasSpecialSegment ? {
                        backgroundColor: alpha(theme.palette.info.light, 0.15),
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.info.light, 0.25),
                        }
                      } : {}}
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
                                sx={{ ml: 1, height: 20, fontSize: '0.65rem' }}
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
                        <Typography variant="caption" color="text.secondary" display="block">
                          Avg: {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(account.avgBookingSize)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600} color="primary.main">
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(account.calculatedAmount)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {(account.calculatedAmount / account.bookingAmount * 100).toFixed(1)}% of bookings
                        </Typography>
                      </TableCell>
                      <TableCell align="right" width="15%">
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                          {account.ioProgressPercentage.toFixed(1)}%
                        </Typography>
                      </TableCell>
                      <TableCell width="20%">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={account.ioProgressPercentage}
                              sx={{
                                height: 10,
                                borderRadius: 5,
                                backgroundColor: alpha(theme.palette.grey[300], 0.5),
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 5,
                                  backgroundColor: getProgressColor(account.ioProgressPercentage),
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
          height: '100%',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: `0 4px 20px 0 ${alpha(theme.palette.grey[500], 0.1)}`,
          border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        }}
      >
        <Box 
          sx={{ 
            p: 1.5, 
            backgroundColor: alpha(theme.palette.grey[100], 0.7),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} color="text.primary">
            Bookings
          </Typography>
        </Box>
        
        <Box sx={{ p: 2, backgroundColor: alpha(theme.palette.background.paper, 0.9) }}>
          <Grid container alignItems="center">
            {/* Total Value */}
            <Grid item xs={5}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total
              </Typography>
              <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(allAccountsBookingsTotal)}
              </Typography>
            </Grid>
            
            {/* Arrow & Percentage */}
            <Grid item xs={2} sx={{ textAlign: 'center' }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  {(totalBookingsAmount / allAccountsBookingsTotal * 100).toFixed(1)}%
                </Typography>
                <Box component="span" sx={{ 
                  color: theme.palette.text.secondary,
                  fontSize: '1.5rem',
                  lineHeight: 1
                }}>
                  →
                </Box>
              </Box>
            </Grid>
            
            {/* Top 10 Value */}
            <Grid item xs={5}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Top 10
              </Typography>
              <Typography variant="h6" fontWeight={700} color="text.primary">
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
          height: '100%',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: `0 4px 20px 0 ${alpha(theme.palette.grey[500], 0.1)}`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        }}
      >
        <Box 
          sx={{ 
            p: 1.5, 
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} color="primary.dark">
            I&O
          </Typography>
        </Box>
        
        <Box sx={{ p: 2, backgroundColor: alpha(theme.palette.primary.light, 0.04) }}>
          <Grid container alignItems="center">
            {/* Total Value */}
            <Grid item xs={5}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total
              </Typography>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(allAccountsIOTotal)}
              </Typography>
            </Grid>
            
            {/* Arrow & Percentage */}
            <Grid item xs={2} sx={{ textAlign: 'center' }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Typography variant="caption" fontWeight={600} color="primary.main">
                  {(totalIOAmount / allAccountsIOTotal * 100).toFixed(1)}%
                </Typography>
                <Box component="span" sx={{ 
                  color: theme.palette.primary.main,
                  fontSize: '1.5rem',
                  lineHeight: 1
                }}>
                  →
                </Box>
              </Box>
            </Grid>
            
            {/* Top 10 Value */}
            <Grid item xs={5}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Top 10
              </Typography>
              <Typography variant="h6" fontWeight={700} color="primary.main">
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
          height: '100%',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: `0 4px 20px 0 ${alpha(theme.palette.info.main, 0.1)}`,
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
        }}
      >
        <Box 
          sx={{ 
            p: 1.5, 
            backgroundColor: alpha(theme.palette.info.main, 0.1),
            borderBottom: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} color="info.dark">
            AUTO/CLR/IEM
          </Typography>
        </Box>
        
        <Box sx={{ p: 2, backgroundColor: alpha(theme.palette.info.light, 0.04) }}>
          <Grid container alignItems="center">
            {/* Total Value */}
            <Grid item xs={5}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Top 10 Total
              </Typography>
              <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(totalBookingsAmount)}
              </Typography>
            </Grid>
            
            {/* Arrow & Percentage */}
            <Grid item xs={2} sx={{ textAlign: 'center' }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Typography variant="caption" fontWeight={600} color="info.main">
                  {totalBookingsAmount > 0 ? (specialSegmentBookingsTotal / totalBookingsAmount * 100).toFixed(1) : "0.0"}%
                </Typography>
                <Box component="span" sx={{ 
                  color: theme.palette.info.main,
                  fontSize: '1.5rem',
                  lineHeight: 1
                }}>
                  →
                </Box>
              </Box>
            </Grid>
            
            {/* Special Segment Value */}
            <Grid item xs={5}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                In Segment
              </Typography>
              <Typography variant="h6" fontWeight={700} color="info.main">
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
      >      </Button>

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

const BookingsTab = ({ data, loading, onSelection, selectedOpportunities }) => {
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

  // Update date analysis method to use Last Status Change Date
  const updateDateAnalysis = () => {
    if (!data) return;
    
    const startDate = dateRange[0] || new Date(currentYear, 0, 1);  // Default to Jan 1st
    const endDate = dateRange[1] || new Date();  // Default to today
    
    console.log("Updating Date Analysis:");
    console.log("Start Date:", startDate);
    console.log("End Date:", endDate);
  
    // Get new bookings and losses within the date range
    const wins = data.filter((item) => {
      if (item["Status"] !== 14) return false;
      if (!item["Last Status Change Date"]) return false;
      const statusDate = new Date(item["Last Status Change Date"]);
      return statusDate >= startDate && statusDate <= endDate;
    });
  
    const losses = data.filter((item) => {
      if (item["Status"] !== 15) return false;
      if (!item["Last Status Change Date"]) return false;
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
    } else {
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

  // Add this useEffect to trigger the initial data processing and chart population
useEffect(() => {
  // This will ensure the chart data is processed on initial load
  if (data && data.length > 0 && !loading) {
    // Process data for chart when component mounts
    const bookedData = data.filter((item) => item["Status"] === 14);
    const monthly = getMonthlyYearlyTotals(
      bookedData,
      "Last Status Change Date",
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
    
    // Also trigger the date analysis to ensure filtered opportunities are set
    updateDateAnalysis();
  }
}, []);  // Empty dependency array means this runs once on mount

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

        <Grid item xs={12}>
  <AnimatedRankings data={data} />
</Grid>
        {/* Period Filter MOVED HERE - between chart and Top 10 accounts */}
        <Grid item xs={12}>
          <PeriodFilter
            dateRange={dateRange}
            setDateRange={setDateRange}
            updateDateAnalysis={updateDateAnalysis}
          />
        </Grid>

        {/* NEW: Top 10 Accounts Section with date range filter */}
        <TopAccountsSection data={data} dateRange={dateRange} />

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
              For period: {formatDateFR(dateRange[0])} to {formatDateFR(dateRange[1])}
            </Typography>

            <Divider sx={{ mb: 3 }} />

            <Tabs
              value={analysisTab}
              onChange={handleAnalysisTabChange}
              aria-label="analysis tabs"
              variant="fullWidth"
              sx={{ 
                mb: 3,
                '& .MuiTab-root': {
                  fontWeight: 600
                },
                '& .Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  borderRadius: '8px 8px 0 0'
                }
              }}
            >
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1">Wins</Typography>
                    <Chip 
                      label={newWins.length} 
                      size="small" 
                      color="success" 
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>
                } 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1">Lost</Typography>
                    <Chip 
                      label={newLosses.length} 
                      size="small" 
                      color="error"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>
                } 
              />
            </Tabs>

            <Box sx={{ mb: 3 }}>
              {analysisTab === 0 && (
                <Box sx={{ 
                  backgroundColor: alpha(theme.palette.success.main, 0.05),
                  borderRadius: 2,
                  p: 2,
                  border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`
                }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" fontWeight={600} color="success.main" gutterBottom>
                        Won Opportunities in Selected Period
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total number of opportunities won: <strong>{newWins.length}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Average win size: <strong>
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency", 
                            currency: "EUR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }).format(newWins.length > 0 ? sumBy(newWins, "Gross Revenue") / newWins.length : 0)}
                        </strong>
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
                      <Typography variant="h5" fontWeight={700} color="success.main">
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(sumBy(newWins, "Gross Revenue"))}
                      </Typography>
                      
                      {/* I&O amount directly below the main figure */}
                      <Typography variant="body1" fontWeight={600} color="primary.main" sx={{ mt: 0.5 }}>
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(newWins.reduce((sum, item) => sum + calculateRevenueWithSegmentLogic(item), 0))}
                        {newWins.length > 0 && (
                          <Typography component="span" variant="caption" color="primary.main" sx={{ ml: 1 }}>
                            ({(newWins.reduce((sum, item) => sum + calculateRevenueWithSegmentLogic(item), 0) / sumBy(newWins, "Gross Revenue") * 100).toFixed(1)}%)
                          </Typography>
                        )}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {analysisTab === 1 && (
                <Box sx={{ 
                  backgroundColor: alpha(theme.palette.error.main, 0.05),
                  borderRadius: 2,
                  p: 2,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`
                }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" fontWeight={600} color="error.main" gutterBottom>
                        Lost Opportunities in Selected Period
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total number of opportunities lost: <strong>{newLosses.length}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Average loss size: <strong>
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency", 
                            currency: "EUR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }).format(newLosses.length > 0 ? sumBy(newLosses, "Gross Revenue") / newLosses.length : 0)}
                        </strong>
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
                      <Typography variant="h5" fontWeight={700} color="error.main">
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(sumBy(newLosses, "Gross Revenue"))}
                      </Typography>
                      
                      {/* I&O amount directly below the main figure */}
                      <Typography variant="body1" fontWeight={600} color="primary.main" sx={{ mt: 0.5 }}>
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(newLosses.reduce((sum, item) => sum + calculateRevenueWithSegmentLogic(item), 0))}
                        {newLosses.length > 0 && (
                          <Typography component="span" variant="caption" color="primary.main" sx={{ ml: 1 }}>
                            ({(newLosses.reduce((sum, item) => sum + calculateRevenueWithSegmentLogic(item), 0) / sumBy(newLosses, "Gross Revenue") * 100).toFixed(1)}%)
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
