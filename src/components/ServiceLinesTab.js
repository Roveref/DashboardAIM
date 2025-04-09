import React, { useState, useEffect } from "react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
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
  Treemap,
} from "recharts";

import OpportunityList from "./OpportunityList";
import { sumBy, groupDataBy } from "../utils/dataUtils";

// Custom colors for charts
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#4CAF50",
  "#FF5722",
];

const ServiceLinesTab = ({
  data,
  loading,
  onSelection,
  selectedOpportunities,
}) => {
  const [serviceLineData, setServiceLineData] = useState([]);
  const [serviceOfferingData, setServiceOfferingData] = useState([]);
  const [treemapData, setTreemapData] = useState([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: "revenue",
    direction: "desc",
  });

  useEffect(() => {
    if (!data || loading) return;

    // Reset filtered opportunities when data changes
    setFilteredOpportunities(data);

    // Group data by Service Line 1
    const byServiceLine = {};

    data.forEach((opp) => {
      const serviceLine = opp["Service Line 1"];
      if (!serviceLine) return;

      if (!byServiceLine[serviceLine]) {
        byServiceLine[serviceLine] = {
          name: serviceLine,
          revenue: 0,
          count: 0,
          avgSize: 0,
          pipelineCount: 0,
          pipelineRevenue: 0,
          bookingCount: 0,
          bookingRevenue: 0,
        };
      }

      byServiceLine[serviceLine].revenue += opp["Gross Revenue"] || 0;
      byServiceLine[serviceLine].count += 1;

      // Track pipeline vs booking metrics
      if (opp.Status === 14) {
        byServiceLine[serviceLine].bookingCount += 1;
        byServiceLine[serviceLine].bookingRevenue += opp["Gross Revenue"] || 0;
      } else if (opp.Status >= 1 && opp.Status <= 11) {
        byServiceLine[serviceLine].pipelineCount += 1;
        byServiceLine[serviceLine].pipelineRevenue += opp["Gross Revenue"] || 0;
      }
    });

    // Calculate average size and convert to array
    const serviceLineArray = Object.values(byServiceLine).map((item) => ({
      ...item,
      avgSize: item.count > 0 ? item.revenue / item.count : 0,
    }));

    // Sort by revenue (default)
    serviceLineArray.sort((a, b) => b.revenue - a.revenue);
    setServiceLineData(serviceLineArray);

    // Group data by Service Offering 1
    const byServiceOffering = {};

    data.forEach((opp) => {
      const serviceOffering = opp["Service Offering 1"];
      const serviceLine = opp["Service Line 1"];
      if (!serviceOffering || !serviceLine) return;

      const key = `${serviceLine} - ${serviceOffering}`;

      if (!byServiceOffering[key]) {
        byServiceOffering[key] = {
          name: serviceOffering,
          serviceLine: serviceLine,
          fullName: key,
          revenue: 0,
          count: 0,
        };
      }

      byServiceOffering[key].revenue += opp["Gross Revenue"] || 0;
      byServiceOffering[key].count += 1;
    });

    // Convert to array and sort by revenue
    const serviceOfferingArray = Object.values(byServiceOffering);
    serviceOfferingArray.sort((a, b) => b.revenue - a.revenue);
    setServiceOfferingData(serviceOfferingArray);

    // Create treemap data
    const treemapItems = [];

    Object.values(byServiceLine).forEach((serviceLine) => {
      // Find all offerings for this service line
      const offerings = serviceOfferingArray.filter(
        (item) => item.serviceLine === serviceLine.name
      );

      if (offerings.length > 0) {
        // Add service line with children (offerings)
        treemapItems.push({
          name: serviceLine.name,
          children: offerings.map((offering) => ({
            name: offering.name,
            value: offering.revenue,
            count: offering.count,
          })),
        });
      } else {
        // Add service line without children
        treemapItems.push({
          name: serviceLine.name,
          value: serviceLine.revenue,
          count: serviceLine.count,
        });
      }
    });

    setTreemapData({
      name: "Service Lines",
      children: treemapItems,
    });
  }, [data, loading]);

  const handleChartClick = (data) => {
    // Handle clicking on chart elements
    if (!data || !data.name) return;

    let filtered;

    // Check if it's a service line or service offering
    if (data.serviceLine) {
      // Service offering click
      const line = data.serviceLine;
      const offering = data.name;

      filtered = data.filter(
        (opp) =>
          opp["Service Line 1"] === line &&
          opp["Service Offering 1"] === offering
      );
    } else {
      // Service line click
      filtered = data.filter((opp) => opp["Service Line 1"] === data.name);
    }

    if (filtered && filtered.length > 0) {
      setFilteredOpportunities(filtered);
    }
  };

  // Handle table sorting
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Get sorted data for table
  const getSortedData = () => {
    const { key, direction } = sortConfig;
    return [...serviceLineData].sort((a, b) => {
      if (a[key] < b[key]) {
        return direction === "asc" ? -1 : 1;
      }
      if (a[key] > b[key]) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Card sx={{ p: 1, backgroundColor: "white", border: "1px solid #ccc" }}>
          <Typography variant="body2">{`${
            label || payload[0].name
          }`}</Typography>
          <Typography variant="body2" color="text.secondary">
            {`Revenue: ${new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(payload[0].value)}`}
          </Typography>
          {payload[0].payload && payload[0].payload.count && (
            <Typography variant="body2" color="text.secondary">
              {`Count: ${payload[0].payload.count} opportunities`}
            </Typography>
          )}
        </Card>
      );
    }
    return null;
  };

  // Custom tooltip for treemap
  const TreemapTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card sx={{ p: 1, backgroundColor: "white", border: "1px solid #ccc" }}>
          <Typography variant="body2">{data.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {`Revenue: ${new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(data.value)}`}
          </Typography>
          {data.count && (
            <Typography variant="body2" color="text.secondary">
              {`Count: ${data.count} opportunities`}
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
    <Grid container spacing={3}>
      {/* Service Line Summary Table */}
      <Grid item xs={12}>
        <Paper sx={{ width: "100%", overflow: "hidden" }}>
          <Typography variant="h6" sx={{ p: 2 }}>
            Service Line Performance
          </Typography>
          <TableContainer sx={{ maxHeight: 440 }}>
            <Table stickyHeader aria-label="service line table" size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.key === "name"}
                      direction={
                        sortConfig.key === "name" ? sortConfig.direction : "asc"
                      }
                      onClick={() => handleSort("name")}
                    >
                      Service Line
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortConfig.key === "count"}
                      direction={
                        sortConfig.key === "count"
                          ? sortConfig.direction
                          : "desc"
                      }
                      onClick={() => handleSort("count")}
                    >
                      Opportunities
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortConfig.key === "revenue"}
                      direction={
                        sortConfig.key === "revenue"
                          ? sortConfig.direction
                          : "desc"
                      }
                      onClick={() => handleSort("revenue")}
                    >
                      Total Revenue
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortConfig.key === "avgSize"}
                      direction={
                        sortConfig.key === "avgSize"
                          ? sortConfig.direction
                          : "desc"
                      }
                      onClick={() => handleSort("avgSize")}
                    >
                      Avg. Size
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortConfig.key === "pipelineCount"}
                      direction={
                        sortConfig.key === "pipelineCount"
                          ? sortConfig.direction
                          : "desc"
                      }
                      onClick={() => handleSort("pipelineCount")}
                    >
                      Pipeline Count
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortConfig.key === "pipelineRevenue"}
                      direction={
                        sortConfig.key === "pipelineRevenue"
                          ? sortConfig.direction
                          : "desc"
                      }
                      onClick={() => handleSort("pipelineRevenue")}
                    >
                      Pipeline Revenue
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortConfig.key === "bookingCount"}
                      direction={
                        sortConfig.key === "bookingCount"
                          ? sortConfig.direction
                          : "desc"
                      }
                      onClick={() => handleSort("bookingCount")}
                    >
                      Booking Count
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortConfig.key === "bookingRevenue"}
                      direction={
                        sortConfig.key === "bookingRevenue"
                          ? sortConfig.direction
                          : "desc"
                      }
                      onClick={() => handleSort("bookingRevenue")}
                    >
                      Booking Revenue
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getSortedData().map((row) => (
                  <TableRow
                    key={row.name}
                    hover
                    onClick={() => {
                      setFilteredOpportunities(
                        data.filter((opp) => opp["Service Line 1"] === row.name)
                      );
                    }}
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                      cursor: "pointer",
                    }}
                  >
                    <TableCell component="th" scope="row">
                      {row.name}
                    </TableCell>
                    <TableCell align="right">{row.count}</TableCell>
                    <TableCell align="right">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(row.revenue)}
                    </TableCell>
                    <TableCell align="right">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(row.avgSize)}
                    </TableCell>
                    <TableCell align="right">{row.pipelineCount}</TableCell>
                    <TableCell align="right">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(row.pipelineRevenue)}
                    </TableCell>
                    <TableCell align="right">{row.bookingCount}</TableCell>
                    <TableCell align="right">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(row.bookingRevenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>

      {/* Charts Row */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            Service Line Revenue (click to filter)
          </Typography>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart
              data={serviceLineData}
              margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              onClick={handleChartClick}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
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
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="revenue" name="Total Revenue" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            Top Service Offerings (click to filter)
          </Typography>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Pie
                data={serviceOfferingData.slice(0, 5)}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="revenue"
                nameKey="fullName"
                onClick={handleChartClick}
              >
                {serviceOfferingData.slice(0, 5).map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Service Line Treemap */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            Service Lines & Offerings Treemap (click to filter)
          </Typography>
          <ResponsiveContainer width="100%" height="90%">
            <Treemap
              data={treemapData}
              dataKey="value"
              aspectRatio={4 / 3}
              stroke="#fff"
              fill="#8884d8"
              onClick={handleChartClick}
            >
              <Tooltip content={<TreemapTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Opportunity List */}
      <Grid item xs={12}>
        <OpportunityList
          data={filteredOpportunities}
          title="Service Line Opportunities"
          selectedOpportunities={selectedOpportunities}
          onSelectionChange={onSelection}
        />
      </Grid>
    </Grid>
  );
};

export default ServiceLinesTab;
