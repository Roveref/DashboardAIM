import React, { useState, useEffect } from "react";
import {
  Tabs,
  Tab,
  Box,
  Typography,
  ThemeProvider,
  CssBaseline,
  Alert,
  Snackbar,
  AppBar,
  Toolbar,
  Paper,
  Fade,
  useMediaQuery,
  Drawer,
  Divider,
  ToggleButton,
  Button,
  TextField,
  Autocomplete,
  Chip,
} from "@mui/material";
import { alpha, darken, lighten } from "@mui/material/styles";
import ClearIcon from "@mui/icons-material/Clear";
import PipelineTab from "./components/PipelineTab";
import BookingsTab from "./components/BookingsTab";
import ServiceLinesTab from "./components/ServiceLinesTab";
import FilterPanel from "./components/FilterPanel";
import FileUploader from "./components/FileUploader";
import { processExcelData, getUniqueValues } from "./utils/dataUtils";
import theme from "./theme";
import JobcodeTimelineTab from "./components/JobcodeTimelineTab";

// Sidebar width definition
const LEFT_DRAWER_WIDTH = 240;
const RIGHT_DRAWER_WIDTH = 240;

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filters, setFilters] = useState({
    subSegmentCodes: [],
    subSegments: [],
    serviceLine1: [],
    accounts: [],
    status: [],
    manager: [],
    partner: [],
  });
  const [loading, setLoading] = useState(false);
  const [selectedOpportunities, setSelectedOpportunities] = useState([]);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [currentFile, setCurrentFile] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    subSegmentCodes: [],
    subSegments: [],
    serviceLine1: [],
    accounts: [],
  });

  // Store the mapping of segment codes to sub segments
  const [segmentToSubSegmentMap, setSegmentToSubSegmentMap] = useState({});

  // Filtered sub segments based on selected segment codes
  const [filteredSubSegments, setFilteredSubSegments] = useState([]);

  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const handleFileUploaded = async (fileName, fileData) => {
    try {
      setLoading(true);
      setCurrentFile(fileName);

      // Process the uploaded Excel file
      const processedData = await processExcelData(fileData);

      // Ensure processedData is an array
      const safeProcessedData = Array.isArray(processedData)
        ? processedData
        : [];

      setData(safeProcessedData);
      setFilteredData(safeProcessedData);

      // Create mapping of segment codes to sub segments with proper error checking
      const segmentMapping = {};

      safeProcessedData.forEach((item) => {
        const code = item?.["Sub Segment Code"];
        const subSegment = item?.["Sub Segment"];

        if (code && subSegment) {
          if (!segmentMapping[code]) {
            segmentMapping[code] = new Set();
          }
          segmentMapping[code].add(subSegment);
        }
      });

      // Convert sets to arrays
      Object.keys(segmentMapping).forEach((key) => {
        segmentMapping[key] = Array.from(segmentMapping[key]);
      });

      setSegmentToSubSegmentMap(segmentMapping);

      // Set filter options with proper error checking
      setFilterOptions({
        subSegmentCodes: getUniqueValues(safeProcessedData, "Sub Segment Code"),
        subSegments: getUniqueValues(safeProcessedData, "Sub Segment"),
        serviceLine1: getUniqueValues(safeProcessedData, "Service Line 1"),
        accounts: getUniqueValues(safeProcessedData, "Account"),
      });

      setNotification({
        open: true,
        message: `Successfully loaded ${safeProcessedData.length} opportunities from ${fileName}`,
        severity: "success",
      });
    } catch (error) {
      console.error("Error processing file:", error);
      setNotification({
        open: true,
        message: `Error loading file: ${error.message || "Unknown error"}`,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Update filtered sub segments when segment codes change
  useEffect(() => {
    // Ensure filters.subSegmentCodes is an array
    const subSegmentCodes = filters.subSegmentCodes || [];

    if (subSegmentCodes.length === 0) {
      // If no segment codes selected, clear sub segments filter
      setFilters((prev) => ({ ...prev, subSegments: [] }));
      setFilteredSubSegments([]);
      return;
    }

    // Get all sub segments for the selected segment codes
    const relevantSubSegments = [];
    subSegmentCodes.forEach((code) => {
      // Add null check to avoid accessing properties of undefined
      if (segmentToSubSegmentMap && segmentToSubSegmentMap[code]) {
        relevantSubSegments.push(...segmentToSubSegmentMap[code]);
      }
    });

    // Remove duplicates
    const uniqueSubSegments = [...new Set(relevantSubSegments)];
    setFilteredSubSegments(uniqueSubSegments);

    // Remove any selected sub segments that are no longer valid
    const validSubSegments = (filters.subSegments || []).filter((segment) =>
      uniqueSubSegments.includes(segment)
    );

    if (validSubSegments.length !== (filters.subSegments || []).length) {
      setFilters((prev) => ({ ...prev, subSegments: validSubSegments }));
    }
  }, [filters.subSegmentCodes, segmentToSubSegmentMap]);

  // Apply filters whenever they change
  // Apply filters whenever they change
  useEffect(() => {
    if (!data || data.length === 0) return;

    let result = [...data];

    // Defensive checks for filters
    const safeFilters = filters || {};

    // Apply account filter
    if (safeFilters.accounts?.length > 0) {
      result = result.filter((item) =>
        safeFilters.accounts.includes(item["Account"])
      );
    }

    // Apply segment code filter
    if (safeFilters.subSegmentCodes?.length > 0) {
      result = result.filter((item) =>
        safeFilters.subSegmentCodes.includes(item["Sub Segment Code"])
      );
    }

    // Apply sub segments filter
    if (safeFilters.subSegments?.length > 0) {
      result = result.filter((item) =>
        safeFilters.subSegments.includes(item["Sub Segment"])
      );
    }

    // Apply status filter
    if (safeFilters.status?.length > 0) {
      result = result.filter((item) =>
        safeFilters.status.includes(item["Status"])
      );
    }

    // Apply manager filter
    if (safeFilters.manager?.length > 0) {
      result = result.filter((item) =>
        safeFilters.manager.includes(item["Manager"])
      );
    }

    // Apply partner filter
    if (safeFilters.partner?.length > 0) {
      result = result.filter((item) =>
        safeFilters.partner.includes(item["Partner"])
      );
    }

    // Handle service line filtering and allocation separately
    if (safeFilters.serviceLine1?.length > 0) {
      // Get all unique service lines in the data
      const allServiceLines = new Set();
      data.forEach((item) => {
        if (item["Service Line 1"]) allServiceLines.add(item["Service Line 1"]);
        if (item["Service Line 2"]) allServiceLines.add(item["Service Line 2"]);
        if (item["Service Line 3"]) allServiceLines.add(item["Service Line 3"]);
      });

      // Check if all service lines are selected
      const isAllServiceLinesSelected =
        safeFilters.serviceLine1.length > 0 &&
        allServiceLines.size > 0 &&
        [...allServiceLines].every((line) =>
          safeFilters.serviceLine1.includes(line)
        );

      // Find opportunities that have the selected service line in any of the three service line positions
      result = result.filter(
        (item) =>
          (item["Service Line 1"] &&
            safeFilters.serviceLine1.includes(item["Service Line 1"])) ||
          (item["Service Line 2"] &&
            safeFilters.serviceLine1.includes(item["Service Line 2"])) ||
          (item["Service Line 3"] &&
            safeFilters.serviceLine1.includes(item["Service Line 3"]))
      );

      // Apply service line allocation percentages
      result = result.map((item) => {
        let newItem = { ...item };

        // Special case: if all service lines are selected, use 100% allocation
        if (isAllServiceLinesSelected) {
          newItem["Allocated Gross Revenue"] = newItem["Gross Revenue"];
          newItem["Allocated Net Revenue"] = newItem["Net Revenue"] || 0;
          newItem["Is Allocated"] = false; // Not really allocated if using 100%
          newItem["Allocation Percentage"] = 100;
          newItem["Allocated Service Line"] = "All Service Lines";
          return newItem;
        }

        // Regular case: calculate allocation based on matching service lines
        let allocation = 0;
        let allocatedServiceLine = "";

        // Check if multiple service lines match the filters
        let matchingLines = [];
        let totalAllocation = 0;

        // Check primary service line
        if (
          newItem["Service Line 1"] &&
          safeFilters.serviceLine1.includes(newItem["Service Line 1"]) &&
          newItem["Service Offering 1 %"]
        ) {
          const lineAllocation =
            parseFloat(newItem["Service Offering 1 %"]) / 100;
          matchingLines.push({
            line: newItem["Service Line 1"],
            allocation: lineAllocation,
          });
          totalAllocation += lineAllocation;
        }

        // Check secondary service line
        if (
          newItem["Service Line 2"] &&
          safeFilters.serviceLine1.includes(newItem["Service Line 2"]) &&
          newItem["Service Offering 2 %"]
        ) {
          const lineAllocation =
            parseFloat(newItem["Service Offering 2 %"]) / 100;
          matchingLines.push({
            line: newItem["Service Line 2"],
            allocation: lineAllocation,
          });
          totalAllocation += lineAllocation;
        }

        // Check tertiary service line
        if (
          newItem["Service Line 3"] &&
          safeFilters.serviceLine1.includes(newItem["Service Line 3"]) &&
          newItem["Service Offering 3 %"]
        ) {
          const lineAllocation =
            parseFloat(newItem["Service Offering 3 %"]) / 100;
          matchingLines.push({
            line: newItem["Service Line 3"],
            allocation: lineAllocation,
          });
          totalAllocation += lineAllocation;
        }

        // If no matching lines with percentages found, default to using the first matching line with 100%
        if (matchingLines.length === 0) {
          if (
            newItem["Service Line 1"] &&
            safeFilters.serviceLine1.includes(newItem["Service Line 1"])
          ) {
            allocation = 1;
            allocatedServiceLine = newItem["Service Line 1"];
          } else if (
            newItem["Service Line 2"] &&
            safeFilters.serviceLine1.includes(newItem["Service Line 2"])
          ) {
            allocation = 1;
            allocatedServiceLine = newItem["Service Line 2"];
          } else if (
            newItem["Service Line 3"] &&
            safeFilters.serviceLine1.includes(newItem["Service Line 3"])
          ) {
            allocation = 1;
            allocatedServiceLine = newItem["Service Line 3"];
          } else {
            allocation = 1;
          }
        }
        // If we have exactly one matching line
        else if (matchingLines.length === 1) {
          allocation = matchingLines[0].allocation;
          allocatedServiceLine = matchingLines[0].line;
        }
        // If we have multiple matching lines, use the total allocation
        else {
          allocation = Math.min(totalAllocation, 1); // Cap at 100%
          allocatedServiceLine = matchingLines.map((m) => m.line).join(", ");

          // If total allocation exceeds 100%, note this in the allocated service line
          if (totalAllocation > 1) {
            allocatedServiceLine += " (capped at 100%)";
          }
        }

        // Apply allocation
        newItem["Allocated Gross Revenue"] =
          newItem["Gross Revenue"] * allocation;
        newItem["Allocated Net Revenue"] = newItem["Net Revenue"]
          ? newItem["Net Revenue"] * allocation
          : 0;
        newItem["Is Allocated"] = allocation !== 1;
        newItem["Allocation Percentage"] = allocation * 100;
        newItem["Allocated Service Line"] = allocatedServiceLine;

        return newItem;
      });
    }

    setFilteredData(result);
  }, [filters, data]);

  // Safely handle filter changes
  const handleFilterChange = (newFilters) => {
    if (!newFilters || typeof newFilters !== "object") return;

    setFilters((prevFilters) => {
      const updatedFilters = { ...prevFilters };

      // Iterate through new filters and ensure they are arrays
      Object.keys(newFilters).forEach((key) => {
        const value = newFilters[key];

        // If value is an array, use it. Otherwise, default to an empty array
        updatedFilters[key] = Array.isArray(value) ? value : [];
      });

      return updatedFilters;
    });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSelectedOpportunities([]);
  };

  const handleSelection = (opportunities) => {
    setSelectedOpportunities(opportunities);
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false,
    });
  };

  const handleToggleFilter = (type, value) => {
    if (!type || !filters[type]) return; // Add safety check

    const currentValues = [...filters[type]];
    const valueIndex = currentValues.indexOf(value);

    if (valueIndex === -1) {
      // Value doesn't exist, add it
      currentValues.push(value);
    } else {
      // Value exists, remove it
      currentValues.splice(valueIndex, 1);
    }

    handleFilterChange({ [type]: currentValues });
  };

  const handleClearFilterType = (type) => {
    if (!type || !filters[type]) return; // Add safety check
    handleFilterChange({ [type]: [] });
  };

  // Account filter change handler
  const handleAccountChange = (event, newValue) => {
    handleFilterChange({ accounts: newValue || [] }); // Add safety check for newValue
  };

  // Filter data based on active tab
  const getTabData = () => {
    if (!filteredData || !Array.isArray(filteredData)) return [];

    if (activeTab === 0) {
      // Pipeline Tab: Status 1-11
      return filteredData.filter(
        (item) => item["Status"] >= 1 && item["Status"] <= 11
      );
    } else if (activeTab === 1) {
      // Bookings Tab: Status 14 and 15
      return filteredData.filter((item) => [14, 15].includes(item["Status"]));
    } else if (activeTab === 2) {
      // Service Lines Tab: All data
      return filteredData;
    } else if (activeTab === 3) {
      // Jobcode Timeline Tab: All data
      return filteredData;
    }
  };

  // Define theme colors for buttons
  const colorMap = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    info: theme.palette.info.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
  };

  // Left sidebar content - Sub Segment Code filters
  // Left sidebar content - Sub Segment Code filters
  // The updated leftSidebarContent with fixed layout and added divider

  const leftSidebarContent = (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h6"
        fontWeight={600}
        color={theme.palette.primary.dark}
        sx={{ mb: 2 }}
      >
        Segments
      </Typography>

      {/* Added divider to match right sidebar */}
      <Divider sx={{ mb: 3, borderColor: theme.palette.primary.light }} />

      {/* Segment Code filter with fixed layout */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="subtitle2"
          fontWeight={600}
          color={theme.palette.text.primary}
        >
          Segment Codes
        </Typography>

        {/* Fixed-width container for the Clear All button */}
        <Box sx={{ minWidth: "80px", textAlign: "right" }}>
          {filters.subSegmentCodes && filters.subSegmentCodes.length > 0 ? (
            <Button
              variant="text"
              color="primary"
              size="small"
              startIcon={<ClearIcon />}
              onClick={() => handleClearFilterType("subSegmentCodes")}
              sx={{ minWidth: "auto", p: 0.5 }}
            >
              Clear All
            </Button>
          ) : (
            /* Placeholder to maintain spacing when button is not visible */
            <Box sx={{ visibility: "hidden", width: "80px", height: "32px" }} />
          )}
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 3 }}>
        {(filterOptions.subSegmentCodes || []).map((code) => (
          <ToggleButton
            key={code}
            value={code}
            selected={
              filters.subSegmentCodes && filters.subSegmentCodes.includes(code)
            }
            onChange={() => handleToggleFilter("subSegmentCodes", code)}
            sx={{
              justifyContent: "flex-start",
              textAlign: "left",
              borderRadius: 2,
              px: 2,
              py: 1,
              mb: 0.5,
              fontSize: "0.9rem",
              fontWeight: 500,
              borderWidth: "2px",
              borderColor: "rgba(0, 0, 0, 0.08)",
              "&.Mui-selected": {
                backgroundColor: theme.palette.primary.main,
                color: "white",
                fontWeight: 600,
                borderColor: theme.palette.primary.main,
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                  borderColor: theme.palette.primary.dark,
                },
              },
              "&:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                borderColor: alpha(theme.palette.primary.main, 0.3),
              },
              transition: "all 0.2s ease-in-out",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {code}
          </ToggleButton>
        ))}
      </Box>

      {/* Sub Segment filter - Show only if segment codes are selected */}
      {filters.subSegmentCodes &&
        filters.subSegmentCodes.length > 0 &&
        filteredSubSegments &&
        filteredSubSegments.length > 0 && (
          <>
            <Box
              sx={{
                mb: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={600}
                color={theme.palette.text.primary}
              >
                Sub Segments
              </Typography>

              {/* Fixed-width container for the Clear All button */}
              <Box sx={{ minWidth: "80px", textAlign: "right" }}>
                {filters.subSegments && filters.subSegments.length > 0 ? (
                  <Button
                    variant="text"
                    color="primary"
                    size="small"
                    startIcon={<ClearIcon />}
                    onClick={() => handleClearFilterType("subSegments")}
                    sx={{ minWidth: "auto", p: 0.5 }}
                  >
                    Clear All
                  </Button>
                ) : (
                  /* Placeholder to maintain spacing when button is not visible */
                  <Box
                    sx={{ visibility: "hidden", width: "80px", height: "32px" }}
                  />
                )}
              </Box>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {filteredSubSegments.map((segment) => (
                <ToggleButton
                  key={segment}
                  value={segment}
                  selected={
                    filters.subSegments && filters.subSegments.includes(segment)
                  }
                  onChange={() => handleToggleFilter("subSegments", segment)}
                  sx={{
                    justifyContent: "flex-start",
                    textAlign: "left",
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    mb: 0.5,
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    borderWidth: "2px",
                    borderColor: "rgba(0, 0, 0, 0.08)",
                    "&.Mui-selected": {
                      backgroundColor: theme.palette.info.main,
                      color: "white",
                      fontWeight: 600,
                      borderColor: theme.palette.info.main,
                      "&:hover": {
                        backgroundColor: theme.palette.info.dark,
                        borderColor: theme.palette.info.dark,
                      },
                    },
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.info.main, 0.08),
                      borderColor: alpha(theme.palette.info.main, 0.3),
                    },
                    transition: "all 0.2s ease-in-out",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {segment}
                </ToggleButton>
              ))}
            </Box>
          </>
        )}
    </Box>
  );

  // The updated rightSidebarContent with fixed layout to prevent shifting

  const rightSidebarContent = (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h6"
        fontWeight={600}
        color={theme.palette.secondary.dark}
        sx={{ mb: 2 }}
      >
        Service Lines
      </Typography>
      <Divider sx={{ mb: 3, borderColor: theme.palette.secondary.light }} />

      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="subtitle2"
          fontWeight={600}
          color={theme.palette.text.primary}
        >
          Filter by Service
        </Typography>

        {/* Fixed-width container for the Clear All button */}
        <Box sx={{ minWidth: "80px", textAlign: "right" }}>
          {filters.serviceLine1 && filters.serviceLine1.length > 0 ? (
            <Button
              variant="text"
              color="secondary"
              size="small"
              startIcon={<ClearIcon />}
              onClick={() => handleClearFilterType("serviceLine1")}
              sx={{ minWidth: "auto", p: 0.5 }}
            >
              Clear All
            </Button>
          ) : (
            /* Placeholder to maintain spacing when button is not visible */
            <Box sx={{ visibility: "hidden", width: "80px", height: "32px" }} />
          )}
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {(filterOptions.serviceLine1 || []).map((line, index) => {
          // Assign a different color to each service line from theme colors
          const colorKeys = [
            "secondary",
            "success",
            "info",
            "warning",
            "error",
            "primary",
          ];
          const colorKey = colorKeys[index % colorKeys.length];
          const buttonColor = colorMap[colorKey];

          return (
            <ToggleButton
              key={line}
              value={line}
              selected={
                filters.serviceLine1 && filters.serviceLine1.includes(line)
              }
              onChange={() => handleToggleFilter("serviceLine1", line)}
              sx={{
                justifyContent: "flex-start",
                textAlign: "left",
                borderRadius: 2,
                px: 2,
                py: 1,
                mb: 0.5,
                fontSize: "0.9rem",
                fontWeight: 500,
                borderWidth: "2px",
                borderColor: "rgba(0, 0, 0, 0.08)",
                "&.Mui-selected": {
                  backgroundColor: buttonColor,
                  color: "white",
                  fontWeight: 600,
                  borderColor: buttonColor,
                  "&:hover": {
                    backgroundColor:
                      theme.palette.mode === "light"
                        ? darken(buttonColor, 0.1)
                        : lighten(buttonColor, 0.1),
                    borderColor:
                      theme.palette.mode === "light"
                        ? darken(buttonColor, 0.1)
                        : lighten(buttonColor, 0.1),
                  },
                },
                "&:hover": {
                  backgroundColor: alpha(buttonColor, 0.08),
                  borderColor: alpha(buttonColor, 0.3),
                },
                transition: "all 0.2s ease-in-out",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {line}
            </ToggleButton>
          );
        })}
      </Box>
    </Box>
  );
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex" }}>
        {/* Left Sidebar - Sub Segment Codes */}
        {data.length > 0 && !isMobile && (
          <Drawer
            variant="permanent"
            sx={{
              width: LEFT_DRAWER_WIDTH,
              flexShrink: 0,
              "& .MuiDrawer-paper": {
                width: LEFT_DRAWER_WIDTH,
                boxSizing: "border-box",
                borderRight: "1px solid",
                borderColor: alpha(theme.palette.primary.main, 0.1),
                pt: "64px", // AppBar height
                boxShadow: "1px 0 5px rgba(0,0,0,0.05)",
              },
            }}
          >
            {leftSidebarContent}
          </Drawer>
        )}

        {/* Main content */}
        <Box
          sx={{
            flexGrow: 1,
            width: {
              sm: `calc(100% - ${
                data.length > 0 && !isMobile
                  ? LEFT_DRAWER_WIDTH + RIGHT_DRAWER_WIDTH
                  : 0
              }px)`,
            },
          }}
        >
          {/* Single row AppBar with tabs */}
          <AppBar
            position="fixed"
            elevation={2}
            sx={{
              borderBottom: "1px solid",
              borderColor: alpha(theme.palette.primary.main, 0.1),
              backgroundColor: "white",
              zIndex: (theme) => theme.zIndex.drawer + 1,
              backgroundImage: `linear-gradient(to right, ${alpha(
                theme.palette.primary.light,
                0.05
              )}, ${alpha(theme.palette.secondary.light, 0.05)})`,
            }}
          >
            <Toolbar
              sx={{
                py: 0.5,
                px: { xs: 2, md: 3 },
                height: 64,
                display: "flex",
                alignItems: "center",
              }}
            >
              {/* Left side - Logo */}
              <Box
                display="flex"
                alignItems="center"
                sx={{
                  background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  mr: 2,
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    mr: 1,
                  }}
                >
                  AIM
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 500,
                  }}
                >
                  Team Dashboard
                </Typography>
              </Box>

              {/* Center - Tabs */}
              {data.length > 0 && (
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  aria-label="dashboard tabs"
                  sx={{
                    minHeight: 64,
                    "& .MuiTabs-indicator": {
                      backgroundColor: theme.palette.primary.main,
                      height: 3,
                      borderTopLeftRadius: 3,
                      borderTopRightRadius: 3,
                    },
                    "& .MuiTab-root": {
                      minHeight: 64,
                      px: 3,
                      fontWeight: 600,
                      transition: "all 0.2s",
                      "&:hover": {
                        backgroundColor: alpha(
                          theme.palette.primary.main,
                          0.04
                        ),
                      },
                      "&.Mui-selected": {
                        color: theme.palette.primary.main,
                      },
                    },
                    flexGrow: 0,
                  }}
                >
                  <Tab
                    label="Pipeline"
                    icon={
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: theme.palette.primary.main,
                          display: "inline-block",
                          mr: 1,
                          verticalAlign: "middle",
                          mb: 0.5,
                        }}
                      />
                    }
                    iconPosition="start"
                  />
                  <Tab
                    label="Bookings"
                    icon={
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: theme.palette.success.main,
                          display: "inline-block",
                          mr: 1,
                          verticalAlign: "middle",
                          mb: 0.5,
                        }}
                      />
                    }
                    iconPosition="start"
                  />
                  <Tab
                    label="Service Lines"
                    icon={
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: theme.palette.secondary.main,
                          display: "inline-block",
                          mr: 1,
                          verticalAlign: "middle",
                          mb: 0.5,
                        }}
                      />
                    }
                    iconPosition="start"
                  />
                  <Tab
                    label="Jobcode Timeline"
                    icon={
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: theme.palette.info.main,
                          display: "inline-block",
                          mr: 1,
                          verticalAlign: "middle",
                          mb: 0.5,
                        }}
                      />
                    }
                    iconPosition="start"
                  />
                </Tabs>
              )}

              {/* Right side - File info & uploader */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  ml: "auto",
                }}
              >
                {currentFile && (
                  <Box
                    sx={{
                      display: { xs: "none", md: "flex" },
                      alignItems: "center",
                      px: 2,
                      py: 0.75,
                      borderRadius: 2,
                      backgroundColor: alpha(
                        theme.palette.background.default,
                        0.7
                      ),
                      border: `1px solid ${alpha(
                        theme.palette.primary.main,
                        0.1
                      )}`,
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mr: 1,
                        fontWeight: 500,
                      }}
                    >
                      Current file:
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.primary"
                      sx={{
                        fontWeight: 600,
                      }}
                    >
                      {currentFile}
                    </Typography>
                  </Box>
                )}

                <FileUploader
                  onFileUploaded={handleFileUploaded}
                  hasData={data.length > 0}
                />
              </Box>
            </Toolbar>
          </AppBar>

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              pt: "80px", // Adjusted for the single-line AppBar
              pb: 3,
              px: 3,
              overflow: "hidden",
            }}
          >
            {data.length === 0 ? (
              <Fade in={true} timeout={800}>
                <Paper
                  elevation={2}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: {
                      xs: "calc(100vh - 140px)",
                      md: "calc(100vh - 160px)",
                    },
                    borderRadius: 3,
                    p: { xs: 3, md: 6 },
                    background:
                      "linear-gradient(to bottom right, #ffffff, #f8fafc)",
                    textAlign: "center",
                    border: "1px solid",
                    borderColor: "rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <Typography
                    variant="h4"
                    gutterBottom
                    sx={{ fontWeight: 700, mb: 2 }}
                  >
                    Welcome to the AIM Team Dashboard
                  </Typography>

                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ maxWidth: "600px", mb: 4 }}
                  >
                    Upload your Excel file containing opportunity data to
                    visualize pipeline, bookings, and service line performance
                    with interactive charts and insights.
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    <FileUploader
                      onFileUploaded={handleFileUploaded}
                      hasData={false}
                    />
                  </Box>
                </Paper>
              </Fade>
            ) : (
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box sx={{ mb: 3 }}>
                  <FilterPanel
                    data={data}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                  />
                </Box>

                <Box sx={{ flex: 1, overflow: "auto" }}>
                  {activeTab === 0 && (
                    <PipelineTab
                      data={getTabData()}
                      loading={loading}
                      onSelection={handleSelection}
                      selectedOpportunities={selectedOpportunities}
                    />
                  )}
                  {activeTab === 1 && (
                    <BookingsTab
                      data={getTabData()}
                      loading={loading}
                      onSelection={handleSelection}
                      selectedOpportunities={selectedOpportunities}
                    />
                  )}
                  {activeTab === 2 && (
                    <ServiceLinesTab
                      data={getTabData()}
                      loading={loading}
                      onSelection={handleSelection}
                      selectedOpportunities={selectedOpportunities}
                    />
                  )}
                  {activeTab === 3 && (
                    <JobcodeTimelineTab
                      data={data} // Note: Using all data, not filtered data from getTabData()
                      loading={loading}
                      onSelection={handleSelection}
                      selectedOpportunities={selectedOpportunities}
                    />
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        {/* Right Sidebar - Service Lines */}
        {data.length > 0 && !isMobile && (
          <Drawer
            variant="permanent"
            anchor="right"
            sx={{
              width: RIGHT_DRAWER_WIDTH,
              flexShrink: 0,
              "& .MuiDrawer-paper": {
                width: RIGHT_DRAWER_WIDTH,
                boxSizing: "border-box",
                borderLeft: "1px solid",
                borderColor: alpha(theme.palette.secondary.main, 0.1),
                pt: "64px", // AppBar height
                boxShadow: "-1px 0 5px rgba(0,0,0,0.05)",
              },
            }}
          >
            {rightSidebarContent}
          </Drawer>
        )}
      </Box>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
