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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Alert,
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
  Sector,
  RadialBarChart,
  RadialBar,
  AreaChart,
  Area,
} from "recharts";
import InfoIcon from "@mui/icons-material/Info";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import WorkIcon from "@mui/icons-material/Work";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

import * as XLSX from "xlsx";

// Helper function to safely parse numeric values
const parseNumeric = (value) => {
  if (value === undefined || value === null || value === "") return 0;
  // Handle string values that might contain commas
  if (typeof value === "string") {
    value = value.replace(",", ".");
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

// Helper function to parse the Excel file with the new structure
const processStaffingData = (fileData) => {
  try {
    // Ensure we have valid file data
    if (!fileData || !(fileData instanceof ArrayBuffer)) {
      console.error("Invalid file data:", fileData);
      throw new Error("Invalid file data format");
    }

    console.log("Processing file data with size:", fileData.byteLength);

    // Create a Uint8Array from the ArrayBuffer
    const dataArray = new Uint8Array(fileData);

    // Read the Excel file
    const workbook = XLSX.read(dataArray, {
      type: "array",
      cellDates: true,
      cellNF: true,
    });

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Log worksheet info
    console.log("Excel worksheet range:", worksheet["!ref"]);

    // Convert to JSON with raw: false to keep string formatting
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
    });

    console.log("Raw staffing data loaded:", rawData.length, "rows");

    // Print first row keys to verify structure
    if (rawData.length > 0) {
      const firstRowKeys = Object.keys(rawData[0]);
      console.log("First row contains", firstRowKeys.length, "columns");
      console.log("Sample columns:", firstRowKeys.slice(0, 10));
    }

    // Extract all periods from the first row
    const firstRow = rawData[0];
    const periods = [];

    Object.keys(firstRow).forEach((key) => {
      // Look for period dates in column names (1/4, 16/4, etc.)
      const matches = key.match(/ - (\d+\/\d+)$/);
      if (matches && matches[1]) {
        if (!periods.includes(matches[1])) {
          periods.push(matches[1]);
        }
      }
    });

    // Sort periods chronologically
    periods.sort((a, b) => {
      const [dayA, monthA] = a.split("/").map(Number);
      const [dayB, monthB] = b.split("/").map(Number);

      if (monthA !== monthB) {
        return monthA - monthB;
      }
      return dayA - dayB;
    });

    console.log("Detected periods:", periods);

    if (periods.length === 0) {
      throw new Error("No period columns found in Excel file");
    }

    // Process each employee row
    const processedData = rawData.map((row, index) => {
      // Create a cleaned up employee object
      const employee = {
        team: row["Equipe"],
        role: row["Role"],
        name: row["Nom"],
        arrivalDate: row["Date arrivée"],
        departureDate: row["Date départ"],
        periods: [],
        averageUtilization: 0,
        totalChargeable: 0,
        totalVacation: 0,
        totalLOA: 0,
        totalResNoJC: 0,
        totalResWithJC: 0,
        totalSellOn: 0,
        totalFormation: 0,
        totalAvailable: 0,
      };

      // Debug the first few rows
      const debugThisRow = index < 2;

      // Process each period
      let totalUtilization = 0;
      let validPeriods = 0;

      periods.forEach((period) => {
        // Extract values with proper key format (e.g., "Ch - 1/4")
        const periodValues = {
          chargeable: parseNumeric(row[`Ch - ${period}`]),
          vacation: parseNumeric(row[`Vac - ${period}`]),
          loa: parseNumeric(row[`LOA - ${period}`]),
          resNoJC: parseNumeric(row[`Res - w/o JC - ${period}`]),
          resWithJC: parseNumeric(row[`Res - w/ JC - ${period}`]),
          sellOn: parseNumeric(row[`Oth - Sell-on - ${period}`]),
          formation: parseNumeric(row[`Oth - Formation - ${period}`]),
          total: parseNumeric(row[`Total - ${period}`]),
        };

        // Calculate utilization
        const utilization =
          periodValues.total > 0
            ? (periodValues.chargeable / periodValues.total) * 100
            : 0;

        // Add to period data
        const periodData = {
          period,
          ...periodValues,
          utilization,
        };

        employee.periods.push(periodData);

        // Debug info for first employee
        if (debugThisRow && period === periods[0]) {
          console.log(`Employee ${employee.name}, Period ${period}:`);
          Object.entries(periodValues).forEach(([key, value]) => {
            console.log(`  - ${key}: ${value}`);
          });
          console.log(`  - Utilization: ${utilization.toFixed(1)}%`);
        }

        // Update totals if there's available time
        if (periodValues.total > 0) {
          totalUtilization += utilization;
          validPeriods++;

          employee.totalChargeable += periodValues.chargeable;
          employee.totalVacation += periodValues.vacation;
          employee.totalLOA += periodValues.loa;
          employee.totalResNoJC += periodValues.resNoJC;
          employee.totalResWithJC += periodValues.resWithJC;
          employee.totalSellOn += periodValues.sellOn;
          employee.totalFormation += periodValues.formation;
          employee.totalAvailable += periodValues.total;
        }
      });

      // Calculate average utilization
      employee.averageUtilization =
        validPeriods > 0 ? totalUtilization / validPeriods : 0;

      // Debug total calculations
      if (debugThisRow) {
        console.log(`Employee ${employee.name} totals:`);
        console.log(`  - Chargeable: ${employee.totalChargeable}`);
        console.log(`  - Available: ${employee.totalAvailable}`);
        console.log(
          `  - Avg Utilization: ${employee.averageUtilization.toFixed(1)}%`
        );
      }

      return employee;
    });

    console.log(`Successfully processed ${processedData.length} employees`);
    return processedData;
  } catch (error) {
    console.error("Error processing staffing data:", error);
    throw error;
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

// Format date for display
const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // Try DD/MM/YY format
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${parts[0]}/${parts[1]}/${year}`;
      }
      return dateStr;
    }

    return date.toLocaleDateString();
  } catch (e) {
    return dateStr;
  }
};

// Active shape for interactive pie chart
const renderActiveShape = (props) => {
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props;
  const sin = Math.sin(-midAngle * (Math.PI / 180));
  const cos = Math.cos(-midAngle * (Math.PI / 180));
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        fill="none"
      />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        textAnchor={textAnchor}
        fill="#333"
        fontSize={12}
        fontWeight="bold"
      >
        {payload.name}
      </text>
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        dy={18}
        textAnchor={textAnchor}
        fill="#666"
        fontSize={12}
      >
        {`${value.toFixed(1)} hours (${(percent * 100).toFixed(1)}%)`}
      </text>
    </g>
  );
};

const StaffingTab = ({ data, loading, staffingFileName, staffingFileData }) => {
  const theme = useTheme();
  const [staffingData, setStaffingData] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [teams, setTeams] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "averageUtilization",
    direction: "desc",
  });
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeTimeIndex, setActiveTimeIndex] = useState(0);
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);
  const [pieChartActiveIndex, setPieChartActiveIndex] = useState(0);

  useEffect(() => {
    // Check if we have the file data available
    if (!staffingFileData || loading) {
      return;
    }

    try {
      console.log("Processing staffing file data...");
      console.log("staffingFileData type:", typeof staffingFileData);
      console.log(
        "staffingFileData instanceof ArrayBuffer:",
        staffingFileData instanceof ArrayBuffer
      );

      if (!(staffingFileData instanceof ArrayBuffer)) {
        console.warn(
          "staffingFileData is not an ArrayBuffer. Trying to process anyway."
        );
      }

      // Process the data
      const processedData = processStaffingData(staffingFileData);
      console.log(
        "Processed staffing data:",
        processedData.length,
        "employees"
      );

      // Verify the data includes numeric values
      if (processedData.length > 0) {
        const sampleEmployee = processedData[0];
        console.log("Sample employee data:", {
          name: sampleEmployee.name,
          totalChargeable: sampleEmployee.totalChargeable,
          totalAvailable: sampleEmployee.totalAvailable,
          utilization: sampleEmployee.averageUtilization,
        });

        if (
          sampleEmployee.totalChargeable === 0 &&
          sampleEmployee.totalAvailable > 0
        ) {
          console.warn(
            "Sample employee has 0 chargeable hours but non-zero available hours"
          );
        }
      }

      setStaffingData(processedData);
      setDataLoaded(true);

      // Extract teams and roles
      const uniqueTeams = [...new Set(processedData.map((emp) => emp.team))];
      const uniqueRoles = [...new Set(processedData.map((emp) => emp.role))];

      // Extract periods from the first employee
      const uniquePeriods =
        processedData.length > 0
          ? [...processedData[0].periods.map((p) => p.period)]
          : [];

      setTeams(uniqueTeams);
      setRoles(uniqueRoles);
      setPeriods(uniquePeriods);

      // Set default period to the first one if available
      if (uniquePeriods.length > 0) {
        setSelectedPeriod(uniquePeriods[0]);
      }

      setError(null);
    } catch (err) {
      console.error("Error processing staffing data:", err);
      setError(`Error processing staffing data: ${err.message}`);
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

  const handlePeriodChange = (event) => {
    setSelectedPeriod(event.target.value);
  };

  const handleEmployeeChange = (event, value) => {
    setSelectedEmployee(value);
  };

  // Handle sorting
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Pie chart mouse event handlers
  const onPieEnter = (_, index) => {
    setPieChartActiveIndex(index);
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

  // Calculate team utilization for the selected period
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

      if (selectedPeriod) {
        // For a specific period
        const periodData = employee.periods.find(
          (p) => p.period === selectedPeriod
        );
        if (periodData) {
          teamData[team].totalChargeable += periodData.chargeable;
          teamData[team].totalAvailable += periodData.total;
          teamData[team].employeeCount += 1;
        }
      } else {
        // For all periods (total)
        teamData[team].totalChargeable += employee.totalChargeable;
        teamData[team].totalAvailable += employee.totalAvailable;
        teamData[team].employeeCount += 1;
      }
    });

    return Object.values(teamData)
      .map((team) => ({
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
      }))
      .sort((a, b) => b.utilization - a.utilization);
  };

  // Calculate role utilization for the selected period
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

      if (selectedPeriod) {
        // For a specific period
        const periodData = employee.periods.find(
          (p) => p.period === selectedPeriod
        );
        if (periodData) {
          roleData[role].totalChargeable += periodData.chargeable;
          roleData[role].totalAvailable += periodData.total;
          roleData[role].employeeCount += 1;
        }
      } else {
        // For all periods (total)
        roleData[role].totalChargeable += employee.totalChargeable;
        roleData[role].totalAvailable += employee.totalAvailable;
        roleData[role].employeeCount += 1;
      }
    });

    return Object.values(roleData)
      .map((role) => ({
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
      }))
      .sort((a, b) => b.utilization - a.utilization);
  };

  // Prepare trend data across all periods
  const prepareTeamUtilizationTrendData = () => {
    const trendData = [];

    // For each period
    periods.forEach((period) => {
      // Calculate overall utilization for this period
      let totalChargeable = 0;
      let totalAvailable = 0;

      filteredData.forEach((employee) => {
        const periodData = employee.periods.find((p) => p.period === period);
        if (periodData) {
          totalChargeable += periodData.chargeable;
          totalAvailable += periodData.total;
        }
      });

      const periodUtil =
        totalAvailable > 0 ? (totalChargeable / totalAvailable) * 100 : 0;

      // Prepare data point for this period
      const periodData = {
        period,
        overall: periodUtil,
      };

      // Calculate utilization for each team in this period
      teams.forEach((team) => {
        const teamEmployees = filteredData.filter((emp) => emp.team === team);
        let teamChargeable = 0;
        let teamAvailable = 0;

        teamEmployees.forEach((employee) => {
          const empPeriodData = employee.periods.find(
            (p) => p.period === period
          );
          if (empPeriodData) {
            teamChargeable += empPeriodData.chargeable;
            teamAvailable += empPeriodData.total;
          }
        });

        periodData[team] =
          teamAvailable > 0 ? (teamChargeable / teamAvailable) * 100 : 0;
      });

      trendData.push(periodData);
    });

    return trendData;
  };

  // Calculate time breakdown by category (chargeable, vacation, LOA, etc.)
  const calculateTimeBreakdown = () => {
    let totalChargeable = 0;
    let totalVacation = 0;
    let totalLOA = 0;
    let totalResNoJC = 0;
    let totalResWithJC = 0;
    let totalSellOn = 0;
    let totalFormation = 0;
    let totalTime = 0;

    filteredData.forEach((employee) => {
      if (selectedPeriod) {
        // For specific period
        const periodData = employee.periods.find(
          (p) => p.period === selectedPeriod
        );
        if (periodData) {
          totalChargeable += periodData.chargeable;
          totalVacation += periodData.vacation;
          totalLOA += periodData.loa;
          totalResNoJC += periodData.resNoJC;
          totalResWithJC += periodData.resWithJC;
          totalSellOn += periodData.sellOn;
          totalFormation += periodData.formation;
          totalTime += periodData.total;
        }
      } else {
        // For all periods
        totalChargeable += employee.totalChargeable;
        totalVacation += employee.totalVacation;
        totalLOA += employee.totalLOA;
        totalResNoJC += employee.totalResNoJC;
        totalResWithJC += employee.totalResWithJC;
        totalSellOn += employee.totalSellOn;
        totalFormation += employee.totalFormation;
        totalTime += employee.totalAvailable;
      }
    });

    return [
      {
        name: "Chargeable",
        value: totalChargeable,
        percentage: totalTime > 0 ? (totalChargeable / totalTime) * 100 : 0,
        fill: theme.palette.success.main,
      },
      {
        name: "Vacation",
        value: totalVacation,
        percentage: totalTime > 0 ? (totalVacation / totalTime) * 100 : 0,
        fill: theme.palette.info.main,
      },
      {
        name: "Leave of Absence",
        value: totalLOA,
        percentage: totalTime > 0 ? (totalLOA / totalTime) * 100 : 0,
        fill: theme.palette.warning.main,
      },
      {
        name: "Reservation (no JC)",
        value: totalResNoJC,
        percentage: totalTime > 0 ? (totalResNoJC / totalTime) * 100 : 0,
        fill: theme.palette.secondary.main,
      },
      {
        name: "Reservation (with JC)",
        value: totalResWithJC,
        percentage: totalTime > 0 ? (totalResWithJC / totalTime) * 100 : 0,
        fill: theme.palette.primary.main,
      },
      {
        name: "Sell-on",
        value: totalSellOn,
        percentage: totalTime > 0 ? (totalSellOn / totalTime) * 100 : 0,
        fill: theme.palette.error.light,
      },
      {
        name: "Formation",
        value: totalFormation,
        percentage: totalTime > 0 ? (totalFormation / totalTime) * 100 : 0,
        fill: theme.palette.error.dark,
      },
    ]
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  };

  // Prepare data for stacked area chart
  const prepareTimeStackedData = () => {
    return periods.map((period) => {
      const periodData = { period };
      
      // Initialize all categories with zero
      periodData.Chargeable = 0;
      periodData.Vacation = 0;
      periodData.LOA = 0;
      periodData.ResNoJC = 0;
      periodData.ResWithJC = 0;
      periodData.SellOn = 0;
      periodData.Formation = 0;
      
      // Sum up values for this period
      filteredData.forEach(employee => {
        const empPeriod = employee.periods.find(p => p.period === period);
        if (empPeriod) {
          periodData.Chargeable += empPeriod.chargeable || 0;
          periodData.Vacation += empPeriod.vacation || 0;
          periodData.LOA += empPeriod.loa || 0;
          periodData.ResNoJC += empPeriod.resNoJC || 0;
          periodData.ResWithJC += empPeriod.resWithJC || 0;
          periodData.SellOn += empPeriod.sellOn || 0;
          periodData.Formation += empPeriod.formation || 0;
        }
      });
      
      return periodData;
    });
  };

  // Calculate overall utilization based on selected filters
  const calculateOverallUtilization = () => {
    let totalChargeable = 0;
    let totalAvailable = 0;
    let employeeCount = 0;

    filteredData.forEach((employee) => {
      if (selectedPeriod) {
        // For specific period
        const periodData = employee.periods.find(
          (p) => p.period === selectedPeriod
        );
        if (periodData) {
          totalChargeable += periodData.chargeable;
          totalAvailable += periodData.total;
          employeeCount += 1;
        }
      } else {
        // For all periods
        totalChargeable += employee.totalChargeable;
        totalAvailable += employee.totalAvailable;
        employeeCount += 1;
      }
    });

    const utilization =
      totalAvailable > 0 ? (totalChargeable / totalAvailable) * 100 : 0;

    return {
      utilization,
      totalChargeable,
      totalAvailable,
      employeeCount,
      status: getUtilizationStatus(utilization),
    };
  };

  // Get utilization status distribution
  const getUtilizationStatusDistribution = () => {
    const statusCounts = {
      "very-good": 0,
      average: 0,
      "not-good": 0,
      terrible: 0,
    };

    filteredData.forEach((employee) => {
      let utilization;

      if (selectedPeriod) {
        // Get utilization for the selected period
        const periodData = employee.periods.find(
          (p) => p.period === selectedPeriod
        );
        utilization = periodData ? periodData.utilization : 0;
      } else {
        // Use average utilization across all periods
        utilization = employee.averageUtilization;
      }

      const status = getUtilizationStatus(utilization);
      statusCounts[status] += 1;
    });

    return Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: getUtilizationLabel(status),
        value: count,
        status,
        fill: getUtilizationColor(theme, status),
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

  const TimeBreakdownTooltip = ({ active, payload }) => {
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
            {payload[0].name}
          </Typography>
          {payload.map((entry, index) => (
            <Typography 
              key={`item-${index}`} 
              variant="body2" 
              sx={{ color: entry.color, mt: 1 }}
            >
              {`${entry.name}: ${entry.value.toFixed(1)} hours`}
            </Typography>
          ))}
        </Card>
      );
    }
    return null;
  };

  // Get the color based on utilization status
  const getStatusColor = (utilization) => {
    const status = getUtilizationStatus(utilization);
    return getUtilizationColor(theme, status);
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

  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
          p: 3,
        }}
      >
        <Alert severity="error" sx={{ mb: 2, width: "100%" }}>
          {error}
        </Alert>
        <Typography variant="body1" align="center">
          There was an error processing the staffing data. Please check your
          Excel file format and try again.
        </Typography>
      </Box>
    );
  }

  if (!dataLoaded || staffingData.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
          p: 3,
        }}
      >
        <Typography variant="h6" gutterBottom>
          No staffing data available
        </Typography>
        <Typography variant="body1" align="center">
          Please upload a staffing file to view staffing analytics.
        </Typography>
      </Box>
    );
  }

  // Prepare data based on current selections
  const teamUtilizationData = calculateTeamUtilization();
  const roleUtilizationData = calculateRoleUtilization();
  const teamUtilizationTrend = prepareTeamUtilizationTrendData();
  const timeBreakdownData = calculateTimeBreakdown();
  const timeStackedData = prepareTimeStackedData();
  const overallUtilization = calculateOverallUtilization();
  const utilizationDistribution = getUtilizationStatusDistribution();

  // Calculate color for overall utilization
  const overallUtilizationColor = getStatusColor(
    overallUtilization.utilization
  );

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
              <FormControl sx={{ minWidth: 150 }}>
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
              <FormControl sx={{ minWidth: 150 }}>
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

              {/* Period Filter */}
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel id="period-filter-label">Period</InputLabel>
                <Select
                  labelId="period-filter-label"
                  id="period-filter"
                  value={selectedPeriod}
                  label="Period"
                  onChange={handlePeriodChange}
                >
                  <MenuItem value="">All Periods</MenuItem>
                  {periods.map((period) => (
                    <MenuItem key={period} value={period}>
                      {period}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Employee Filter */}
              <Autocomplete
                id="employee-filter"
                options={employeeOptions}
                getOptionLabel={(option) => `${option.name} (${option.team})`}
                sx={{ minWidth: 250 }}
                value={selectedEmployee}
                onChange={handleEmployeeChange}
                renderInput={(params) => (
                  <TextField {...params} label="Employee" />
                )}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Top Row: KPIs */}
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
                {selectedPeriod && (
                  <Chip
                    label={`Period: ${selectedPeriod}`}
                    color="primary"
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
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

        {/* Utilization Distribution - Pie Chart */}
        <Grid item xs={12} md={4}>
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
              <Box sx={{ height: 230 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="20%" 
                    outerRadius="90%" 
                    barSize={20} 
                    data={utilizationDistribution}
                  >
                    <RadialBar
                      minAngle={15}
                      background
                      clockWise
                      dataKey="value"
                      cornerRadius={10}
                      label={{
                        position: 'insideStart',
                        fill: '#fff',
                        formatter: (value, entry) => `${entry.name}: ${value}`,
                      }}
                    />
                    <Legend 
                      iconSize={10} 
                      layout="vertical" 
                      verticalAlign="middle" 
                      wrapperStyle={{ 
                        right: 0, 
                        top: '50%', 
                        transform: 'translate(0, -50%)',
                        lineHeight: '24px'
                      }}
                      formatter={(value) => <span style={{ color: '#666' }}>{value}</span>}
                    />
                    <RechartsTooltip
                      formatter={(value, name) => [`${value} employees`, name]}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Time Breakdown - Improved Pie Chart */}
        <Grid item xs={12} md={5}>
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
                Time Allocation
                {selectedPeriod && (
                  <Chip
                    label={`Period: ${selectedPeriod}`}
                    color="primary"
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ height: 230 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      activeIndex={pieChartActiveIndex}
                      activeShape={renderActiveShape}
                      data={timeBreakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      onMouseEnter={onPieEnter}
                    >
                      {timeBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Middle Row: Team & Role Utilization */}
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
              pt: 2,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h6"
                fontWeight={700}
                color="text.primary"
                gutterBottom
              >
                Team Utilization
                {selectedPeriod && (
                  <Chip
                    label={`Period: ${selectedPeriod}`}
                    color="primary"
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={teamUtilizationData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
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
                    <Bar 
                      dataKey="utilization" 
                      name="Utilization Rate"
                      isAnimationActive={true}
                      animationBegin={0}
                      animationDuration={1000}
                      barSize={20}
                      radius={[0, 8, 8, 0]}
                    >
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
              </Box>
            </CardContent>
          </Card>
        </Grid>

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
              pt: 2,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h6"
                fontWeight={700}
                color="text.primary"
                gutterBottom
              >
                Role Utilization
                {selectedPeriod && (
                  <Chip
                    label={`Period: ${selectedPeriod}`}
                    color="primary"
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={roleUtilizationData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
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
                    <Bar 
                      dataKey="utilization" 
                      name="Utilization Rate"
                      isAnimationActive={true}
                      animationBegin={0}
                      animationDuration={1000}
                      barSize={20}
                      radius={[0, 8, 8, 0]}
                    >
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
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Bottom Row: Trends */}
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
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Team Utilization Trend
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
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
                    {teams.slice(0, 5).map((team, index) => (
                      <Line
                        key={team}
                        type="monotone"
                        dataKey={team}
                        name={team}
                        stroke={
                          COLORS[index % COLORS.length] ||
                          theme.palette.primary.main
                        }
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

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
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Time Allocation Trend
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={timeStackedData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <RechartsTooltip content={<TimeBreakdownTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="Chargeable"
                      stackId="1"
                      stroke={theme.palette.success.main}
                      fill={theme.palette.success.main}
                    />
                    <Area
                      type="monotone"
                      dataKey="Vacation"
                      stackId="1"
                      stroke={theme.palette.info.main}
                      fill={theme.palette.info.main}
                    />
                    <Area
                      type="monotone"
                      dataKey="LOA"
                      stackId="1"
                      stroke={theme.palette.warning.main}
                      fill={theme.palette.warning.main}
                    />
                    <Area
                      type="monotone"
                      dataKey="ResNoJC"
                      stackId="1"
                      stroke={theme.palette.secondary.main}
                      fill={theme.palette.secondary.main}
                    />
                    <Area
                      type="monotone"
                      dataKey="ResWithJC"
                      stackId="1"
                      stroke={theme.palette.primary.main}
                      fill={theme.palette.primary.main}
                    />
                    <Area
                      type="monotone"
                      dataKey="SellOn"
                      stackId="1"
                      stroke={theme.palette.error.light}
                      fill={theme.palette.error.light}
                    />
                    <Area
                      type="monotone"
                      dataKey="Formation"
                      stackId="1"
                      stroke={theme.palette.error.dark}
                      fill={theme.palette.error.dark}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Employee Table */}
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
                Employee Details
                {selectedPeriod && (
                  <Chip
                    label={`Period: ${selectedPeriod}`}
                    color="primary"
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
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
                    <TableCell>Arrival Date</TableCell>
                    <TableCell>Departure Date</TableCell>
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
                        Utilization
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">Chargeable Hours</TableCell>
                    <TableCell align="right">Available Hours</TableCell>
                    <TableCell align="right">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedData.map((employee) => {
                    let utilization, chargeable, available;

                    if (selectedPeriod) {
                      // Get data for selected period
                      const periodData = employee.periods.find(
                        (p) => p.period === selectedPeriod
                      );
                      utilization = periodData ? periodData.utilization : 0;
                      chargeable = periodData ? periodData.chargeable : 0;
                      available = periodData ? periodData.total : 0;
                    } else {
                      // Use average across all periods
                      utilization = employee.averageUtilization;
                      chargeable = employee.totalChargeable;
                      available = employee.totalAvailable;
                    }

                    const status = getUtilizationStatus(utilization);

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
                        <TableCell>
                          {formatDate(employee.arrivalDate)}
                        </TableCell>
                        <TableCell>
                          {formatDate(employee.departureDate)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: getUtilizationColor(theme, status),
                            fontWeight: 600,
                          }}
                        >
                          {utilization.toFixed(1)}%
                        </TableCell>
                        <TableCell align="right">
                          {chargeable.toFixed(1)}
                        </TableCell>
                        <TableCell align="right">
                          {available.toFixed(1)}
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

// Define chart colors
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#4CAF50",
  "#FF5722",
  "#673AB7",
  "#03A9F4",
  "#9C27B0",
  "#E91E63",
  "#009688",
];

export default StaffingTab;
