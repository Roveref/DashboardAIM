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
  Divider,
  useTheme,
  alpha,
  Fade,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Bar,
  BarChart,
  Cell,
} from "recharts";
import InfoIcon from "@mui/icons-material/Info";
import PersonIcon from "@mui/icons-material/Person";
import BarChartIcon from "@mui/icons-material/BarChart";
import TimelineIcon from "@mui/icons-material/Timeline";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

/**
 * StaffingTab component for visualizing team utilization data
 * Displays utilization rates over time, employee comparisons and detailed metrics
 */
const StaffingTab = ({ data, loading, currentFile, filters = {} }) => {
  const theme = useTheme();
  const [activeSubTab, setActiveSubTab] = useState(0);
  const [sortConfig, setSortConfig] = useState({
    key: "averageUtilization",
    direction: "desc",
  });
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [filteredData, setFilteredData] = useState(null);
  const [activeSegment, setActiveSegment] = useState("All");
  const [highlightedEmployee, setHighlightedEmployee] = useState(null);

  // Handle data loading and filtering
  useEffect(() => {
    if (!data || loading) return;

    // Set default selected period to the most recent
    if (data.periods && data.periods.length > 0) {
      setSelectedPeriod(data.periods[data.periods.length - 1].id);
    }

    // Process filters to determine which data segment to use
    let dataToUse = data;

    // Check if we need to filter by segment
    if (filters.subSegmentCodes && filters.subSegmentCodes.includes("CLR")) {
      // Use CLR segment data if available
      if (data.segmentData && data.segmentData.CLR) {
        dataToUse = {
          ...data,
          utilizationData: data.segmentData.CLR.utilizationData,
          employees: data.segmentData.CLR.employees,
          teamAverages: data.segmentData.CLR.teamAverages,
        };
        setActiveSegment("CLR");
      }
    } else if (filters.subSegmentCodes && filters.subSegmentCodes.length > 0) {
      // Find if any other segments match
      const segmentCode = filters.subSegmentCodes[0];
      if (data.segmentData && data.segmentData[segmentCode]) {
        dataToUse = {
          ...data,
          utilizationData: data.segmentData[segmentCode].utilizationData,
          employees: data.segmentData[segmentCode].employees,
          teamAverages: data.segmentData[segmentCode].teamAverages,
        };
        setActiveSegment(segmentCode);
      }
    } else {
      setActiveSegment("All");
    }

    setFilteredData(dataToUse);
  }, [data, loading, filters]);

  const handleSubTabChange = (event, newValue) => {
    setActiveSubTab(newValue);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handlePeriodChange = (event) => {
    setSelectedPeriod(event.target.value);
  };

  const handleEmployeeHighlight = (employeeId) => {
    setHighlightedEmployee(
      highlightedEmployee === employeeId ? null : employeeId
    );
  };

  // Prepare data for the table view
  const getEmployeeTableData = () => {
    if (!filteredData || !filteredData.utilizationData) return [];

    return filteredData.utilizationData.map((employee) => {
      // Calculate average utilization across all periods
      const totalChargeable = employee.periods.reduce(
        (sum, period) => sum + period.chargeableHours,
        0
      );
      const totalAvailable = employee.periods.reduce(
        (sum, period) => sum + period.totalHours,
        0
      );
      const averageUtilization =
        totalAvailable > 0 ? (totalChargeable / totalAvailable) * 100 : 0;

      // Get current period data if selected
      let currentPeriodData = null;
      if (selectedPeriod) {
        currentPeriodData = employee.periods.find(
          (p) => p.periodId === selectedPeriod
        );
      }

      return {
        employeeId: employee.employeeId,
        nom: employee.nom || employee.employeeId,
        role: employee.role || "N/A",
        equipe: employee.equipe || "N/A",
        averageUtilization: parseFloat(averageUtilization.toFixed(2)),
        totalChargeable,
        totalAvailable,
        currentPeriod: currentPeriodData
          ? {
              utilizationRate: currentPeriodData.utilizationRate,
              chargeableHours: currentPeriodData.chargeableHours,
              totalHours: currentPeriodData.totalHours,
            }
          : null,
      };
    });
  };

  // Sort employee data based on current sort config
  const getSortedEmployeeData = () => {
    const employeeData = getEmployeeTableData();
    return [...employeeData].sort((a, b) => {
      // Handle nested properties for current period
      if (sortConfig.key.startsWith("currentPeriod.")) {
        const nestedKey = sortConfig.key.split(".")[1];
        const aValue = a.currentPeriod ? a.currentPeriod[nestedKey] || 0 : 0;
        const bValue = b.currentPeriod ? b.currentPeriod[nestedKey] || 0 : 0;

        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }

      // Regular properties
      const aValue = a[sortConfig.key] || 0;
      const bValue = b[sortConfig.key] || 0;

      return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
    });
  };

  // Prepare data for the line chart - only show aggregated TU
  const getLineChartData = () => {
    // Use filteredData instead of directly using data
    if (!filteredData || !filteredData.periods || !filteredData.utilizationData)
      return [];

    return filteredData.periods.map((period) => {
      // Get the team average from pre-calculated data based on current filter
      const teamAverage = filteredData.teamAverages.find(
        (avg) => avg.periodId === period.id
      );

      return {
        name: period.label,
        utilizationRate: teamAverage?.averageUtilizationRate || 0,
        chargeableHours: teamAverage?.totalChargeableHours || 0,
        totalHours: teamAverage?.totalAvailableHours || 0,
      };
    });
  };

  // Calculate top performers for the selected period
  const getTopPerformers = () => {
    if (!selectedPeriod || !filteredData || !filteredData.utilizationData)
      return [];

    const periodData = filteredData.utilizationData.map((employee) => {
      const periodInfo = employee.periods.find(
        (p) => p.periodId === selectedPeriod
      );
      return {
        employeeId: employee.employeeId,
        nom: employee.nom || employee.employeeId,
        role: employee.role || "N/A",
        equipe: employee.equipe || "N/A",
        utilizationRate: periodInfo ? periodInfo.utilizationRate : 0,
        chargeableHours: periodInfo ? periodInfo.chargeableHours : 0,
        totalHours: periodInfo ? periodInfo.totalHours : 0,
      };
    });

    return periodData
      .sort((a, b) => b.utilizationRate - a.utilizationRate)
      .slice(0, 5);
  };

  // Custom tooltip for the utilization chart
  const UtilizationTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Extract the data for the period
      const periodData = payload[0].payload;

      return (
        <Card
          sx={{
            p: 1.5,
            backgroundColor: "white",
            boxShadow: theme.shadows[3],
            borderRadius: 1,
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            {label} Period
          </Typography>

          <Box sx={{ mb: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  backgroundColor: payload[0].color,
                  borderRadius: "50%",
                  mr: 1,
                }}
              />
              <Typography variant="body2" sx={{ mr: 1 }}>
                Utilization Rate (TU):
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {periodData.utilizationRate.toFixed(1)}%
              </Typography>
            </Box>

            <Divider sx={{ my: 1 }} />

            <Typography variant="body2" color="text.secondary">
              Chargeable Hours: <strong>{periodData.chargeableHours}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Hours: <strong>{periodData.totalHours}</strong>
            </Typography>
          </Box>
        </Card>
      );
    }
    return null;
  };

  // Loading state
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

  // No data state
  if (
    !filteredData ||
    !filteredData.utilizationData ||
    filteredData.utilizationData.length === 0
  ) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: 4,
          borderRadius: 3,
          textAlign: "center",
          bgcolor: alpha(theme.palette.primary.main, 0.04),
          border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
        }}
      >
        <PersonIcon
          sx={{
            fontSize: 60,
            color: alpha(theme.palette.primary.main, 0.3),
            mb: 2,
          }}
        />
        <Typography variant="h5" color="text.secondary" gutterBottom>
          No Staffing Data Available
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please upload a staffing Excel file to view utilization data.
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 2, fontStyle: "italic" }}
        >
          The file should contain employees with chargeable hours and total
          available hours data.
        </Typography>
      </Paper>
    );
  }

  // Color generator for employee lines
  const getEmployeeColor = (employeeId, index) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.info.main,
      theme.palette.warning.main,
      "#8884d8",
      "#4CAF50",
      "#FF5722",
      "#9C27B0",
      "#607D8B",
    ];

    // If employee is highlighted, return a specific color
    if (highlightedEmployee === employeeId) {
      return theme.palette.error.main;
    }

    // If any employee is highlighted but not this one, return a muted color
    if (highlightedEmployee && highlightedEmployee !== employeeId) {
      return alpha(colors[index % colors.length], 0.3);
    }

    return colors[index % colors.length];
  };

  return (
    <Fade in={!loading} timeout={500}>
      <Grid container spacing={3}>
        {/* Summary Card */}
        <Grid item xs={12}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
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
              <Box>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                  Team Staffing & Utilization
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  {currentFile && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mr: 1 }}
                    >
                      Data source: {currentFile}
                    </Typography>
                  )}
                  {activeSegment !== "All" && (
                    <Chip
                      size="small"
                      color="primary"
                      label={`Segment: ${activeSegment}`}
                      sx={{ fontWeight: 500 }}
                    />
                  )}
                </Box>
              </Box>

              {selectedPeriod && (
                <FormControl sx={{ minWidth: 200 }} size="small">
                  <InputLabel>Period</InputLabel>
                  <Select
                    value={selectedPeriod}
                    label="Period"
                    onChange={handlePeriodChange}
                  >
                    {filteredData.periods.map((period) => (
                      <MenuItem key={period.id} value={period.id}>
                        {period.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              {/* Team Average Card */}
              <Grid item xs={12} sm={4}>
                <Card
                  sx={{
                    height: "100%",
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    border: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.1
                    )}`,
                    boxShadow: "none",
                  }}
                >
                  <CardContent>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Team Average Utilization
                    </Typography>

                    {selectedPeriod && (
                      <Typography
                        variant="h3"
                        color="primary.main"
                        fontWeight={700}
                      >
                        {(
                          filteredData.teamAverages.find(
                            (avg) => avg.periodId === selectedPeriod
                          )?.averageUtilizationRate || 0
                        ).toFixed(1)}
                        %
                      </Typography>
                    )}

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      Based on {filteredData.employees.length} employees
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Chargeable Hours Card */}
              <Grid item xs={12} sm={4}>
                <Card
                  sx={{
                    height: "100%",
                    bgcolor: alpha(theme.palette.secondary.main, 0.05),
                    border: `1px solid ${alpha(
                      theme.palette.secondary.main,
                      0.1
                    )}`,
                    boxShadow: "none",
                  }}
                >
                  <CardContent>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Total Chargeable Hours
                    </Typography>

                    {selectedPeriod && (
                      <Typography
                        variant="h3"
                        color="secondary.main"
                        fontWeight={700}
                      >
                        {filteredData.teamAverages.find(
                          (avg) => avg.periodId === selectedPeriod
                        )?.totalChargeableHours || 0}
                      </Typography>
                    )}

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      For selected period
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Available Hours Card */}
              <Grid item xs={12} sm={4}>
                <Card
                  sx={{
                    height: "100%",
                    bgcolor: alpha(theme.palette.info.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                    boxShadow: "none",
                  }}
                >
                  <CardContent>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Total Available Hours
                    </Typography>

                    {selectedPeriod && (
                      <Typography
                        variant="h3"
                        color="info.main"
                        fontWeight={700}
                      >
                        {filteredData.teamAverages.find(
                          (avg) => avg.periodId === selectedPeriod
                        )?.totalAvailableHours || 0}
                      </Typography>
                    )}

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      For selected period
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Sub Tabs */}
        <Grid item xs={12}>
          <Paper
            elevation={2}
            sx={{
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 1)}`,
              overflow: "hidden",
            }}
          >
            <Tabs
              value={activeSubTab}
              onChange={handleSubTabChange}
              aria-label="staffing data views"
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: alpha(theme.palette.primary.main, 0.04),
              }}
            >
              <Tab
                icon={<TimelineIcon />}
                iconPosition="start"
                label="Timeline View"
                sx={{ textTransform: "none" }}
              />
              <Tab
                icon={<BarChartIcon />}
                iconPosition="start"
                label="Employee Comparison"
                sx={{ textTransform: "none" }}
              />
              <Tab
                icon={<PersonIcon />}
                iconPosition="start"
                label="Employee Detail"
                sx={{ textTransform: "none" }}
              />
            </Tabs>

            <Box sx={{ p: 3 }}>
              {/* Timeline View */}
              {activeSubTab === 0 && (
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 3,
                    }}
                  >
                    <Typography variant="h6" fontWeight={600}>
                      Team Utilization Rate Timeline (TU)
                    </Typography>
                    <Tooltip title="Shows aggregated TU for the selected segment/filter">
                      <InfoIcon color="action" fontSize="small" />
                    </Tooltip>
                  </Box>

                  <Box sx={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={getLineChartData()}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis
                          domain={[0, 100]}
                          tickFormatter={(value) => `${value}%`}
                          tick={{ fontSize: 12 }}
                        />
                        <RechartsTooltip
                          formatter={(value, name) => {
                            if (name === "utilizationRate")
                              return [
                                `${value.toFixed(1)}%`,
                                "Utilization Rate (TU)",
                              ];
                            return [value, name];
                          }}
                        />
                        <Legend />

                        {/* Single TU line */}
                        <Line
                          type="monotone"
                          dataKey="utilizationRate"
                          name="Utilization Rate (TU)"
                          stroke={theme.palette.primary.main}
                          strokeWidth={3}
                          dot={{ r: 5, fill: theme.palette.primary.main }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>

                  {/* Add explanation text */}
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      <strong>Note:</strong> The TU (Taux d'Utilisation) is
                      calculated by summing all chargeable hours and dividing by
                      the sum of all available hours across the filtered
                      employee set.
                    </Typography>
                    {activeSegment !== "All" && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                      >
                        <strong>Current filter:</strong> Showing data for
                        segment "{activeSegment}"
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}

              {/* Employee Comparison */}
              {activeSubTab === 1 && (
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 3,
                    }}
                  >
                    <Typography variant="h6" fontWeight={600}>
                      {selectedPeriod
                        ? `Employee Utilization Rate - ${
                            filteredData.periods.find(
                              (p) => p.id === selectedPeriod
                            )?.label
                          }`
                        : "Employee Utilization Rate"}
                    </Typography>
                  </Box>

                  <Box sx={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={getSortedEmployeeData().map((emp) => ({
                          name: emp.nom || emp.employeeId,
                          role: emp.role || "N/A",
                          equipe: emp.equipe || "N/A",
                          utilizationRate: emp.currentPeriod
                            ? emp.currentPeriod.utilizationRate
                            : 0,
                          chargeableHours: emp.currentPeriod
                            ? emp.currentPeriod.chargeableHours
                            : 0,
                          totalHours: emp.currentPeriod
                            ? emp.currentPeriod.totalHours
                            : 0,
                        }))}
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={true}
                          vertical={false}
                        />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tickFormatter={(value) => `${value}%`}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fontSize: 12 }}
                        />
                        <RechartsTooltip
                          formatter={(value, name, props) => {
                            if (name === "utilizationRate")
                              return [`${value}%`, "Utilization Rate"];
                            if (name === "chargeableHours")
                              return [value, "Chargeable Hours"];
                            if (name === "totalHours")
                              return [value, "Total Hours"];
                            return [value, name];
                          }}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <Card
                                  sx={{
                                    p: 1.5,
                                    backgroundColor: "white",
                                    boxShadow: theme.shadows[3],
                                    borderRadius: 1,
                                  }}
                                >
                                  <Typography
                                    variant="subtitle2"
                                    fontWeight={600}
                                    gutterBottom
                                  >
                                    {data.name}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Role: {data.role}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mb: 1 }}
                                  >
                                    Team: {data.equipe}
                                  </Typography>

                                  <Divider sx={{ my: 1 }} />

                                  <Typography variant="body2" fontWeight={600}>
                                    Utilization:{" "}
                                    {data.utilizationRate.toFixed(1)}%
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Chargeable: {data.chargeableHours}h
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Total: {data.totalHours}h
                                  </Typography>
                                </Card>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="utilizationRate"
                          name="Utilization Rate"
                          fill={theme.palette.primary.main}
                          radius={[0, 4, 4, 0]}
                        >
                          {getSortedEmployeeData().map((entry, index) => {
                            let color = theme.palette.primary.main;
                            const value = entry.currentPeriod
                              ? entry.currentPeriod.utilizationRate
                              : 0;

                            // Color coding based on utilization rate
                            if (value >= 90) color = theme.palette.success.main;
                            else if (value >= 75)
                              color = theme.palette.primary.main;
                            else if (value >= 60)
                              color = theme.palette.warning.main;
                            else color = theme.palette.error.main;

                            return <Cell key={index} fill={color} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>

                  {/* Top Performers */}
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Top Performers
                    </Typography>

                    <Grid container spacing={2}>
                      {getTopPerformers().map((employee, index) => (
                        <Grid
                          item
                          xs={12}
                          sm={6}
                          md={2.4}
                          key={employee.employeeId}
                        >
                          <Card
                            sx={{
                              height: "100%",
                              bgcolor:
                                index === 0
                                  ? alpha(theme.palette.success.main, 0.1)
                                  : alpha(theme.palette.primary.main, 0.05),
                              border: `1px solid ${
                                index === 0
                                  ? alpha(theme.palette.success.main, 0.2)
                                  : alpha(theme.palette.primary.main, 0.1)
                              }`,
                              boxShadow: "none",
                            }}
                          >
                            <CardContent>
                              <Typography
                                variant="subtitle2"
                                fontWeight={600}
                                noWrap
                              >
                                {employee.nom || employee.employeeId}
                              </Typography>

                              <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                                display="block"
                              >
                                {employee.role || "N/A"} -{" "}
                                {employee.equipe || "N/A"}
                              </Typography>

                              <Typography
                                variant="h4"
                                fontWeight={700}
                                color={
                                  index === 0 ? "success.main" : "primary.main"
                                }
                                sx={{ mt: 1 }}
                              >
                                {employee.utilizationRate.toFixed(1)}%
                              </Typography>

                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 1 }}
                              >
                                {employee.chargeableHours} /{" "}
                                {employee.totalHours} hours
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Box>
              )}

              {/* Employee Detail Table */}
              {activeSubTab === 2 && (
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 3,
                    }}
                  >
                    <Typography variant="h6" fontWeight={600}>
                      Employee Utilization Details
                    </Typography>
                  </Box>

                  <TableContainer>
                    <Table
                      aria-label="employee utilization table"
                      size="medium"
                    >
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            <TableSortLabel
                              active={sortConfig.key === "nom"}
                              direction={
                                sortConfig.key === "nom"
                                  ? sortConfig.direction
                                  : "asc"
                              }
                              onClick={() => handleSort("nom")}
                            >
                              Nom
                            </TableSortLabel>
                          </TableCell>
                          <TableCell>
                            <TableSortLabel
                              active={sortConfig.key === "role"}
                              direction={
                                sortConfig.key === "role"
                                  ? sortConfig.direction
                                  : "asc"
                              }
                              onClick={() => handleSort("role")}
                            >
                              Role
                            </TableSortLabel>
                          </TableCell>
                          <TableCell>
                            <TableSortLabel
                              active={sortConfig.key === "equipe"}
                              direction={
                                sortConfig.key === "equipe"
                                  ? sortConfig.direction
                                  : "asc"
                              }
                              onClick={() => handleSort("equipe")}
                            >
                              Equipe
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="right">
                            <TableSortLabel
                              active={sortConfig.key === "averageUtilization"}
                              direction={
                                sortConfig.key === "averageUtilization"
                                  ? sortConfig.direction
                                  : "desc"
                              }
                              onClick={() => handleSort("averageUtilization")}
                            >
                              Avg. Utilization
                            </TableSortLabel>
                          </TableCell>
                          {selectedPeriod && (
                            <>
                              <TableCell align="right">
                                <TableSortLabel
                                  active={
                                    sortConfig.key ===
                                    "currentPeriod.utilizationRate"
                                  }
                                  direction={
                                    sortConfig.key ===
                                    "currentPeriod.utilizationRate"
                                      ? sortConfig.direction
                                      : "desc"
                                  }
                                  onClick={() =>
                                    handleSort("currentPeriod.utilizationRate")
                                  }
                                >
                                  Current Utilization
                                </TableSortLabel>
                              </TableCell>
                              <TableCell align="right">
                                <TableSortLabel
                                  active={
                                    sortConfig.key ===
                                    "currentPeriod.chargeableHours"
                                  }
                                  direction={
                                    sortConfig.key ===
                                    "currentPeriod.chargeableHours"
                                      ? sortConfig.direction
                                      : "desc"
                                  }
                                  onClick={() =>
                                    handleSort("currentPeriod.chargeableHours")
                                  }
                                >
                                  Chargeable Hours
                                </TableSortLabel>
                              </TableCell>
                              <TableCell align="right">
                                <TableSortLabel
                                  active={
                                    sortConfig.key ===
                                    "currentPeriod.totalHours"
                                  }
                                  direction={
                                    sortConfig.key ===
                                    "currentPeriod.totalHours"
                                      ? sortConfig.direction
                                      : "desc"
                                  }
                                  onClick={() =>
                                    handleSort("currentPeriod.totalHours")
                                  }
                                >
                                  Total Hours
                                </TableSortLabel>
                              </TableCell>
                            </>
                          )}
                          <TableCell align="right">
                            <TableSortLabel
                              active={sortConfig.key === "totalChargeable"}
                              direction={
                                sortConfig.key === "totalChargeable"
                                  ? sortConfig.direction
                                  : "desc"
                              }
                              onClick={() => handleSort("totalChargeable")}
                            >
                              Total Chargeable
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="right">
                            <TableSortLabel
                              active={sortConfig.key === "totalAvailable"}
                              direction={
                                sortConfig.key === "totalAvailable"
                                  ? sortConfig.direction
                                  : "desc"
                              }
                              onClick={() => handleSort("totalAvailable")}
                            >
                              Total Available
                            </TableSortLabel>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {getSortedEmployeeData().map((employee) => {
                          // Determine utilization rate color based on value
                          let utilizationColor = theme.palette.text.primary;
                          const avgUtilization = employee.averageUtilization;
                          const currentUtilization = employee.currentPeriod
                            ? employee.currentPeriod.utilizationRate
                            : 0;

                          if (avgUtilization >= 90)
                            utilizationColor = theme.palette.success.main;
                          else if (avgUtilization >= 75)
                            utilizationColor = theme.palette.primary.main;
                          else if (avgUtilization >= 60)
                            utilizationColor = theme.palette.warning.main;
                          else if (avgUtilization > 0)
                            utilizationColor = theme.palette.error.main;

                          // Determine current period utilization color
                          let currentUtilizationColor =
                            theme.palette.text.primary;
                          if (currentUtilization >= 90)
                            currentUtilizationColor =
                              theme.palette.success.main;
                          else if (currentUtilization >= 75)
                            currentUtilizationColor =
                              theme.palette.primary.main;
                          else if (currentUtilization >= 60)
                            currentUtilizationColor =
                              theme.palette.warning.main;
                          else if (currentUtilization > 0)
                            currentUtilizationColor = theme.palette.error.main;

                          return (
                            <TableRow
                              key={employee.employeeId}
                              sx={{
                                "&:last-child td, &:last-child th": {
                                  border: 0,
                                },
                                "&:hover": {
                                  bgcolor: alpha(
                                    theme.palette.primary.main,
                                    0.05
                                  ),
                                },
                              }}
                            >
                              <TableCell component="th" scope="row">
                                <Typography variant="body2" fontWeight={500}>
                                  {employee.nom || employee.employeeId}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {employee.role || "N/A"}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {employee.equipe || "N/A"}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography
                                  variant="body2"
                                  fontWeight={600}
                                  sx={{ color: utilizationColor }}
                                >
                                  {employee.averageUtilization.toFixed(1)}%
                                </Typography>
                              </TableCell>
                              {selectedPeriod && employee.currentPeriod && (
                                <>
                                  <TableCell align="right">
                                    <Typography
                                      variant="body2"
                                      fontWeight={600}
                                      sx={{ color: currentUtilizationColor }}
                                    >
                                      {employee.currentPeriod.utilizationRate.toFixed(
                                        1
                                      )}
                                      %
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    {employee.currentPeriod.chargeableHours}
                                  </TableCell>
                                  <TableCell align="right">
                                    {employee.currentPeriod.totalHours}
                                  </TableCell>
                                </>
                              )}
                              {selectedPeriod && !employee.currentPeriod && (
                                <>
                                  <TableCell align="right">N/A</TableCell>
                                  <TableCell align="right">N/A</TableCell>
                                  <TableCell align="right">N/A</TableCell>
                                </>
                              )}
                              <TableCell align="right">
                                {employee.totalChargeable}
                              </TableCell>
                              <TableCell align="right">
                                {employee.totalAvailable}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Fade>
  );
};

export default StaffingTab;
