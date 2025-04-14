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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
} from "@mui/material";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import InfoIcon from "@mui/icons-material/Info";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import WorkIcon from "@mui/icons-material/Work";

import * as XLSX from "xlsx";

// Helper function to parse the Excel file
const processStaffingData = (fileData) => {
  try {
    const workbook = XLSX.read(fileData, {
      type: "array",
      cellDates: true,
      cellNF: true,
    });

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
    });

    console.log("Raw staffing data loaded:", rawData.length, "rows");

    // Process the data
    return rawData.map((row) => {
      // Create a cleaned up employee object
      const employee = {
        team: row["Equipe"],
        role: row["Role"],
        name: row["Nom"],
        periods: [],
        averageUtilization: 0,
        totalChargeable: 0,
        totalAvailable: 0,
      };

      // Process each period
      let totalUtilization = 0;
      let validPeriods = 0;

      for (let i = 1; i <= 11; i++) {
        const chargeableKey = `Ch ${i}`;
        const totalKey = `Total ${i}`;

        if (row[chargeableKey] !== undefined && row[totalKey] !== undefined) {
          const chargeable = parseFloat(row[chargeableKey]) || 0;
          const total = parseFloat(row[totalKey]) || 0;
          const utilization = total > 0 ? (chargeable / total) * 100 : 0;

          employee.periods.push({
            period: i,
            chargeable,
            total,
            utilization,
          });

          if (total > 0) {
            totalUtilization += utilization;
            validPeriods++;
            employee.totalChargeable += chargeable;
            employee.totalAvailable += total;
          }
        }
      }

      // Calculate average utilization
      employee.averageUtilization =
        employee.totalAvailable > 0
          ? (employee.totalChargeable / employee.totalAvailable) * 100
          : 0;

      return employee;
    });
  } catch (error) {
    console.error("Error processing staffing data:", error);
    return [];
  }
};

// Helper function to get utilization status
const getUtilizationStatus = (rate) => {
  if (rate > 75) return "very-good";
  if (rate >= 65) return "average";
  if (rate >= 55) return "not-good";
  return "terrible";
};

// Helper function to get color for utilization status
const getUtilizationColor = (theme, status) => {
  switch (status) {
    case "very-good":
      return theme.palette.success.main;
    case "average":
      return theme.palette.warning.main;
    case "not-good":
      return theme.palette.info.main;
    case "terrible":
      return theme.palette.error.main;
    default:
      return theme.palette.grey[500];
  }
};

// Helper function to get label for utilization status
const getUtilizationLabel = (status) => {
  switch (status) {
    case "very-good":
      return "Very Good";
    case "average":
      return "Average";
    case "not-good":
      return "Not Good";
    case "terrible":
      return "Terrible";
    default:
      return "Unknown";
  }
};

const StaffingTab = ({ data, loading, staffingFileName, staffingFileData }) => {
  const theme = useTheme();
  const [staffingData, setStaffingData] = useState([]);
  const [teams, setTeams] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [viewMode, setViewMode] = useState("team"); // team, employee, role
  const [sortConfig, setSortConfig] = useState({
    key: "averageUtilization",
    direction: "desc",
  });

  useEffect(() => {
    // Check if we have the file data available
    if (!staffingFileData || loading) return;

    try {
      console.log("Processing staffing file data...");
      const processedData = processStaffingData(staffingFileData);
      console.log(
        "Processed staffing data:",
        processedData.length,
        "employees"
      );
      setStaffingData(processedData);

      // Extract teams and roles
      const uniqueTeams = [...new Set(processedData.map((emp) => emp.team))];
      const uniqueRoles = [...new Set(processedData.map((emp) => emp.role))];

      setTeams(uniqueTeams);
      setRoles(uniqueRoles);
    } catch (error) {
      console.error("Error processing staffing data:", error);
    }
  }, [staffingFileData, loading]);

  // Handle filter changes
  const handleTeamChange = (event) => {
    setSelectedTeam(event.target.value);
    setSelectedEmployee(null);
  };

  const handleRoleChange = (event) => {
    setSelectedRole(event.target.value);
    setSelectedEmployee(null);
  };

  const handleEmployeeChange = (event, value) => {
    setSelectedEmployee(value);
  };

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  // Handle sorting
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Filter the data based on selections
  const filteredData = staffingData.filter((employee) => {
    if (selectedTeam && employee.team !== selectedTeam) return false;
    if (selectedRole && employee.role !== selectedRole) return false;
    if (selectedEmployee && employee.name !== selectedEmployee.name)
      return false;
    return true;
  });

  // Get all employees for autocomplete
  const employeeOptions = staffingData.map((emp) => ({
    name: emp.name,
    team: emp.team,
    role: emp.role,
  }));

  // Sort the data
  const sortedData = [...filteredData].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Special case for team-role sorting
    if (sortConfig.key === "team-role") {
      aValue = `${a.team}-${a.role}`;
      bValue = `${b.team}-${b.role}`;
    }

    if (sortConfig.direction === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Calculate team utilization across all periods
  const calculateTeamUtilization = () => {
    const teamData = {};

    filteredData.forEach((employee) => {
      const team = employee.team;
      if (!teamData[team]) {
        teamData[team] = {
          name: team,
          totalChargeable: 0,
          totalAvailable: 0,
          employeeCount: 0,
        };
      }

      teamData[team].totalChargeable += employee.totalChargeable;
      teamData[team].totalAvailable += employee.totalAvailable;
      teamData[team].employeeCount += 1;
    });

    return Object.values(teamData).map((team) => ({
      ...team,
      utilization:
        team.totalAvailable > 0
          ? (team.totalChargeable / team.totalAvailable) * 100
          : 0,
      utilizationStatus: getUtilizationStatus(
        team.totalAvailable > 0
          ? (team.totalChargeable / team.totalAvailable) * 100
          : 0
      ),
    }));
  };

  // Calculate role utilization across all periods
  const calculateRoleUtilization = () => {
    const roleData = {};

    filteredData.forEach((employee) => {
      const role = employee.role;
      if (!roleData[role]) {
        roleData[role] = {
          name: role,
          totalChargeable: 0,
          totalAvailable: 0,
          employeeCount: 0,
        };
      }

      roleData[role].totalChargeable += employee.totalChargeable;
      roleData[role].totalAvailable += employee.totalAvailable;
      roleData[role].employeeCount += 1;
    });

    return Object.values(roleData).map((role) => ({
      ...role,
      utilization:
        role.totalAvailable > 0
          ? (role.totalChargeable / role.totalAvailable) * 100
          : 0,
      utilizationStatus: getUtilizationStatus(
        role.totalAvailable > 0
          ? (role.totalChargeable / role.totalAvailable) * 100
          : 0
      ),
    }));
  };

  // Calculate team-role utilization matrix
  const calculateTeamRoleMatrix = () => {
    const matrix = {};

    teams.forEach((team) => {
      matrix[team] = {};
      roles.forEach((role) => {
        matrix[team][role] = {
          totalChargeable: 0,
          totalAvailable: 0,
          employeeCount: 0,
          utilization: 0,
        };
      });
    });

    filteredData.forEach((employee) => {
      if (matrix[employee.team] && matrix[employee.team][employee.role]) {
        matrix[employee.team][employee.role].totalChargeable +=
          employee.totalChargeable;
        matrix[employee.team][employee.role].totalAvailable +=
          employee.totalAvailable;
        matrix[employee.team][employee.role].employeeCount += 1;
      }
    });

    // Calculate utilization rates
    Object.keys(matrix).forEach((team) => {
      Object.keys(matrix[team]).forEach((role) => {
        const data = matrix[team][role];
        data.utilization =
          data.totalAvailable > 0
            ? (data.totalChargeable / data.totalAvailable) * 100
            : 0;
        data.utilizationStatus = getUtilizationStatus(data.utilization);
      });
    });

    return matrix;
  };

  // Prepare trend data across all periods
  const prepareTeamUtilizationTrendData = () => {
    const trendData = [];
    const overallTrend = [];

    // Calculate overall utilization per period
    for (let period = 1; period <= 11; period++) {
      let totalChargeable = 0;
      let totalAvailable = 0;

      filteredData.forEach((employee) => {
        const periodData = employee.periods.find((p) => p.period === period);
        if (periodData) {
          totalChargeable += periodData.chargeable;
          totalAvailable += periodData.total;
        }
      });

      overallTrend.push({
        period,
        utilization:
          totalAvailable > 0 ? (totalChargeable / totalAvailable) * 100 : 0,
      });
    }

    // For each period
    for (let period = 1; period <= 11; period++) {
      const periodData = {
        period: `P${period}`,
        overall: overallTrend[period - 1].utilization,
      };

      // Calculate utilization for each team
      teams.forEach((team) => {
        const teamEmployees = filteredData.filter((emp) => emp.team === team);
        let totalChargeable = 0;
        let totalAvailable = 0;

        teamEmployees.forEach((employee) => {
          const empPeriodData = employee.periods.find(
            (p) => p.period === period
          );
          if (empPeriodData) {
            totalChargeable += empPeriodData.chargeable;
            totalAvailable += empPeriodData.total;
          }
        });

        periodData[team] =
          totalAvailable > 0 ? (totalChargeable / totalAvailable) * 100 : 0;
      });

      trendData.push(periodData);
    }

    return trendData;
  };

  // Prepare individual employee data
  const prepareEmployeeUtilizationData = () => {
    return filteredData
      .map((employee) => {
        return {
          name: employee.name,
          team: employee.team,
          role: employee.role,
          utilization: employee.averageUtilization,
          utilizationStatus: getUtilizationStatus(employee.averageUtilization),
          totalChargeable: employee.totalChargeable,
          totalAvailable: employee.totalAvailable,
        };
      })
      .sort((a, b) => b.utilization - a.utilization);
  };

  // Calculate overall utilization
  const calculateOverallUtilization = () => {
    let totalChargeable = 0;
    let totalAvailable = 0;

    filteredData.forEach((employee) => {
      totalChargeable += employee.totalChargeable;
      totalAvailable += employee.totalAvailable;
    });

    const utilization =
      totalAvailable > 0 ? (totalChargeable / totalAvailable) * 100 : 0;

    return {
      utilization,
      totalChargeable,
      totalAvailable,
      employeeCount: filteredData.length,
      status: getUtilizationStatus(utilization),
    };
  };

  // Get status distribution
  const getUtilizationStatusDistribution = () => {
    const statusCounts = {
      "very-good": 0,
      average: 0,
      "not-good": 0,
      terrible: 0,
    };

    filteredData.forEach((employee) => {
      const status = getUtilizationStatus(employee.averageUtilization);
      statusCounts[status] += 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: getUtilizationLabel(status),
      value: count,
      status,
    }));
  };

  // Custom tooltip for utilization rate charts
  const UtilizationTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
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
            {data.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Utilization: {payload[0].value.toFixed(1)}%
          </Typography>
          {data.employeeCount && (
            <Typography variant="body2" color="text.secondary">
              Employees: {data.employeeCount}
            </Typography>
          )}
        </Card>
      );
    }
    return null;
  };

  // Calculate empty and total capacity
  const calculateCapacity = () => {
    let totalCapacity = 0;
    let unusedCapacity = 0;

    filteredData.forEach((employee) => {
      totalCapacity += employee.totalAvailable;
      unusedCapacity += employee.totalAvailable - employee.totalChargeable;
    });

    const unusedPercentage =
      totalCapacity > 0 ? (unusedCapacity / totalCapacity) * 100 : 0;

    return {
      total: totalCapacity,
      unused: unusedCapacity,
      unusedPercentage,
    };
  };

  // Get the color based on utilization status
  const getStatusColor = (utilization) => {
    const status = getUtilizationStatus(utilization);
    return getUtilizationColor(theme, status);
  };

  if (loading || staffingData.length === 0) {
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

  // Prepare data based on current selections
  const teamUtilizationData = calculateTeamUtilization();
  const roleUtilizationData = calculateRoleUtilization();
  const teamRoleMatrix = calculateTeamRoleMatrix();
  const teamUtilizationTrend = prepareTeamUtilizationTrendData();
  const employeeUtilizationData = prepareEmployeeUtilizationData();
  const overallUtilization = calculateOverallUtilization();
  const utilizationDistribution = getUtilizationStatusDistribution();
  const capacityData = calculateCapacity();

  // Calculate color for overall utilization
  const overallUtilizationColor = getStatusColor(
    overallUtilization.utilization
  );

  // Generate team colors for charts
  const teamColors = {};
  teams.forEach((team, index) => {
    const colorKeys = [
      "primary",
      "secondary",
      "success",
      "info",
      "warning",
      "error",
    ];
    const colorKey = colorKeys[index % colorKeys.length];
    teamColors[team] = theme.palette[colorKey].main;
  });

  return (
    <Fade in={!loading} timeout={500}>
      <Grid container spacing={3}>
        {/* Filter Controls */}
        <Grid item xs={12}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              mb: 2,
            }}
          >
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Staffing Analysis
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 2,
                mt: 2,
              }}
            >
              {/* Team Filter */}
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel id="team-filter-label">Team</InputLabel>
                <Select
                  labelId="team-filter-label"
                  id="team-filter"
                  value={selectedTeam}
                  label="Team"
                  onChange={handleTeamChange}
                >
                  <MenuItem value="">All Teams</MenuItem>
                  {teams.map((team) => (
                    <MenuItem key={team} value={team}>
                      {team}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Role Filter */}
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel id="role-filter-label">Role</InputLabel>
                <Select
                  labelId="role-filter-label"
                  id="role-filter"
                  value={selectedRole}
                  label="Role"
                  onChange={handleRoleChange}
                >
                  <MenuItem value="">All Roles</MenuItem>
                  {roles.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Employee Filter */}
              <Autocomplete
                id="employee-filter"
                options={employeeOptions}
                getOptionLabel={(option) => `${option.name} (${option.team})`}
                sx={{ minWidth: 300 }}
                value={selectedEmployee}
                onChange={handleEmployeeChange}
                renderInput={(params) => (
                  <TextField {...params} label="Employee" />
                )}
              />

              {/* View Mode Toggle */}
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                aria-label="view mode"
                sx={{ ml: "auto" }}
              >
                <ToggleButton value="team" aria-label="team view">
                  <Tooltip title="Team View">
                    <GroupWorkIcon />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="employee" aria-label="employee view">
                  <Tooltip title="Employee View">
                    <PersonIcon />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="role" aria-label="role view">
                  <Tooltip title="Role View">
                    <WorkIcon />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Paper>
        </Grid>

        {/* Overall Utilization KPIs */}
        <Grid item xs={12} md={3}>
          <Card
            sx={{
              height: "100%",
              borderRadius: 3,
              boxShadow: 2,
              transition: "all 0.3s",
              "&:hover": {
                boxShadow: 6,
                transform: "translateY(-4px)",
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h6"
                fontWeight={700}
                color="text.primary"
                gutterBottom
              >
                Overall Utilization
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ textAlign: "center", mt: 3, mb: 2 }}>
                <Typography
                  variant="h3"
                  component="div"
                  fontWeight={700}
                  sx={{ color: overallUtilizationColor }}
                >
                  {overallUtilization.utilization.toFixed(1)}%
                </Typography>
                <Chip
                  label={getUtilizationLabel(overallUtilization.status)}
                  color={
                    overallUtilization.status === "very-good"
                      ? "success"
                      : overallUtilization.status === "average"
                      ? "warning"
                      : overallUtilization.status === "not-good"
                      ? "info"
                      : "error"
                  }
                  sx={{ mt: 1 }}
                />
              </Box>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total Chargeable
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {overallUtilization.totalChargeable.toFixed(1)} hours
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total Available
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {overallUtilization.totalAvailable.toFixed(1)} hours
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Employees
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {overallUtilization.employeeCount}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Capacity Analysis */}
        <Grid item xs={12} md={3}>
          <Card
            sx={{
              height: "100%",
              borderRadius: 3,
              boxShadow: 2,
              transition: "all 0.3s",
              "&:hover": {
                boxShadow: 6,
                transform: "translateY(-4px)",
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h6"
                fontWeight={700}
                color="text.primary"
                gutterBottom
              >
                Capacity Analysis
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ textAlign: "center", mt: 3, mb: 2 }}>
                <Typography
                  variant="h3"
                  component="div"
                  fontWeight={700}
                  color={theme.palette.secondary.main}
                >
                  {capacityData.unusedPercentage.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Unused Capacity
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Available Hours
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {capacityData.total.toFixed(1)} hours
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Unused Hours
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {capacityData.unused.toFixed(1)} hours
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Equivalent FTE
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {(capacityData.unused / 80).toFixed(1)} FTE
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Utilization Distribution */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: "100%",
              borderRadius: 3,
              boxShadow: 2,
              transition: "all 0.3s",
              "&:hover": {
                boxShadow: 6,
                transform: "translateY(-4px)",
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h6"
                fontWeight={700}
                color="text.primary"
                gutterBottom
              >
                Utilization Distribution
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={utilizationDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {utilizationDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getUtilizationColor(theme, entry.status)}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value, name) => [`${value} employees`, name]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Team Utilization Trend Chart */}
        <Grid item xs={12}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              height: 400,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              mb: 3,
            }}
          >
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Team Utilization Trend
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Team utilization across all periods with overall trend
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart
                data={teamUtilizationTrend}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <RechartsTooltip
                  formatter={(value) => `${value.toFixed(1)}%`}
                />
                <Legend />

                {/* Show overall trend as a bold line */}
                <Line
                  type="monotone"
                  dataKey="overall"
                  name="Overall"
                  stroke={theme.palette.grey[800]}
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 8 }}
                />

                {/* Show each team as a dotted line */}
                {teams.map((team, index) => (
                  <Line
                    key={team}
                    type="monotone"
                    dataKey={team}
                    name={team}
                    stroke={teamColors[team]}
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {viewMode === "team" && (
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
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Team Utilization
              </Typography>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart
                  data={teamUtilizationData}
                  layout="vertical"
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
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                  />
                  <RechartsTooltip content={<UtilizationTooltip />} />
                  <Bar dataKey="utilization" name="Utilization Rate">
                    {teamUtilizationData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getUtilizationColor(
                          theme,
                          entry.utilizationStatus
                        )}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        {viewMode === "role" && (
          <>
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
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Role Utilization
                </Typography>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart
                    data={roleUtilizationData}
                    layout="vertical"
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
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                    />
                    <RechartsTooltip content={<UtilizationTooltip />} />
                    <Bar dataKey="utilization" name="Utilization Rate">
                      {roleUtilizationData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getUtilizationColor(
                            theme,
                            entry.utilizationStatus
                          )}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

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
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Team-Role Utilization Matrix
                </Typography>
                <TableContainer>
                  <Table aria-label="team-role matrix">
                    <TableHead>
                      <TableRow>
                        <TableCell>Team / Role</TableCell>
                        {roles.map((role) => (
                          <TableCell key={role} align="center">
                            {role}
                          </TableCell>
                        ))}
                        <TableCell align="center">Overall</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {teams.map((team) => {
                        // Calculate overall team utilization
                        const teamEmployees = filteredData.filter(
                          (emp) => emp.team === team
                        );
                        let totalChargeable = 0;
                        let totalAvailable = 0;

                        teamEmployees.forEach((employee) => {
                          totalChargeable += employee.totalChargeable;
                          totalAvailable += employee.totalAvailable;
                        });

                        const teamUtilization =
                          totalAvailable > 0
                            ? (totalChargeable / totalAvailable) * 100
                            : 0;

                        const teamStatus =
                          getUtilizationStatus(teamUtilization);

                        return (
                          <TableRow key={team}>
                            <TableCell component="th" scope="row">
                              <Typography fontWeight={600}>{team}</Typography>
                            </TableCell>
                            {roles.map((role) => {
                              const data = teamRoleMatrix[team][role];
                              return (
                                <TableCell
                                  key={`${team}-${role}`}
                                  align="center"
                                  sx={{
                                    color:
                                      data.employeeCount > 0
                                        ? getUtilizationColor(
                                            theme,
                                            data.utilizationStatus
                                          )
                                        : "text.disabled",
                                    fontWeight:
                                      data.employeeCount > 0 ? 600 : 400,
                                  }}
                                >
                                  {data.employeeCount > 0
                                    ? `${data.utilization.toFixed(1)}% (${
                                        data.employeeCount
                                      })`
                                    : "-"}
                                </TableCell>
                              );
                            })}
                            <TableCell
                              align="center"
                              sx={{
                                color: getUtilizationColor(theme, teamStatus),
                                fontWeight: 600,
                                bgcolor: alpha(
                                  getUtilizationColor(theme, teamStatus),
                                  0.1
                                ),
                              }}
                            >
                              {teamUtilization.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </>
        )}

        {/* Employee Table (always show) */}
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
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                Employee Utilization Details
              </Typography>
            </Box>
            <TableContainer>
              <Table aria-label="employee details table">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={sortConfig.key === "name"}
                        direction={
                          sortConfig.key === "name"
                            ? sortConfig.direction
                            : "asc"
                        }
                        onClick={() => handleSort("name")}
                      >
                        Name
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortConfig.key === "team"}
                        direction={
                          sortConfig.key === "team"
                            ? sortConfig.direction
                            : "asc"
                        }
                        onClick={() => handleSort("team")}
                      >
                        Team
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
                        Utilization Rate
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">Chargeable Hours</TableCell>
                    <TableCell align="right">Available Hours</TableCell>
                    <TableCell align="right">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedData.map((employee) => {
                    const status = getUtilizationStatus(
                      employee.averageUtilization
                    );

                    return (
                      <TableRow
                        key={employee.name}
                        hover
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                        }}
                      >
                        <TableCell component="th" scope="row">
                          {employee.name}
                        </TableCell>
                        <TableCell>{employee.team}</TableCell>
                        <TableCell>{employee.role}</TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: getUtilizationColor(theme, status),
                            fontWeight: 600,
                          }}
                        >
                          {employee.averageUtilization.toFixed(1)}%
                        </TableCell>
                        <TableCell align="right">
                          {employee.totalChargeable.toFixed(1)}
                        </TableCell>
                        <TableCell align="right">
                          {employee.totalAvailable.toFixed(1)}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={getUtilizationLabel(status)}
                            color={
                              status === "very-good"
                                ? "success"
                                : status === "average"
                                ? "warning"
                                : status === "not-good"
                                ? "info"
                                : "error"
                            }
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Fade>
  );
};

export default StaffingTab;
