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
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sankey,
  Funnel,
  FunnelChart,
  LabelList,
  Label,
} from "recharts";

import OpportunityList from "./OpportunityList";
import { sumBy, groupDataBy } from "../utils/dataUtils";

// Status mapping for better readability
const statusMap = {
  1: "1 - New Lead",
  4: "4 - Go Approved",
  6: "6 - Proposal Delivered",
  11: "11 - Final Negotiation",
};

const PipelineTab = ({ data, loading, onSelection, selectedOpportunities }) => {
  const [pipelineByStatus, setPipelineByStatus] = useState([]);
  const [pipelineByServiceLine, setPipelineByServiceLine] = useState([]);
  const [funnelData, setFunnelData] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
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

  useEffect(() => {
    if (!data || loading) return;

    // Reset filtered opportunities when data changes
    setFilteredOpportunities(data);

    // Check if we're using allocated revenue
    const isUsingAllocation =
      data.length > 0 && data[0] && data[0]["Is Allocated"];
    setIsAllocated(isUsingAllocation);

    if (isUsingAllocation && data[0]["Allocated Service Line"]) {
      setAllocatedServiceLine(data[0]["Allocated Service Line"]);
    } else {
      setAllocatedServiceLine("");
    }

    // Calculate total pipeline revenue (using allocated revenue if available)
    let total = 0;
    if (isUsingAllocation) {
      // Sum up the allocated revenue
      total = data.reduce((sum, item) => {
        return (
          sum +
          (typeof item["Allocated Gross Revenue"] === "number"
            ? item["Allocated Gross Revenue"]
            : 0)
        );
      }, 0);
    } else {
      // Use regular gross revenue
      total = data.reduce((sum, item) => {
        return (
          sum +
          (typeof item["Gross Revenue"] === "number"
            ? item["Gross Revenue"]
            : 0)
        );
      }, 0);
    }

    setTotalRevenue(total);

    // Use the appropriate revenue field for all charts
    const revenueField = isUsingAllocation
      ? "Allocated Gross Revenue"
      : "Gross Revenue";

    // Group data by status for bar chart
    const byStatus = Object.entries(groupDataBy(data, "Status"))
      .map(([status, opportunities]) => ({
        status: statusMap[status] || `Status ${status}`,
        value: sumBy(opportunities, revenueField),
        count: opportunities.length,
        statusNumber: parseInt(status, 10),
      }))
      .sort((a, b) => a.statusNumber - b.statusNumber);
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

    // Create funnel data
    const funnel = Object.entries(groupDataBy(data, "Status"))
      .map(([status, opportunities]) => ({
        name: statusMap[status] || `Status ${status}`,
        value: opportunities.length,
        revenue: sumBy(opportunities, revenueField),
        statusNumber: parseInt(status, 10),
      }))
      .sort((a, b) => a.statusNumber - b.statusNumber);
    setFunnelData(funnel);
  }, [data, loading]);

  const handleChartClick = (data, index, event) => {
    if (!data || !data.activePayload || data.activePayload.length === 0) return;

    const clickedItem = data.activePayload[0].payload;

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
            <Box
              sx={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: alpha(theme.palette.primary.main, 0.08),
                zIndex: 0,
              }}
            />
            <CardContent
              sx={{ position: "relative", zIndex: 1, height: "100%" }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Box>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Pipeline Total{" "}
                    {isAllocated && `(${allocatedServiceLine} allocation)`}
                  </Typography>
                  <Typography
                    variant="h4"
                    component="div"
                    fontWeight={700}
                    sx={{ mb: 1 }}
                  >
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(totalRevenue)}
                  </Typography>
                  {isAllocated && (
                    <Chip
                      label={`${allocatedServiceLine} allocation`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                      sx={{ mb: 1 }}
                    />
                  )}
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {data.length} opportunities in pipeline
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
              position: "relative",
              overflow: "hidden",
              borderRadius: 3,
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: alpha(theme.palette.secondary.main, 0.08),
                zIndex: 0,
              }}
            />
            <CardContent
              sx={{ position: "relative", zIndex: 1, height: "100%" }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Box>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Average Opportunity Size
                  </Typography>
                  <Typography
                    variant="h4"
                    component="div"
                    fontWeight={700}
                    sx={{ mb: 1 }}
                  >
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(data.length > 0 ? totalRevenue / data.length : 0)}
                  </Typography>
                  {isAllocated && (
                    <Chip
                      label={`${allocatedServiceLine} allocation`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                      sx={{ mb: 1 }}
                    />
                  )}
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Per opportunity value
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
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 2,
                }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  Pipeline by Stage
                </Typography>
                {isAllocated && (
                  <Chip
                    label={`${allocatedServiceLine} allocation`}
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                )}
              </Box>

              <Box>
                {pipelineByStatus.map((item, index) => (
                  <Box key={item.status} sx={{ mb: 1.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="body2" fontWeight={500}>
                        {item.status}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.count} opps
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Box sx={{ flex: 1, mr: 1 }}>
                        <Box
                          sx={{
                            height: 8,
                            borderRadius: 4,
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
                              width: `${(item.value / totalRevenue) * 100}%`,
                              bgcolor: COLORS[index % COLORS.length],
                              borderRadius: 4,
                            }}
                          />
                        </Box>
                      </Box>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{ minWidth: 36 }}
                      >
                        {new Intl.NumberFormat("en-US", {
                          style: "percent",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(item.value / totalRevenue)}
                      </Typography>
                    </Box>
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
              {isAllocated && (
                <Chip
                  label={`${allocatedServiceLine} allocation`}
                  size="small"
                  color="secondary"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart
                data={pipelineByStatus}
                margin={{ top: 10, right: 30, left: 0, bottom: 40 }}
                onClick={handleChartClick}
                barSize={40}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="status"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  tickMargin={5}
                  axisLine={false}
                  tickLine={false}
                />
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
                <Bar
                  dataKey="value"
                  name="Revenue"
                  fill={theme.palette.primary.main}
                  radius={[4, 4, 0, 0]}
                >
                  {pipelineByStatus.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
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
              {isAllocated && (
                <Chip
                  label={`${allocatedServiceLine} allocation`}
                  size="small"
                  color="secondary"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Pie
                  data={pipelineByServiceLine}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={handleChartClick}
                >
                  {pipelineByServiceLine.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke={theme.palette.background.paper}
                      strokeWidth={2}
                    />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      const { cx, cy } = viewBox;
                      return (
                        <text
                          x={cx}
                          y={cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontFamily: theme.typography.fontFamily }}
                        >
                          <tspan
                            x={cx}
                            dy="-0.5em"
                            fontSize="14"
                            fontWeight="600"
                            fill={theme.palette.text.primary}
                          >
                            Total
                          </tspan>
                          <tspan
                            x={cx}
                            dy="1.5em"
                            fontSize="12"
                            fill={theme.palette.text.secondary}
                          >
                            {data.length} opportunities
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ paddingLeft: 20 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Sales Funnel */}
        <Grid item xs={12}>
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
                  Pipeline Funnel
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Opportunity progression through pipeline stages
                </Typography>
              </div>
              {isAllocated && (
                <Chip
                  label={`${allocatedServiceLine} allocation`}
                  size="small"
                  color="secondary"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
            <ResponsiveContainer width="100%" height="85%">
              <FunnelChart>
                <Tooltip content={<CustomTooltip />} />
                <Funnel
                  dataKey="revenue"
                  data={funnelData}
                  isAnimationActive
                  onClick={handleChartClick}
                  nameKey="name"
                >
                  <LabelList
                    position="right"
                    fill={theme.palette.text.primary}
                    stroke="none"
                    dataKey="name"
                    style={{ fontWeight: 500 }}
                  />
                  {funnelData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Opportunity List */}
        <Grid item xs={12}>
          <OpportunityList
            data={filteredOpportunities}
            title="Pipeline Opportunities"
            selectedOpportunities={selectedOpportunities}
            onSelectionChange={onSelection}
          />
        </Grid>
      </Grid>
    </Fade>
  );
};

export default PipelineTab;
