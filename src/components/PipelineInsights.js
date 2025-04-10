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

/**
 * Component that analyzes pipeline data and generates insights
 * Customized to show specific status changes
 */
const PipelineInsights = ({ data, isFiltered }) => {
  const theme = useTheme();
  const [insights, setInsights] = useState({
    newOpportunities: { count: 0, revenue: 0, change: 0 },
    recentStatus6: { count: 0, revenue: 0, change: 0 },
    recentStatus11: { count: 0, revenue: 0, change: 0 },
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
      // Current date for reference
      const currentDate = new Date();
      const oneMonthAgo = new Date(
        currentDate.getTime() - 30 * 24 * 60 * 60 * 1000
      );
      const twoMonthsAgo = new Date(
        currentDate.getTime() - 60 * 24 * 60 * 60 * 1000
      );

      // All new opportunities this month (regardless of status)
      const newOpportunitiesThisMonth = opportunityData.filter((opp) => {
        const creationDate = new Date(opp["Creation Date"]);
        return creationDate >= oneMonthAgo && creationDate <= currentDate;
      });

      // New opportunities in the previous month
      const newOpportunitiesPreviousMonth = opportunityData.filter((opp) => {
        const creationDate = new Date(opp["Creation Date"]);
        return creationDate >= twoMonthsAgo && creationDate < oneMonthAgo;
      });

      // Calculate change percentage for new opportunities
      const newOpportunitiesChange =
        newOpportunitiesPreviousMonth.length > 0
          ? ((newOpportunitiesThisMonth.length -
              newOpportunitiesPreviousMonth.length) /
              newOpportunitiesPreviousMonth.length) *
            100
          : 100;

      // Recent moves to Status 6 (Proposal Delivered)
      const recentStatus6 = opportunityData.filter((opp) => {
        const statusDate = new Date(opp["Last Status Change Date"]);
        return (
          statusDate >= oneMonthAgo &&
          statusDate <= currentDate &&
          opp.Status === 6 // Status 6 - Proposal Delivered
        );
      });

      // Previous period Status 6 moves
      const previousStatus6 = opportunityData.filter((opp) => {
        const statusDate = new Date(opp["Last Status Change Date"]);
        return (
          statusDate >= twoMonthsAgo &&
          statusDate < oneMonthAgo &&
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
          statusDate >= oneMonthAgo &&
          statusDate <= currentDate &&
          opp.Status === 11 // Status 11 - Final Negotiation
        );
      });

      // Previous period Status 11 moves
      const previousStatus11 = opportunityData.filter((opp) => {
        const statusDate = new Date(opp["Last Status Change Date"]);
        return (
          statusDate >= twoMonthsAgo &&
          statusDate < oneMonthAgo &&
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

      // Sum up the revenues
      const newOpportunitiesRevenue = newOpportunitiesThisMonth.reduce(
        (sum, opp) => sum + (opp["Gross Revenue"] || 0),
        0
      );
      const recentStatus6Revenue = recentStatus6.reduce(
        (sum, opp) => sum + (opp["Gross Revenue"] || 0),
        0
      );
      const recentStatus11Revenue = recentStatus11.reduce(
        (sum, opp) => sum + (opp["Gross Revenue"] || 0),
        0
      );

      // Set insights state
      setInsights({
        newOpportunities: {
          count: newOpportunitiesThisMonth.length,
          revenue: newOpportunitiesRevenue,
          change: newOpportunitiesChange,
        },
        recentStatus6: {
          count: recentStatus6.length,
          revenue: recentStatus6Revenue,
          change: status6Change,
        },
        recentStatus11: {
          count: recentStatus11.length,
          revenue: recentStatus11Revenue,
          change: status11Change,
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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
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
            label={`As of ${new Date().toLocaleDateString()}`}
            size="small"
            variant="outlined"
            color="primary"
          />
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          {/* New Opportunities - Last 30 Days */}
          <Grid item xs={12} sm={6} md={4}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.info.main, 0.08),
                height: "100%",
              }}
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
                  New Opps (Last 30 Days)
                </Typography>
                {getTrendIcon(insights.newOpportunities.change)}
              </Box>

              <Typography variant="h4" fontWeight={700} color="info.main">
                {insights.newOpportunities.count}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                {formatCurrency(insights.newOpportunities.revenue)}
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                {insights.newOpportunities.change > 0 ? (
                  <ArrowUpwardIcon
                    fontSize="small"
                    color="success"
                    sx={{ mr: 0.5 }}
                  />
                ) : (
                  <ArrowDownwardIcon
                    fontSize="small"
                    color="error"
                    sx={{ mr: 0.5 }}
                  />
                )}
                <Typography
                  variant="caption"
                  color={
                    insights.newOpportunities.change >= 0
                      ? "success.main"
                      : "error.main"
                  }
                  fontWeight={500}
                >
                  {Math.abs(Math.round(insights.newOpportunities.change))}% vs
                  previous month
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Recent Status 6 - Proposal Delivered (Last 30 Days) */}
          <Grid item xs={12} sm={6} md={4}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.warning.main, 0.08),
                height: "100%",
              }}
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
                  Proposals Delivered (Last 30 Days)
                </Typography>
                {getTrendIcon(insights.recentStatus6.change)}
              </Box>

              <Typography variant="h4" fontWeight={700} color="warning.dark">
                {insights.recentStatus6.count}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                {formatCurrency(insights.recentStatus6.revenue)}
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                {insights.recentStatus6.change > 0 ? (
                  <ArrowUpwardIcon
                    fontSize="small"
                    color="success"
                    sx={{ mr: 0.5 }}
                  />
                ) : (
                  <ArrowDownwardIcon
                    fontSize="small"
                    color="error"
                    sx={{ mr: 0.5 }}
                  />
                )}
                <Typography
                  variant="caption"
                  color={
                    insights.recentStatus6.change >= 0
                      ? "success.main"
                      : "error.main"
                  }
                  fontWeight={500}
                >
                  {Math.abs(Math.round(insights.recentStatus6.change))}% vs
                  previous month
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Recent Status 11 - Final Negotiation (Last 30 Days) */}
          <Grid item xs={12} sm={6} md={4}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.secondary.main, 0.08),
                height: "100%",
              }}
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
                  Final Negotiations (Last 30 Days)
                </Typography>
                {getTrendIcon(insights.recentStatus11.change)}
              </Box>

              <Typography variant="h4" fontWeight={700} color="secondary.main">
                {insights.recentStatus11.count}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                {formatCurrency(insights.recentStatus11.revenue)}
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                {insights.recentStatus11.change > 0 ? (
                  <ArrowUpwardIcon
                    fontSize="small"
                    color="success"
                    sx={{ mr: 0.5 }}
                  />
                ) : (
                  <ArrowDownwardIcon
                    fontSize="small"
                    color="error"
                    sx={{ mr: 0.5 }}
                  />
                )}
                <Typography
                  variant="caption"
                  color={
                    insights.recentStatus11.change >= 0
                      ? "success.main"
                      : "error.main"
                  }
                  fontWeight={500}
                >
                  {Math.abs(Math.round(insights.recentStatus11.change))}% vs
                  previous month
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
