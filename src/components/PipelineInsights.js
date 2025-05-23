import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Box,
  Divider,
  Chip,
  alpha,
  useTheme,
  Grid,
  Fade,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import TimelineIcon from "@mui/icons-material/Timeline";

// Revenue calculation function copied from PipelineTab

const calculateRevenueWithSegmentLogic = (item, showNetRevenue = false) => {
  // Check if segment code is AUTO, CLR, or IEM
  const specialSegmentCodes = ['AUTO', 'CLR', 'IEM'];
  const isSpecialSegmentCode = specialSegmentCodes.includes(item['Sub Segment Code']);

  // If special segment code, return full revenue based on toggle
  if (isSpecialSegmentCode) {
    return showNetRevenue ? (item['Net Revenue'] || 0) : (item['Gross Revenue'] || 0);
  }

  // Check each service line (1, 2, and 3)
  const serviceLines = [
    { line: item['Service Line 1'], percentage: item['Service Offering 1 %'] || 0 },
    { line: item['Service Line 2'], percentage: item['Service Offering 2 %'] || 0 },
    { line: item['Service Line 3'], percentage: item['Service Offering 3 %'] || 0 }
  ];

  // Get the base revenue value based on toggle
  const baseRevenue = showNetRevenue ? (item['Net Revenue'] || 0) : (item['Gross Revenue'] || 0);

  // Calculate total allocated revenue for Operations
  const operationsAllocation = serviceLines.reduce((total, service) => {
    if (service.line === 'Operations') {
      return total + (baseRevenue * (service.percentage / 100));
    }
    return total;
  }, 0);

  // If any Operations allocation is found, return that
  if (operationsAllocation > 0) {
    return operationsAllocation;
  }

  // If no specific Operations allocation, return full revenue
  return baseRevenue;
};

/**
 * Component that analyzes pipeline data and generates insights
 * Customized to show specific status changes
 */
const PipelineInsights = ({ data, isFiltered, onFilterChange, activeFilterType, showNetRevenue = false }) => {
  const theme = useTheme();
  const [insights, setInsights] = useState({
    newOpportunities: { 
      count: 0, 
      prevCount: 0,
      revenue: 0, 
      calculatedRevenue: 0, 
      change: 0,
      filteredData: [] 
    },
    recentStatus6: { 
      count: 0, 
      prevCount: 0,
      revenue: 0, 
      calculatedRevenue: 0, 
      change: 0,
      filteredData: [] 
    },
    recentStatus11: { 
      count: 0, 
      prevCount: 0,
      revenue: 0, 
      calculatedRevenue: 0, 
      change: 0,
      filteredData: [] 
    },
    isLoading: true,
  });

  useEffect(() => {
    // Don't process if no data
    if (!data || data.length === 0) {
      setInsights((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    // Calculate the insights based on the data
    calculateInsights(data);
  }, [data]);

  const calculateInsights = (opportunityData) => {
    try {
      // Get current date and month boundaries
      const currentDate = new Date();
      
      // Start of current month
      const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      // Start of previous month
      const startOfPreviousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      
      // End of previous month
      const endOfPreviousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

      // All new opportunities this month (since the beginning of the month)
      const newOpportunitiesThisMonth = opportunityData.filter((opp) => {
        const creationDate = new Date(opp["Creation Date"]);
        return creationDate >= startOfCurrentMonth && creationDate <= currentDate;
      });

      // New opportunities in the previous month
      const newOpportunitiesPreviousMonth = opportunityData.filter((opp) => {
        const creationDate = new Date(opp["Creation Date"]);
        return creationDate >= startOfPreviousMonth && creationDate <= endOfPreviousMonth;
      });

      // Calculate change percentage for new opportunities
      const newOpportunitiesChange =
        newOpportunitiesPreviousMonth.length > 0
          ? ((newOpportunitiesThisMonth.length -
              newOpportunitiesPreviousMonth.length) /
              newOpportunitiesPreviousMonth.length) *
            100
          : 100;

      // Status changes this month
      // Recent moves to Status 6 (Proposal Delivered)
      const recentStatus6 = opportunityData.filter((opp) => {
        const statusDate = new Date(opp["Last Status Change Date"]);
        return (
          statusDate >= startOfCurrentMonth &&
          statusDate <= currentDate &&
          opp.Status === 6 // Status 6 - Proposal Delivered
        );
      });

      // Previous month Status 6 moves
      const previousStatus6 = opportunityData.filter((opp) => {
        const statusDate = new Date(opp["Last Status Change Date"]);
        return (
          statusDate >= startOfPreviousMonth &&
          statusDate <= endOfPreviousMonth &&
          opp.Status === 6
        );
      });

      // Calculate change percentage for Status 6 moves
      const status6Change =
        previousStatus6.length > 0
          ? ((recentStatus6.length - previousStatus6.length) /
              previousStatus6.length) *
            100
          : 100;

      // Recent moves to Status 11 (Final Negotiation)
      const recentStatus11 = opportunityData.filter((opp) => {
        const statusDate = new Date(opp["Last Status Change Date"]);
        return (
          statusDate >= startOfCurrentMonth &&
          statusDate <= currentDate &&
          opp.Status === 11 // Status 11 - Final Negotiation
        );
      });

      // Previous month Status 11 moves
      const previousStatus11 = opportunityData.filter((opp) => {
        const statusDate = new Date(opp["Last Status Change Date"]);
        return (
          statusDate >= startOfPreviousMonth &&
          statusDate <= endOfPreviousMonth &&
          opp.Status === 11
        );
      });

      // Calculate change percentage for Status 11 moves
      const status11Change =
        previousStatus11.length > 0
          ? ((recentStatus11.length - previousStatus11.length) /
              previousStatus11.length) *
            100
          : recentStatus11.length > 0
          ? 100
          : 0;

      // Sum up the revenues (original and calculated)
      const newOpportunitiesRevenue = newOpportunitiesThisMonth.reduce(
        (sum, opp) => sum + (showNetRevenue ? (opp["Net Revenue"] || 0) : (opp["Gross Revenue"] || 0)),
        0
      );
      const newOpportunitiesCalculatedRevenue = newOpportunitiesThisMonth.reduce(
        (sum, opp) => sum + calculateRevenueWithSegmentLogic(opp, showNetRevenue),
        0
      );
      
      const recentStatus6Revenue = recentStatus6.reduce(
        (sum, opp) => sum + (showNetRevenue ? (opp["Net Revenue"] || 0) : (opp["Gross Revenue"] || 0)),
        0
      );
      const recentStatus6CalculatedRevenue = recentStatus6.reduce(
        (sum, opp) => sum + calculateRevenueWithSegmentLogic(opp, showNetRevenue),
        0
      );
      
      const recentStatus11Revenue = recentStatus11.reduce(
        (sum, opp) => sum + (showNetRevenue ? (opp["Net Revenue"] || 0) : (opp["Gross Revenue"] || 0)),
        0
      );
      const recentStatus11CalculatedRevenue = recentStatus11.reduce(
        (sum, opp) => sum + calculateRevenueWithSegmentLogic(opp, showNetRevenue),
        0
      );

      // Get month name for display
      const currentMonthName = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(currentDate);

      // Set insights state
      setInsights({
        newOpportunities: {
          count: newOpportunitiesThisMonth.length,
          prevCount: newOpportunitiesPreviousMonth.length,
          revenue: newOpportunitiesRevenue,
          calculatedRevenue: newOpportunitiesCalculatedRevenue,
          change: newOpportunitiesChange,
          monthName: currentMonthName,
          filteredData: newOpportunitiesThisMonth // Store the filtered opportunities
        },
        recentStatus6: {
          count: recentStatus6.length,
          prevCount: previousStatus6.length,
          revenue: recentStatus6Revenue,
          calculatedRevenue: recentStatus6CalculatedRevenue,
          change: status6Change,
          monthName: currentMonthName,
          filteredData: recentStatus6 // Store the filtered opportunities
        },
        recentStatus11: {
          count: recentStatus11.length,
          prevCount: previousStatus11.length,
          revenue: recentStatus11Revenue,
          calculatedRevenue: recentStatus11CalculatedRevenue,
          change: status11Change,
          monthName: currentMonthName,
          filteredData: recentStatus11 // Store the filtered opportunities
        },
        isLoading: false,
      });
    } catch (error) {
      console.error("Error calculating insights:", error);
      setInsights((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Helper to get the appropriate trend icon based on a value and whether up is good
  const getTrendIcon = (value, upIsGood = true, size = "small") => {
    if (value > 5) {
      return upIsGood ? (
        <TrendingUpIcon fontSize={size} color="success" />
      ) : (
        <TrendingUpIcon fontSize={size} color="error" />
      );
    } else if (value < -5) {
      return upIsGood ? (
        <TrendingDownIcon fontSize={size} color="error" />
      ) : (
        <TrendingDownIcon fontSize={size} color="success" />
      );
    } else {
      return <TrendingFlatIcon fontSize={size} color="info" />;
    }
  };

  // Helper to format currency values
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Handle clicks on the insights cards to filter opportunities
  const handleInsightClick = (filteredOpportunities, filterType) => {
    if (onFilterChange && filteredOpportunities.length > 0) {
      // Call the parent component's filter function with the filtered data
      onFilterChange(filteredOpportunities, filterType);
    }
  };

  // Check if a filter is active for a specific insight
  const isActiveFilter = (filterType) => {
    return activeFilterType === filterType;
  };

  return (
    <Fade in={!insights.isLoading} timeout={500}>
      <Paper
        elevation={2}
        sx={{
          p: 3,
          borderRadius: 3,
          mb: 3,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          backgroundImage: `linear-gradient(to right, ${alpha(
            theme.palette.primary.light,
            0.05
          )}, ${alpha(theme.palette.background.default, 0.05)})`,
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
          <Typography variant="h6" gutterBottom fontWeight={600}>
    Pipeline Insights
    {isFiltered && (
      <Chip
        label="Filtered View"
        size="small"
        color="primary"
        sx={{ ml: 1, fontWeight: 500 }}
      />
    )}
  </Typography>

          <Chip
            icon={<TimelineIcon />}
            label={`Au ${new Date().toLocaleDateString('fr-FR')}`}
            size="small"
            variant="outlined"
            color="primary"
          />
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          {/* New Opportunities - This Month */}
          <Grid item xs={12} sm={6} md={4}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: isActiveFilter('New Opportunities') 
                  ? alpha(theme.palette.info.main, 0.15)
                  : alpha(theme.palette.info.main, 0.08),
                height: "100%",
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  bgcolor: alpha(theme.palette.info.main, 0.12),
                  transform: "translateY(-2px)",
                  boxShadow: 2,
                },
                border: isActiveFilter('New Opportunities') 
                  ? `1px solid ${theme.palette.info.main}` 
                  : "none",
              }}
              onClick={() => handleInsightClick(insights.newOpportunities.filteredData, 'New Opportunities')}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  New Opps ({insights.newOpportunities.monthName})
                </Typography>
                {getTrendIcon(insights.newOpportunities.change)}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h4" fontWeight={700} color="info.main">
                  {insights.newOpportunities.count}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: insights.newOpportunities.change >= 0 ? "success.main" : "error.main",
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  ({insights.newOpportunities.prevCount} | {Math.abs(Math.round(insights.newOpportunities.change))}% vs prev. month)
                </Typography>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {formatCurrency(insights.newOpportunities.revenue)}
                </Typography>
                <Typography variant="body2" color="primary.main" sx={{ mt: 0.5 }}>
                  (I&O: {formatCurrency(insights.newOpportunities.calculatedRevenue)})
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Recent Status 6 - Proposal Delivered (This Month) */}
          <Grid item xs={12} sm={6} md={4}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: isActiveFilter('Proposals Delivered') 
                  ? alpha(theme.palette.warning.main, 0.15)
                  : alpha(theme.palette.warning.main, 0.08),
                height: "100%",
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  bgcolor: alpha(theme.palette.warning.main, 0.12),
                  transform: "translateY(-2px)",
                  boxShadow: 2,
                },
                border: isActiveFilter('Proposals Delivered') 
                  ? `1px solid ${theme.palette.warning.main}` 
                  : "none",
              }}
              onClick={() => handleInsightClick(insights.recentStatus6.filteredData, 'Proposals Delivered')}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  Proposals Delivered ({insights.recentStatus6.monthName})
                </Typography>
                {getTrendIcon(insights.recentStatus6.change)}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h4" fontWeight={700} color="warning.dark">
                  {insights.recentStatus6.count}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: insights.recentStatus6.change >= 0 ? "success.main" : "error.main",
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  ({insights.recentStatus6.prevCount} | {Math.abs(Math.round(insights.recentStatus6.change))}% vs prev. month)
                </Typography>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {formatCurrency(insights.recentStatus6.revenue)}
                </Typography>
                <Typography variant="body2" color="primary.main" sx={{ mt: 0.5 }}>
                  (I&O: {formatCurrency(insights.recentStatus6.calculatedRevenue)})
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Recent Status 11 - Final Negotiation (This Month) */}
          <Grid item xs={12} sm={6} md={4}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: isActiveFilter('Final Negotiations') 
                  ? alpha(theme.palette.secondary.main, 0.15)
                  : alpha(theme.palette.secondary.main, 0.08),
                height: "100%",
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  bgcolor: alpha(theme.palette.secondary.main, 0.12),
                  transform: "translateY(-2px)",
                  boxShadow: 2,
                },
                border: isActiveFilter('Final Negotiations') 
                  ? `1px solid ${theme.palette.secondary.main}` 
                  : "none",
              }}
              onClick={() => handleInsightClick(insights.recentStatus11.filteredData, 'Final Negotiations')}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  Final Negotiations ({insights.recentStatus11.monthName})
                </Typography>
                {getTrendIcon(insights.recentStatus11.change)}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h4" fontWeight={700} color="secondary.main">
                  {insights.recentStatus11.count}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: insights.recentStatus11.change >= 0 ? "success.main" : "error.main",
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  ({insights.recentStatus11.prevCount} | {Math.abs(Math.round(insights.recentStatus11.change))}% vs prev. month)
                </Typography>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {formatCurrency(insights.recentStatus11.revenue)}
                </Typography>
                <Typography variant="body2" color="primary.main" sx={{ mt: 0.5 }}>
                  (I&O: {formatCurrency(insights.recentStatus11.calculatedRevenue)})
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Fade>
  );
};

export default PipelineInsights;
