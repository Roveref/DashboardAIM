// Fix for the StaffingTab component
// The key error is that prepareTimeStackedData() is being called before filteredData is defined

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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Alert,
  IconButton,
  Tooltip,
  Collapse,
  Button,
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
  AreaChart,
  Area,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import InfoIcon from "@mui/icons-material/Info";
import ClearIcon from "@mui/icons-material/Clear";

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
          sellOn: parseNumeric(row[`Oth - Pending - ${period}`]),
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

    return date.toLocaleDateString('fr-FR');
  } catch (e) {
    return dateStr;
  }
};

const StaffingTab = ({ data, loading, staffingFileName, staffingFileData }) => {
  const [expandedRows, setExpandedRows] = useState({});

  const theme = useTheme();
  const [staffingData, setStaffingData] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [teams, setTeams] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "averageUtilization",
    direction: "desc",
  });
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeTimeIndex, setActiveTimeIndex] = useState(0);
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);

  const EmployeeDetailCard = ({ employee, selectedPeriod, theme }) => {
    // Prepare time allocation data across periods
    const timeAllocationData = employee.periods.map((period) => {
      // Calculate remaining available hours
      const totalAllocated =
        period.chargeable +
        period.sellOn +
        period.resWithJC +
        period.resNoJC +
        period.formation;
      const remainingAvailable = period.total - totalAllocated;

      return {
        period: period.period,
        chargeable: period.chargeable,
        pending: period.sellOn,
        resWithJC: period.resWithJC,
        resNoJC: period.resNoJC,
        formation: period.formation,
        netAvailable: period.total,
        remainingAvailable: remainingAvailable,
        vacation: period.vacation,
        loa: period.loa,
        utilization:
          period.total > 0 ? (period.chargeable / period.total) * 100 : 0,
      };
    });

    // Define hour types with labels and colors
    const hourTypes = [
      {
        key: "netAvailable",
        label: "Net Available",
        color: theme.palette.text.primary,
        indent: 0,
      },
      {
        key: "chargeable",
        label: "Chargeable",
        color: theme.palette.success.main,
        indent: 1,
      },
      {
        key: "pending",
        label: "Pending",
        color: theme.palette.primary.light,
        indent: 1,
      },
      {
        key: "resWithJC",
        label: "Res w/ JC",
        color: theme.palette.primary.main,
        indent: 1,
      },
      {
        key: "resNoJC",
        label: "Res w/o JC",
        color: theme.palette.primary.dark,
        indent: 1,
      },
      {
        key: "formation",
        label: "Formation",
        color: theme.palette.grey[500],
        indent: 1,
      },
      {
        key: "remainingAvailable",
        label: "Remaining Available",
        color: theme.palette.info.main,
        indent: 0,
      },
      {
        key: "vacation",
        label: "Vacation",
        color: theme.palette.warning.light,
        indent: 0,
      },
      {
        key: "loa",
        label: "LOA",
        color: theme.palette.warning.main,
        indent: 0,
      },
    ];

    const currentPeriodData =
      timeAllocationData.find((period) => period.period === selectedPeriod) ||
      timeAllocationData[0];

    return (
      <Card
        variant="outlined"
        sx={{
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.08)}`,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 2.5,
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
            borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {employee.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {employee.team} • {employee.role}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="body2" color="text.secondary">
              Avg Utilization: {employee.averageUtilization.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="success.main">
              Current Period Chargeable:{" "}
              {currentPeriodData.chargeable.toFixed(1)} hrs
            </Typography>
            <Typography variant="body2" color="info.main">
              Remaining Available:{" "}
              {currentPeriodData.remainingAvailable.toFixed(1)} hrs
            </Typography>
          </Box>
        </Box>

        {/* Pivoted Time Allocation Table */}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Hour Type</TableCell>
                {timeAllocationData.map((period) => (
                  <TableCell
                    key={period.period}
                    align="right"
                    sx={{
                      fontWeight: period.period === selectedPeriod ? 600 : 400,
                      color:
                        period.period === selectedPeriod
                          ? theme.palette.primary.main
                          : "inherit",
                    }}
                  >
                    {period.period}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {hourTypes.map((hourType) => (
                <TableRow key={hourType.key}>
                  <TableCell>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        ml: hourType.indent * 2,
                      }}
                    >
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: hourType.color,
                          mr: 1,
                        }}
                      />
                      <Typography variant="body2">
                        {hourType.indent > 0 && "- "}
                        {hourType.label}
                      </Typography>
                    </Box>
                  </TableCell>
                  {timeAllocationData.map((period) => (
                    <TableCell
                      key={period.period}
                      align="right"
                      sx={{
                        color: hourType.color,
                        fontWeight:
                          period.period === selectedPeriod ? 600 : 400,
                      }}
                    >
                      {period[hourType.key].toFixed(1)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {/* Utilization Row */}
              <TableRow>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    Utilization
                  </Typography>
                </TableCell>
                {timeAllocationData.map((period) => (
                  <TableCell key={period.period} align="right">
                    <Chip
                      label={`${period.utilization.toFixed(1)}%`}
                      size="small"
                      color={
                        period.utilization > 75
                          ? "success"
                          : period.utilization > 65
                          ? "warning"
                          : period.utilization > 55
                          ? "info"
                          : "error"
                      }
                      variant="outlined"
                    />
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    );
  };

  const toggleRowExpansion = (employeeName) => {
    setExpandedRows((prev) => ({
      ...prev,
      [employeeName]: !prev[employeeName],
    }));
  };

  // Add keyboard navigation for expanded rows
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Close all expanded rows when Escape is pressed
      if (event.key === "Escape") {
        setExpandedRows({});
      }
    };

    // Add event listener
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup event listener
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Helper function to create proper waterfall chart data with running totals
  const createWaterfallData = (metrics) => {
    // Initialize data array with a starting point
    const data = [
      {
        name: "Base",
        value: 0,
        fill: "#e0e0e0",
        isStartEnd: true,
        displayValue: 0,
        barValue: 0,
      },
    ];

    // Track running total
    let runningTotal = 0;

    // Add each component with its contribution
    const components = [
      {
        name: "Chargeable",
        value: metrics.totalChargeable,
        fill: "#2e7d32", // success.main
        contribution: (
          (metrics.totalChargeable / metrics.totalNetAvailable) *
          100
        ).toFixed(1),
      },
      {
        name: "Pending",
        value: metrics.totalSellOn,
        fill: "#1976d2", // primary.main
        contribution: (
          (metrics.totalSellOn / metrics.totalNetAvailable) *
          100
        ).toFixed(1),
      },
      {
        name: "Res w/ JC",
        value: metrics.totalResWithJC,
        fill: "#7b1fa2", // purple[700]
        contribution: (
          (metrics.totalResWithJC / metrics.totalNetAvailable) *
          100
        ).toFixed(1),
      },
      {
        name: "Res w/o JC",
        value: metrics.totalResNoJC,
        fill: "#9c27b0", // purple[500]
        contribution: (
          (metrics.totalResNoJC / metrics.totalNetAvailable) *
          100
        ).toFixed(1),
      },
      {
        name: "Formation",
        value: metrics.totalFormation,
        fill: "#757575", // grey[600]
        contribution: (
          (metrics.totalFormation / metrics.totalNetAvailable) *
          100
        ).toFixed(1),
      },
    ];

    // Process each component
    components.forEach((component) => {
      // Store the original value for display
      const displayValue = component.value;

      // Update running total
      runningTotal += component.value;

      // Add to the data array with the calculated values
      data.push({
        ...component,
        displayValue, // Original value for tooltip
        runningTotal, // Current total after this component
        previousTotal: runningTotal - displayValue, // Total before this component
        barValue: component.value, // Actual bar height
      });
    });

    // Add final total bar
    data.push({
      name: "Total",
      value: metrics.totalNetAvailable,
      fill: "#0288d1", // blue[600]
      isStartEnd: true,
      displayValue: metrics.totalNetAvailable,
      barValue: metrics.totalNetAvailable,
      runningTotal: metrics.totalNetAvailable,
    });

    return data;
  };

  // Enhanced tooltip for waterfall chart
  const WaterfallTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const theme = useTheme();
      const item = payload[0].payload;

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
            {item.name}
          </Typography>

          {item.isStartEnd ? (
            item.name === "Base" ? (
              <Typography variant="body2">Starting point: 0 hours</Typography>
            ) : (
              <Typography variant="body2">
                Total: {item.displayValue.toFixed(1)} hours (100%)
              </Typography>
            )
          ) : (
            <>
              <Typography variant="body2">
                {item.displayValue.toFixed(1)} hours ({item.contribution}%)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Running total: {item.runningTotal.toFixed(1)} hours
              </Typography>
            </>
          )}
        </Card>
      );
    }
    return null;
  };

  // Improved vertical waterfall chart component
  const UtilizationWaterfallChart = ({ metrics }) => {
    const theme = useTheme();

    // Prepare waterfall data
    const waterfallData = createWaterfallData(metrics);

    // Create a reference array for dashed lines (connecting segments)
    const connectingReferences = [];
    for (let i = 1; i < waterfallData.length; i++) {
      const prevItem = waterfallData[i - 1];
      const currentItem = waterfallData[i];

      if (!currentItem.isStartEnd && i < waterfallData.length - 1) {
        connectingReferences.push({
          x1: i - 0.2,
          y1: prevItem.runningTotal,
          x2: i + 0.2,
          y2: prevItem.runningTotal,
          key: `connector-${i}`,
        });
      }
    }

    return (
      <Box sx={{ height: 400, mt: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={waterfallData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={{ stroke: theme.palette.divider }}
            />
            <YAxis
              tickFormatter={(value) => value.toLocaleString()}
              axisLine={{ stroke: theme.palette.divider }}
            />
            <RechartsTooltip content={<WaterfallTooltip />} />

            {/* Main bars */}
            {waterfallData.map((entry, index) => (
              <Bar
                key={`bar-${index}`}
                dataKey="barValue"
                fill={entry.fill}
                stackId="stack"
                isAnimationActive={false}
                name={entry.name}
                legendType="none"
                baseValue={entry.previousTotal || 0}
                radius={[4, 4, 0, 0]}
              >
                <Cell />
              </Bar>
            ))}

            {/* Add reference lines for connecting segments */}
            {connectingReferences.map((ref) => (
              <ReferenceLine
                key={ref.key}
                segment={{ x: ref.x1, y: ref.y1, x2: ref.x2, y2: ref.y2 }}
                stroke="#888"
                strokeDasharray="3 3"
                ifOverflow="extendDomain"
              />
            ))}

            <Legend />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    );
  };

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
  };

  const handleRoleChange = (event) => {
    setSelectedRole(event.target.value);
  };

  const handlePeriodChange = (event) => {
    setSelectedPeriod(event.target.value);
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
    return true;
  });

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

  const prepareNormalizedTimeStackedData = () => {
    return periods.map((period) => {
      const periodData = { period };

      // Initialize with zero values
      periodData.Chargeable = 0;
      periodData.SellOn = 0;
      periodData.ResWithJC = 0;
      periodData.ResNoJC = 0;
      periodData.Formation = 0;

      // Store original hour values for tooltip
      periodData.Chargeable_Hours = 0;
      periodData.SellOn_Hours = 0;
      periodData.ResWithJC_Hours = 0;
      periodData.ResNoJC_Hours = 0;
      periodData.Formation_Hours = 0;

      // Calculate totals for this period
      let netAvailable = 0;

      filteredData.forEach((employee) => {
        const empPeriod = employee.periods.find((p) => p.period === period);
        if (empPeriod) {
          periodData.Chargeable_Hours += empPeriod.chargeable || 0;
          periodData.SellOn_Hours += empPeriod.sellOn || 0;
          periodData.ResWithJC_Hours += empPeriod.resWithJC || 0;
          periodData.ResNoJC_Hours += empPeriod.resNoJC || 0;
          periodData.Formation_Hours += empPeriod.formation || 0;

          // Calculate net available total
          netAvailable += empPeriod.total || 0;
        }
      });

      // Store the net available for reference
      periodData.NetAvailable = netAvailable;

      // Convert to percentages
      if (netAvailable > 0) {
        periodData.Chargeable =
          (periodData.Chargeable_Hours / netAvailable) * 100;
        periodData.SellOn = (periodData.SellOn_Hours / netAvailable) * 100;
        periodData.ResWithJC =
          (periodData.ResWithJC_Hours / netAvailable) * 100;
        periodData.ResNoJC = (periodData.ResNoJC_Hours / netAvailable) * 100;
        periodData.Formation =
          (periodData.Formation_Hours / netAvailable) * 100;
      }

      return periodData;
    });
  };

  const EnhancedColumnTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const periodData = payload[0].payload;

      // Calculate column totals
      const revenueTotal =
        (periodData.Chargeable_Hours || 0) + (periodData.SellOn_Hours || 0);
      const reservationsTotal =
        (periodData.ResWithJC_Hours || 0) + (periodData.ResNoJC_Hours || 0);
      const otherTotal = periodData.Formation_Hours || 0;

      // Calculate column percentages
      const revenueTotalPct =
        periodData.NetAvailable > 0
          ? (revenueTotal / periodData.NetAvailable) * 100
          : 0;
      const reservationsTotalPct =
        periodData.NetAvailable > 0
          ? (reservationsTotal / periodData.NetAvailable) * 100
          : 0;
      const otherTotalPct =
        periodData.NetAvailable > 0
          ? (otherTotal / periodData.NetAvailable) * 100
          : 0;

      return (
        <Card
          sx={{
            p: 1.5,
            backgroundColor: "white",
            border: "1px solid",
            borderColor: alpha(theme.palette.primary.main, 0.1),
            boxShadow: theme.shadows[3],
            borderRadius: 2,
            minWidth: 500,
          }}
        >
          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={{ pb: 1, borderBottom: "1px solid", borderColor: "divider" }}
          >
            Period: {periodData.period} - Total Net Available:{" "}
            {periodData.NetAvailable.toFixed(1)} hours
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 1.5,
              my: 1.5,
            }}
          >
            {/* Revenue Column */}
            <Box>
              <Typography
                variant="body2"
                fontWeight={600}
                color="primary.main"
                sx={{ mb: 0.75 }}
              >
                Revenue-Generating
              </Typography>

              <Box sx={{ mb: 0.5 }}>
                <Typography variant="body2" color="success.main">
                  Chargeable:
                </Typography>
                <Typography variant="body2">
                  {periodData.Chargeable_Hours?.toFixed(1) || 0} hours (
                  {periodData.Chargeable?.toFixed(1) || 0}%)
                </Typography>
              </Box>

              <Box sx={{ mb: 0.5 }}>
                <Typography variant="body2" color="primary.light">
                  Pending:
                </Typography>
                <Typography variant="body2">
                  {periodData.SellOn_Hours?.toFixed(1) || 0} hours (
                  {periodData.SellOn?.toFixed(1) || 0}%)
                </Typography>
              </Box>

              <Box
                sx={{
                  mt: 1,
                  pt: 0.5,
                  borderTop: "1px dotted",
                  borderColor: "divider",
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  Column Total:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {revenueTotal.toFixed(1)} hours ({revenueTotalPct.toFixed(1)}
                  %)
                </Typography>
              </Box>
            </Box>

            {/* Reservations Column */}
            <Box>
              <Typography
                variant="body2"
                fontWeight={600}
                color="secondary.main"
                sx={{ mb: 0.75 }}
              >
                Reservations
              </Typography>

              <Box sx={{ mb: 0.5 }}>
                <Typography variant="body2" color="primary.main">
                  Res w/ JC:
                </Typography>
                <Typography variant="body2">
                  {periodData.ResWithJC_Hours?.toFixed(1) || 0} hours (
                  {periodData.ResWithJC?.toFixed(1) || 0}%)
                </Typography>
              </Box>

              <Box sx={{ mb: 0.5 }}>
                <Typography variant="body2" color="primary.dark">
                  Res w/o JC:
                </Typography>
                <Typography variant="body2">
                  {periodData.ResNoJC_Hours?.toFixed(1) || 0} hours (
                  {periodData.ResNoJC?.toFixed(1) || 0}%)
                </Typography>
              </Box>

              <Box
                sx={{
                  mt: 1,
                  pt: 0.5,
                  borderTop: "1px dotted",
                  borderColor: "divider",
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  Column Total:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {reservationsTotal.toFixed(1)} hours (
                  {reservationsTotalPct.toFixed(1)}%)
                </Typography>
              </Box>
            </Box>

            {/* Other Categories Column */}
            <Box>
              <Typography
                variant="body2"
                fontWeight={600}
                color="warning.main"
                sx={{ mb: 0.75 }}
              >
                Other Categories
              </Typography>

              <Box sx={{ mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Formation:
                </Typography>
                <Typography variant="body2">
                  {periodData.Formation_Hours?.toFixed(1) || 0} hours (
                  {periodData.Formation?.toFixed(1) || 0}%)
                </Typography>
              </Box>

              <Box
                sx={{
                  mt: 1,
                  pt: 0.5,
                  borderTop: "1px dotted",
                  borderColor: "divider",
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  Column Total:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {otherTotal.toFixed(1)} hours ({otherTotalPct.toFixed(1)}%)
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              mt: 1,
              pt: 0.75,
              borderTop: "1px solid",
              borderColor: "divider",
              textAlign: "right",
            }}
          >
            <Typography variant="body2" fontWeight={600}>
              Grand Total:{" "}
              {(revenueTotal + reservationsTotal + otherTotal).toFixed(1)} hours
              (
              {(revenueTotalPct + reservationsTotalPct + otherTotalPct).toFixed(
                1
              )}
              %)
            </Typography>
          </Box>
        </Card>
      );
    }

    return null;
  };

  // Add this enhanced tooltip component
  const EnhancedTimeBreakdownTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const periodData = payload[0].payload;

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
            Period: {periodData.period}
          </Typography>

          {payload.map((entry) => {
            // Skip non-display fields
            if (
              entry.dataKey.endsWith("_Hours") ||
              entry.dataKey === "NetAvailable" ||
              entry.dataKey === "period"
            ) {
              return null;
            }

            // Get the corresponding hours value
            const hours = periodData[`${entry.dataKey}_Hours`] || 0;
            const percentage = entry.value || 0;

            return (
              <Typography
                key={entry.dataKey}
                variant="body2"
                sx={{
                  mt: 1,
                  color: entry.color,
                }}
              >
                {entry.name}: {hours.toFixed(1)} hours ({percentage.toFixed(1)}
                %)
              </Typography>
            );
          })}

          <Typography variant="body2" sx={{ mt: 1.5, fontStyle: "italic" }}>
            Total Net Available: {periodData.NetAvailable.toFixed(1)} hours
          </Typography>
        </Card>
      );
    }
    return null;
  };

  // Prepare time stacked data for the area chart
  const prepareTimeStackedData = () => {
    return periods.map((period) => {
      const periodData = { period };

      // Initialize all categories with zero
      // 1. Most important - what we can charge clients
      periodData.Chargeable = 0;

      // 2. Second tier - potential bookable hours
      periodData.SellOn = 0;
      periodData.ResWithJC = 0;
      periodData.ResNoJC = 0;

      // 3. Third tier - non-chargeable but still working
      periodData.Formation = 0;

      // 4. Time off
      periodData.Vacation = 0;
      periodData.LOA = 0;

      // 5. Totals for rates
      periodData.NetAvailable = 0;
      periodData.TotalAvailable = 0;
      periodData.TU = 0;
      periodData.TP = 0;
      periodData.OptimalTU = 0;

      // Calculate totals for this period
      filteredData.forEach((employee) => {
        const empPeriod = employee.periods.find((p) => p.period === period);
        if (empPeriod) {
          periodData.Chargeable += empPeriod.chargeable || 0;
          periodData.SellOn += empPeriod.sellOn || 0;
          periodData.ResWithJC += empPeriod.resWithJC || 0;
          periodData.ResNoJC += empPeriod.resNoJC || 0;
          periodData.Formation += empPeriod.formation || 0;
          periodData.Vacation += empPeriod.vacation || 0;
          periodData.LOA += empPeriod.loa || 0;

          // Calculate totals
          periodData.NetAvailable += empPeriod.total || 0;
        }
      });

      // Calculate total available hours
      periodData.TotalAvailable =
        periodData.NetAvailable + periodData.Vacation + periodData.LOA;

      // Calculate potential bookable
      const potentialBookable =
        periodData.Chargeable +
        periodData.SellOn +
        periodData.ResWithJC +
        periodData.ResNoJC;

      // Calculate rates
      periodData.TU =
        periodData.NetAvailable > 0
          ? (periodData.Chargeable / periodData.NetAvailable) * 100
          : 0;

      periodData.TP =
        periodData.TotalAvailable > 0
          ? (periodData.Chargeable / periodData.TotalAvailable) * 100
          : 0;

      periodData.OptimalTU =
        periodData.NetAvailable > 0
          ? (potentialBookable / periodData.NetAvailable) * 100
          : 0;

      return periodData;
    });
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

  const calculateBusinessMetrics = () => {
    let totalChargeable = 0;
    let totalVacation = 0;
    let totalLOA = 0;
    let totalResNoJC = 0;
    let totalResWithJC = 0;
    let totalSellOn = 0;
    let totalFormation = 0;
    let totalNetAvailable = 0; // This is "Total" in the Excel (net available hours after VAC & LOA)

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
          totalNetAvailable += periodData.total;
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
        totalNetAvailable += employee.totalAvailable;
      }
    });

    // Calculate business metrics
    const totalAvailableHours = totalNetAvailable + totalVacation + totalLOA;
    const potentialBookableHours =
      totalChargeable + totalResNoJC + totalResWithJC + totalSellOn;
    const nonChargeableHours = totalFormation;

    // Calculate rates
    const tu =
      totalNetAvailable > 0 ? (totalChargeable / totalNetAvailable) * 100 : 0;
    const tp =
      totalAvailableHours > 0
        ? (totalChargeable / totalAvailableHours) * 100
        : 0;
    const optimalTu =
      totalNetAvailable > 0
        ? (potentialBookableHours / totalNetAvailable) * 100
        : 0;

    return {
      // Hours metrics
      totalChargeable,
      totalVacation,
      totalLOA,
      totalResNoJC,
      totalResWithJC,
      totalSellOn,
      totalFormation,
      totalNetAvailable,
      totalAvailableHours,
      potentialBookableHours,
      nonChargeableHours,

      // Rate metrics
      tu,
      tp,
      optimalTu,

      // Status metrics
      tuStatus: getUtilizationStatus(tu),
      tpStatus: getUtilizationStatus(tp),
      optimalTuStatus: getUtilizationStatus(optimalTu),

      // Employee count
      employeeCount: filteredData.length,
    };
  };
  // Calculate time breakdown by category (chargeable, vacation, LOA, etc.)
  const calculateTimeBreakdown = () => {
    const metrics = calculateBusinessMetrics();

    // Prepare data for stacked bar chart with clear grouping
    return [
      {
        name: "Time Allocation",
        // Most important - what we can charge clients
        Chargeable: metrics.totalChargeable,

        // Second tier - potential bookable hours
        Pending: metrics.totalSellOn,
        "Reservation (with JC)": metrics.totalResWithJC,
        "Reservation (no JC)": metrics.totalResNoJC,

        // Third tier - non-chargeable but still working
        Formation: metrics.totalFormation,

        // Time off - not included in net available
        "Leave of Absence": metrics.totalLOA,
        Vacation: metrics.totalVacation,

        // Totals for reference
        netAvailable: metrics.totalNetAvailable,
        totalAvailable: metrics.totalAvailableHours,
      },
    ];
  };

  // Calculate overall utilization based on selected filters
  const calculateOverallUtilization = () => {
    const metrics = calculateBusinessMetrics();

    return {
      // Traditional utilization (TU)
      utilization: metrics.tu,
      status: metrics.tuStatus,

      // Production rate (TP)
      productionRate: metrics.tp,
      productionStatus: metrics.tpStatus,

      // Optimal utilization
      optimalUtilization: metrics.optimalTu,
      optimalStatus: metrics.optimalTuStatus,

      // Hours
      totalChargeable: metrics.totalChargeable,
      totalNetAvailable: metrics.totalNetAvailable,
      totalAvailableHours: metrics.totalAvailableHours,
      potentialBookable: metrics.potentialBookableHours,

      // Employee count
      employeeCount: metrics.employeeCount,
    };
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
            <Typography key={`item-${index}`} variant="body2" sx={{ mt: 1 }}>
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
  const roleUtilizationData = calculateRoleUtilization();
  const teamUtilizationTrend = prepareTeamUtilizationTrendData();
  const timeBreakdownData = calculateTimeBreakdown();
  const timeStackedData = prepareTimeStackedData();
  const overallUtilization = calculateOverallUtilization();

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
            </Box>
          </Paper>
        </Grid>
        {/* Top Row: KPIs */}
        <Grid item xs={12}>
          <Card
            sx={{
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
                Utilization Metrics
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

              {/* Three metrics boxes in a row */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: alpha(
                        getStatusColor(overallUtilization.utilization),
                        0.1
                      ),
                      border: "1px solid",
                      borderColor: alpha(
                        getStatusColor(overallUtilization.utilization),
                        0.2
                      ),
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      TU (Taux d'Utilisation)
                    </Typography>
                    <Typography
                      variant="h4"
                      fontWeight={700}
                      sx={{
                        color: getStatusColor(overallUtilization.utilization),
                      }}
                    >
                      {overallUtilization.utilization.toFixed(1)}%
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: getStatusColor(overallUtilization.utilization),
                      }}
                    >
                      Chargeable / Net Available
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: alpha(
                        getStatusColor(overallUtilization.productionRate),
                        0.1
                      ),
                      border: "1px solid",
                      borderColor: alpha(
                        getStatusColor(overallUtilization.productionRate),
                        0.2
                      ),
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      TP (Taux de Production)
                    </Typography>
                    <Typography
                      variant="h4"
                      fontWeight={700}
                      sx={{
                        color: getStatusColor(
                          overallUtilization.productionRate
                        ),
                      }}
                    >
                      {overallUtilization.productionRate.toFixed(1)}%
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: getStatusColor(
                          overallUtilization.productionRate
                        ),
                      }}
                    >
                      Chargeable / Available Hours
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: alpha(
                        getStatusColor(overallUtilization.optimalUtilization),
                        0.1
                      ),
                      border: "1px solid",
                      borderColor: alpha(
                        getStatusColor(overallUtilization.optimalUtilization),
                        0.2
                      ),
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Optimal TU
                    </Typography>
                    <Typography
                      variant="h4"
                      fontWeight={700}
                      sx={{
                        color: getStatusColor(
                          overallUtilization.optimalUtilization
                        ),
                      }}
                    >
                      {overallUtilization.optimalUtilization.toFixed(1)}%
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: getStatusColor(
                          overallUtilization.optimalUtilization
                        ),
                      }}
                    >
                      Potential Bookable / Net Available
                    </Typography>
                  </Box>
                </Grid>
              </Grid>


              {/* Hours breakdown */}
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Hours Summary
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Chargeable Hours
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {overallUtilization.totalChargeable.toFixed(1)} hrs
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Net Available Hours
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {overallUtilization.totalNetAvailable.toFixed(1)} hrs
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Potential Bookable
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {overallUtilization.potentialBookable.toFixed(1)} hrs
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Available Hours (incl. VAC+LOA)
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {overallUtilization.totalAvailableHours.toFixed(1)} hrs
                  </Typography>
                </Grid>
              </Grid>

              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: alpha(theme.palette.info.main, 0.1),
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {overallUtilization.employeeCount} employees •{" "}
                  {selectedPeriod || "All periods"}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={12}>
          <Card
            sx={{
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
                Utilization Rate Trends
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timeStackedData}
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

                    {/* TU - Taux d'Utilisation */}
                    <Line
                      type="monotone"
                      dataKey="TU"
                      name="TU"
                      stroke={theme.palette.success.main}
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 8 }}
                    />

                    {/* TP - Taux de Production */}
                    <Line
                      type="monotone"
                      dataKey="TP"
                      name="TP"
                      stroke={theme.palette.info.main}
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      dot={{ r: 4, strokeWidth: 2 }}
                    />

                    {/* Optimal TU */}
                    <Line
                      type="monotone"
                      dataKey="OptimalTU"
                      name="Optimal TU"
                      stroke={theme.palette.secondary.main}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card
            sx={{
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
                Time Allocation Trend (% of Net Available)
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  This chart shows how time allocation evolves across periods as
                  a percentage of net available hours. Chargeable time and
                  potential bookable hours are highlighted as the most important
                  metrics.
                </Typography>
              </Box>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={prepareNormalizedTimeStackedData()}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <RechartsTooltip content={<EnhancedColumnTooltip />} />
                    <Legend />

                    {/* 1. Most important - what we can charge clients */}
                    <Area
                      type="monotone"
                      dataKey="Chargeable"
                      stackId="1"
                      stroke={theme.palette.success.main}
                      fill={theme.palette.success.main}
                      name="Chargeable"
                    />

                    {/* 2. Second tier - potential bookable hours */}
                    <Area
                      type="monotone"
                      dataKey="SellOn"
                      stackId="1"
                      stroke={theme.palette.primary.light}
                      fill={theme.palette.primary.light}
                      name="Pending"
                    />
                    <Area
                      type="monotone"
                      dataKey="ResWithJC"
                      stackId="1"
                      stroke={theme.palette.primary.main}
                      fill={theme.palette.primary.main}
                      name="Res w/ JC"
                    />
                    <Area
                      type="monotone"
                      dataKey="ResNoJC"
                      stackId="1"
                      stroke={theme.palette.primary.dark}
                      fill={theme.palette.primary.dark}
                      name="Res w/o JC"
                    />

                    {/* 3. Third tier - non-chargeable */}
                    <Area
                      type="monotone"
                      dataKey="Formation"
                      stackId="1"
                      stroke={theme.palette.grey[400]}
                      fill={theme.palette.grey[400]}
                      name="Formation"
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
                    <TableCell
                      padding="checkbox"
                      sx={{ width: 48, minWidth: 48, maxWidth: 48 }}
                    >
                      <Tooltip title="Click rows to view details">
                        <IconButton size="small">
                          <KeyboardArrowDownIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
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
                    <TableCell align="right">Net Available</TableCell>
                    <TableCell align="right">Chargeable</TableCell>
                    <TableCell align="right">Pending</TableCell>
                    <TableCell align="right">Res w/ JC</TableCell>
                    <TableCell align="right">Res w/o JC</TableCell>
                    <TableCell align="right">Remaining</TableCell>
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
                    <TableCell align="right">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedData.map((employee) => {
                    let periodData;
                    if (selectedPeriod) {
                      periodData = employee.periods.find(
                        (p) => p.period === selectedPeriod
                      );
                    }

                    // If no period data, use overall averages
                    const netAvailable = periodData
                      ? periodData.total
                      : employee.totalAvailable;
                    const chargeable = periodData
                      ? periodData.chargeable
                      : employee.totalChargeable;
                    const pending = periodData
                      ? periodData.sellOn
                      : employee.totalSellOn;
                    const resWithJC = periodData
                      ? periodData.resWithJC
                      : employee.totalResWithJC;
                    const resNoJC = periodData
                      ? periodData.resNoJC
                      : employee.totalResNoJC;

                    // Calculate remaining available
                    const totalAllocated =
                      chargeable + pending + resWithJC + resNoJC;
                    const remainingAvailable = netAvailable - totalAllocated;

                    const utilization = periodData
                      ? periodData.utilization
                      : employee.averageUtilization;
                    const status = getUtilizationStatus(utilization);
                    const isExpanded = expandedRows[employee.name];

                    return (
                      <React.Fragment key={employee.name}>
                        <TableRow
                          hover
                          sx={{
                            "&:last-child td, &:last-child th": { border: 0 },
                            cursor: "pointer",
                            backgroundColor: isExpanded
                              ? alpha(theme.palette.primary.main, 0.04)
                              : "inherit",
                            transition: "background-color 0.2s",
                            "&:hover": {
                              backgroundColor: isExpanded
                                ? alpha(theme.palette.primary.main, 0.06)
                                : alpha(theme.palette.primary.main, 0.02),
                            },
                          }}
                          onClick={() => toggleRowExpansion(employee.name)}
                        >
                          <TableCell padding="checkbox">
                            <IconButton size="small">
                              {isExpanded ? (
                                <KeyboardArrowUpIcon />
                              ) : (
                                <KeyboardArrowDownIcon />
                              )}
                            </IconButton>
                          </TableCell>
                          <TableCell component="th" scope="row">
                            {employee.name}
                          </TableCell>
                          <TableCell>{employee.team}</TableCell>
                          <TableCell>{employee.role}</TableCell>
                          <TableCell align="right">
                            {netAvailable.toFixed(1)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ color: theme.palette.success.main }}
                          >
                            {chargeable.toFixed(1)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ color: theme.palette.primary.light }}
                          >
                            {pending.toFixed(1)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ color: theme.palette.primary.main }}
                          >
                            {resWithJC.toFixed(1)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ color: theme.palette.primary.dark }}
                          >
                            {resNoJC.toFixed(1)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ color: theme.palette.info.main }}
                          >
                            {remainingAvailable.toFixed(1)}
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
                        <TableRow>
                          <TableCell
                            style={{ paddingBottom: 0, paddingTop: 0 }}
                            colSpan={10}
                          >
                            <Collapse
                              in={isExpanded}
                              timeout="auto"
                              unmountOnExit
                            >
                              <Box sx={{ m: 2 }}>
                                <EmployeeDetailCard
                                  employee={employee}
                                  selectedPeriod={selectedPeriod}
                                  theme={theme}
                                />
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            {Object.keys(expandedRows).length > 0 && (
              <>
                <Box
                  sx={{
                    p: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    borderTop: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.1
                    )}`,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <InfoIcon color="primary" fontSize="small" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Tip: Click row again to collapse, or use Esc key to close
                      all expanded rows
                    </Typography>
                  </Box>
                  <Button
                    variant="text"
                    color="primary"
                    size="small"
                    onClick={() => setExpandedRows({})}
                  >
                    Close All
                  </Button>
                </Box>
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    borderTop: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.1
                    )}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {Object.keys(expandedRows).length} employee
                    {Object.keys(expandedRows).length > 1 ? "s" : ""} expanded
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Tooltip title="Close all expanded rows">
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        onClick={() => setExpandedRows({})}
                        startIcon={<ClearIcon />}
                      >
                        Close All
                      </Button>
                    </Tooltip>
                  </Box>
                </Box>
              </>
            )}
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
