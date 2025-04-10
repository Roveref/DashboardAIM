import React, { useState, useEffect } from "react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  useTheme,
  alpha,
  Fade,
  Chip,
  Stack,
} from "@mui/material";
import {
  BarChart,
  Bar,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label,
} from "recharts";
import OpportunityList from "./OpportunityList";
import { sumBy, groupDataBy } from "../utils/dataUtils";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";

// Status mapping for better readability
const statusMap = {
  1: "1 - New Lead",
  4: "4 - Go Approved",
  6: "6 - Proposal Delivered",
  11: "11 - Final Negotiation",
};

// Define all possible statuses to ensure complete representation
const ALL_STATUSES = [
  { status: "1 - New Lead", statusNumber: 1 },
  { status: "4 - Go Approved", statusNumber: 4 },
  { status: "6 - Proposal Delivered", statusNumber: 6 },
  { status: "11 - Final Negotiation", statusNumber: 11 },
];

const PipelineTab = ({ data, loading, onSelection, selectedOpportunities }) => {
  const [pipelineByStatus, setPipelineByStatus] = useState([]);
  const [pipelineByServiceLine, setPipelineByServiceLine] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [allocatedRevenue, setAllocatedRevenue] = useState(0);
  const [filteredOpportunities, setFilteredOpportunities] = useState([]);
  const theme = useTheme();
  const [isAllocated, setIsAllocated] = useState(false);
  const [allocatedServiceLine, setAllocatedServiceLine] = useState("");

  // Custom colors for charts
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.main,
    "#8884d8",
  ];
  const prepareStackedServiceLineData = () => {
    // Create a map for status categories
    const statusCategories = {
      early: [1], // Early pipeline (New Lead)
      mid: [4, 6], // Mid pipeline (Go Approved, Proposal Delivered)
      late: [11], // Late pipeline (Final Negotiation)
    };

    // Group by service line first
    const serviceLineGroups = {};

    filteredOpportunities.forEach((opp) => {
      const serviceLine = opp["Service Line 1"] || "Uncategorized";
      if (!serviceLineGroups[serviceLine]) {
        serviceLineGroups[serviceLine] = {
          name: serviceLine,
          early: 0,
          mid: 0,
          late: 0,
          total: 0,
        };
      }

      // Add to the right status category
      if (statusCategories.early.includes(opp.Status)) {
        serviceLineGroups[serviceLine].early += opp["Gross Revenue"] || 0;
      } else if (statusCategories.mid.includes(opp.Status)) {
        serviceLineGroups[serviceLine].mid += opp["Gross Revenue"] || 0;
      } else if (statusCategories.late.includes(opp.Status)) {
        serviceLineGroups[serviceLine].late += opp["Gross Revenue"] || 0;
      }

      // Add to total
      serviceLineGroups[serviceLine].total += opp["Gross Revenue"] || 0;
    });

    // Convert to array and sort by total
    return Object.values(serviceLineGroups).sort((a, b) => b.total - a.total);
  };

  // Then in your render method:
  const stackedServiceLineData = prepareStackedServiceLineData();
  const calculateMedianOpportunitySize = (opportunities) => {
    if (!opportunities || opportunities.length === 0) return 0;

    // Get revenue values and sort them
    const revenueValues = opportunities
      .map((opp) => {
        return opp["Is Allocated"]
          ? opp["Allocated Gross Revenue"] || 0
          : opp["Gross Revenue"] || 0;
      })
      .sort((a, b) => a - b);

    const len = revenueValues.length;

    // Calculate median
    let median;
    if (len % 2 === 0) {
      // Even number of items
      median = (revenueValues[len / 2 - 1] + revenueValues[len / 2]) / 2;
    } else {
      // Odd number of items
      median = revenueValues[Math.floor(len / 2)];
    }

    return median;
  };
  const calculateFilteredMedianOpportunitySize = (opportunities) => {
    if (!opportunities || opportunities.length === 0) return 0;

    // Get allocated revenue values and sort them
    const revenueValues = opportunities
      .map((opp) => {
        // Use allocated revenue values for the filtered median
        return opp["Allocated Gross Revenue"] || 0;
      })
      .sort((a, b) => a - b);

    const len = revenueValues.length;

    // Calculate median
    let median;
    if (len % 2 === 0) {
      // Even number of items
      median = (revenueValues[len / 2 - 1] + revenueValues[len / 2]) / 2;
    } else {
      // Odd number of items
      median = revenueValues[Math.floor(len / 2)];
    }

    return median;
  };
  const calculateSizeDistribution = (opportunities) => {
    // Define size ranges
    const ranges = [
      {
        name: "< €100K",
        min: 0,
        max: 100000,
        count: 0,
        value: 0,
        color: theme.palette.primary.light,
      },
      {
        name: "€100K-€500K",
        min: 100000,
        max: 500000,
        count: 0,
        value: 0,
        color: theme.palette.primary.main,
      },
      {
        name: "> €500K",
        min: 500000,
        max: Infinity,
        count: 0,
        value: 0,
        color: theme.palette.primary.dark,
      },
    ];

    // Calculate counts and values for each range
    opportunities.forEach((opp) => {
      const revenue = opp["Is Allocated"]
        ? opp["Allocated Gross Revenue"] || 0
        : opp["Gross Revenue"] || 0;

      for (const range of ranges) {
        if (revenue >= range.min && revenue < range.max) {
          range.count++;
          range.value += revenue;
          break;
        }
      }
    });

    // Calculate percentages
    const totalValue = ranges.reduce((sum, range) => sum + range.value, 0);
    ranges.forEach((range) => {
      range.percentage = totalValue > 0 ? (range.value / totalValue) * 100 : 0;
    });

    return ranges;
  };
  useEffect(() => {
    if (!data || loading) return;

    // Reset filtered opportunities when data changes
    setFilteredOpportunities(data);

    // Check if we're using allocated revenue
    const hasAllocatedData =
      data.length > 0 &&
      data.some(
        (item) =>
          item["Allocated Gross Revenue"] !== undefined ||
          (item["Allocation Percentage"] !== undefined &&
            item["Gross Revenue"] !== undefined)
      );

    const isUsingAllocation =
      hasAllocatedData && data[0] && data[0]["Allocated Service Line"];
    setIsAllocated(isUsingAllocation);

    // Find the service line being allocated
    if (isUsingAllocation) {
      const allocatedItem = data.find(
        (item) =>
          item["Allocated Service Line"] ||
          item["Allocation Percentage"] !== undefined
      );

      if (allocatedItem && allocatedItem["Allocated Service Line"]) {
        setAllocatedServiceLine(allocatedItem["Allocated Service Line"]);
      } else if (allocatedItem && allocatedItem["Service Line 1"]) {
        setAllocatedServiceLine(allocatedItem["Service Line 1"]);
      } else {
        setAllocatedServiceLine("");
      }
    } else {
      setAllocatedServiceLine("");
    }

    // Calculate both total pipeline revenue and allocated revenue
    let total = 0;
    let allocated = 0;

    data.forEach((item) => {
      const grossRevenue =
        typeof item["Gross Revenue"] === "number" ? item["Gross Revenue"] : 0;
      total += grossRevenue;

      const allocatedGrossRevenue =
        typeof item["Allocated Gross Revenue"] === "number"
          ? item["Allocated Gross Revenue"]
          : 0;
      allocated += allocatedGrossRevenue;
    });

    setTotalRevenue(total);
    setAllocatedRevenue(allocated);

    // Use the appropriate revenue field for all charts
    const revenueField = isUsingAllocation
      ? "Allocated Gross Revenue"
      : "Gross Revenue";

    // Modified to ensure ALL statuses are represented
    const byStatus = ALL_STATUSES.map((statusInfo) => {
      // Find opportunities for this specific status
      const opportunities = data.filter(
        (item) => item["Status"] === statusInfo.statusNumber
      );

      // Calculate total revenue for this status
      const value = opportunities.reduce((sum, item) => {
        const revenue = isUsingAllocation
          ? item["Allocated Gross Revenue"] || 0
          : item["Gross Revenue"] || 0;
        return sum + revenue;
      }, 0);

      return {
        status: statusInfo.status,
        value: value,
        count: opportunities.length,
        statusNumber: statusInfo.statusNumber,
      };
    });

    setPipelineByStatus(byStatus);

    // Group data by service line for pie chart
    const byServiceLine = Object.entries(groupDataBy(data, "Service Line 1"))
      .map(([serviceLine, opportunities]) => ({
        name: serviceLine,
        value: sumBy(opportunities, revenueField),
        count: opportunities.length,
      }))
      .sort((a, b) => b.value - a.value); // Sort by value descending
    setPipelineByServiceLine(byServiceLine);
  }, [data, loading]);

  const handleChartClick = (chartEvent) => {
    if (
      !chartEvent ||
      !chartEvent.activePayload ||
      chartEvent.activePayload.length === 0
    )
      return;

    const clickedItem = chartEvent.activePayload[0].payload;

    // Filter opportunities based on clicked chart segment
    let filtered;

    if (clickedItem.status) {
      // Clicked on status chart
      const statusNumber = parseInt(clickedItem.status.split(" ")[0]);
      filtered = data.filter((opp) => opp.Status === statusNumber);
    } else if (clickedItem.name) {
      // Clicked on service line chart
      filtered = data.filter(
        (opp) => opp["Service Line 1"] === clickedItem.name
      );
    }

    if (filtered && filtered.length > 0) {
      setFilteredOpportunities(filtered);
    }
  };

  // Calculate allocation percentage, handling the 100% case
  const allocationPercentage =
    totalRevenue > 0 && isAllocated
      ? Math.abs((allocatedRevenue / totalRevenue) * 100)
      : isAllocated
      ? 100
      : 0; // If we have allocation but can't calculate, assume 100%

  // Custom tooltip for revenue charts
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
            maxWidth: 200,
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
            {`${label || payload[0].name}`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {`Revenue: ${new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(payload[0].value)}`}
          </Typography>
          {payload[0].payload.count && (
            <Typography variant="body2" color="text.secondary">
              {`Count: ${payload[0].payload.count} opportunities`}
            </Typography>
          )}
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
        {/* Summary Cards - First Row */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: "100%",
              transition: "all 0.3s",
              "&:hover": {
                boxShadow: 6,
                transform: "translateY(-4px)",
              },
              position: "relative",
              overflow: "hidden",
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: 3, height: "100%" }}>
              {/* Card Title */}
              <Typography
                variant="h6"
                fontWeight={700}
                color="primary.main"
                gutterBottom
              >
                {isAllocated ? "Filtered Pipeline" : "Pipeline Overview"}
              </Typography>

              <Divider sx={{ my: 2 }} />

              {/* Pipeline Values - Total and Allocated on the same row with arrow */}
              <Box sx={{ mt: 3, mb: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    position: "relative",
                  }}
                >
                  {/* Total Pipeline */}
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Total Pipeline Value
                    </Typography>
                    <Typography
                      variant="h4"
                      component="div"
                      fontWeight={700}
                      color="text.primary"
                    >
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(totalRevenue)}
                    </Typography>
                  </Box>

                  {/* Center arrow with percentage - only when allocation is active */}
                  {isAllocated && (
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
                        {allocationPercentage === 100
                          ? "100%"
                          : `${allocationPercentage.toFixed(0)}%`}
                      </Typography>
                      <ArrowRightAltIcon color="secondary" fontSize="small" />
                    </Box>
                  )}

                  {/* Filtered Value - only when allocation is active */}
                  {isAllocated ? (
                    <Box sx={{ flex: 1, textAlign: "right" }}>
                      <Typography
                        variant="body2"
                        color="secondary.main"
                        gutterBottom
                      >
                        Filtered Pipeline Value
                      </Typography>
                      <Typography
                        variant="h4"
                        component="div"
                        color="secondary.main"
                        fontWeight={700}
                      >
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(allocatedRevenue)}
                      </Typography>
                    </Box>
                  ) : (
                    // Placeholder to maintain consistent layout
                    <Box sx={{ flex: 1 }}></Box>
                  )}
                </Box>
              </Box>

              {/* New section: Pipeline breakdown by size ranges */}
              <Box sx={{ mt: 3 }}>
                <Typography
                  variant="subtitle2"
                  fontWeight={600}
                  color="text.primary"
                  gutterBottom
                >
                  Pipeline Size Breakdown
                </Typography>

                {calculateSizeDistribution(filteredOpportunities).map(
                  (range, index) => (
                    <Box key={range.name} sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 0.5,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              bgcolor: range.color,
                              mr: 1,
                            }}
                          />
                          <Typography variant="body2" fontWeight={500}>
                            {range.name}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {range.count} opps
                        </Typography>
                      </Box>

                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 0.5 }}
                      >
                        <Box sx={{ flex: 1, mr: 1 }}>
                          <Box
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              bgcolor: alpha(range.color, 0.15),
                              position: "relative",
                              overflow: "hidden",
                            }}
                          >
                            <Box
                              sx={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                height: "100%",
                                width: `${range.percentage}%`,
                                bgcolor: range.color,
                                borderRadius: 4,
                              }}
                            />
                          </Box>
                        </Box>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ minWidth: 40, textAlign: "right" }}
                        >
                          {range.percentage.toFixed(0)}%
                        </Typography>
                      </Box>

                      <Typography variant="body2" color="text.secondary">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(range.value)}
                      </Typography>
                    </Box>
                  )
                )}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mt: 3,
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  borderRadius: 2,
                  p: 1.5,
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={500}
                >
                  {data.length} opportunities in pipeline
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        {/* Average Opportunity Size Card */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: "100%",
              transition: "all 0.3s",
              "&:hover": {
                boxShadow: 6,
                transform: "translateY(-4px)",
              },
              position: "relative",
              overflow: "hidden",
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: 3, height: "100%" }}>
              {/* Card Title */}
              <Typography
                variant="h6"
                fontWeight={700}
                color="primary.main"
                gutterBottom
              >
                Opportunity Size Analysis
              </Typography>

              <Divider sx={{ my: 2 }} />

              {/* Average and Filtered Average in a row */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mt: 3,
                  mb: 3,
                }}
              >
                {/* Average */}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Average Opportunity Size
                  </Typography>
                  <Typography
                    variant="h4"
                    component="div"
                    fontWeight={700}
                    color="text.primary"
                  >
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(
                      filteredOpportunities.length > 0
                        ? totalRevenue / filteredOpportunities.length
                        : 0
                    )}
                  </Typography>
                </Box>

                {/* Filtered Average - only shown when allocation is active */}
                {isAllocated && (
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
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(
                        filteredOpportunities.length > 0
                          ? allocatedRevenue / filteredOpportunities.length
                          : 0
                      )}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Median and Filtered Median in a row */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 3,
                }}
              >
                {/* Regular Median */}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Median Opportunity Size
                  </Typography>
                  <Typography
                    variant="h4"
                    component="div"
                    fontWeight={700}
                    color={theme.palette.info.main}
                  >
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(
                      calculateMedianOpportunitySize(filteredOpportunities)
                    )}
                  </Typography>
                </Box>

                {/* Filtered Median - only shown when allocation is active */}
                {isAllocated && (
                  <Box sx={{ flex: 1, textAlign: "right" }}>
                    <Typography
                      variant="body2"
                      color={theme.palette.info.dark}
                      gutterBottom
                    >
                      Filtered Median
                    </Typography>
                    <Typography
                      variant="h4"
                      component="div"
                      color={theme.palette.info.dark}
                      fontWeight={700}
                    >
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(
                        calculateFilteredMedianOpportunitySize(
                          filteredOpportunities
                        )
                      )}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Comparison box - analysis of average vs median */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.info.main, 0.08),
                  mb: 3,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {calculateMedianOpportunitySize(filteredOpportunities) >
                  (filteredOpportunities.length > 0
                    ? totalRevenue / filteredOpportunities.length
                    : 0)
                    ? "Median higher than average suggests a few smaller opportunities pulling the average down."
                    : "Median lower than average suggests a few larger opportunities pulling the average up."}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mt: 3,
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  borderRadius: 2,
                  p: 1.5,
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={500}
                >
                  From {filteredOpportunities.length} opportunities
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: "100%",
              transition: "all 0.3s",
              "&:hover": {
                boxShadow: 6,
                transform: "translateY(-4px)",
              },
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: 3, height: "100%" }}>
              <Typography
                variant="h6"
                fontWeight={700}
                color="primary.main"
                gutterBottom
              >
                Pipeline by Stage
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mt: 2 }}>
                {pipelineByStatus.map((item, index) => (
                  <Box key={item.status} sx={{ mb: 2.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        {item.status}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Typography
                          variant="body2"
                          fontWeight={500}
                          sx={{
                            mr: 1,
                            color: COLORS[index % COLORS.length],
                          }}
                        >
                          {new Intl.NumberFormat("en-US", {
                            style: "percent",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(
                            item.value /
                              (isAllocated ? allocatedRevenue : totalRevenue) ||
                              0
                          )}
                        </Typography>
                        <Chip
                          label={`${item.count} opps`}
                          size="small"
                          sx={{
                            height: "20px",
                            fontSize: "0.7rem",
                            backgroundColor: alpha(
                              COLORS[index % COLORS.length],
                              0.12
                            ),
                            color: COLORS[index % COLORS.length],
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Box sx={{ flex: 1, mr: 1 }}>
                        <Box
                          sx={{
                            height: 10,
                            borderRadius: 5,
                            bgcolor: alpha(COLORS[index % COLORS.length], 0.15),
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          <Box
                            sx={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              height: "100%",
                              width: `${
                                (item.value /
                                  (isAllocated
                                    ? allocatedRevenue
                                    : totalRevenue)) *
                                  100 || 0
                              }%`,
                              bgcolor: COLORS[index % COLORS.length],
                              borderRadius: 5,
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(item.value)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts Row */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              height: 400,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
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
              <div>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Pipeline by Status
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click on chart segments to filter opportunities
                </Typography>
              </div>
              {/* No conditional chips here */}
            </Box>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart
                data={stackedServiceLineData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  type="number"
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
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => [
                    new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(value),
                    "Revenue",
                  ]}
                />
                <Legend />
                <Bar
                  dataKey="early"
                  name="Early Pipeline"
                  stackId="a"
                  fill={theme.palette.primary.light}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="mid"
                  name="Mid Pipeline"
                  stackId="a"
                  fill={theme.palette.primary.main}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="late"
                  name="Late Pipeline"
                  stackId="a"
                  fill={theme.palette.primary.dark}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              height: 400,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
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
              <div>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Pipeline by Service Line
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Distribution of revenue across service lines
                </Typography>
              </div>
              {/* No conditional chips here */}
            </Box>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart
                data={pipelineByServiceLine}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                onClick={handleChartClick}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  type="number"
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
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Revenue" radius={[0, 4, 4, 0]}>
                  {pipelineByServiceLine.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    formatter={(value) => `${value} opps`}
                    style={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        {/* Opportunity List - With increased vertical space and 25 rows by default */}
        <Grid item xs={12}>
          <Box>
            <OpportunityList
              data={filteredOpportunities}
              title="Pipeline Opportunities"
              selectedOpportunities={selectedOpportunities}
              onSelectionChange={onSelection}
              resetFilterCallback={
                isAllocated || filteredOpportunities.length !== data.length
                  ? () => setFilteredOpportunities(data)
                  : null
              }
              isFiltered={
                isAllocated || filteredOpportunities.length !== data.length
              }
            />
          </Box>
        </Grid>
      </Grid>
    </Fade>
  );
};

export default PipelineTab;
