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
  Container,
  Paper,
  Fade,
  useMediaQuery,
  Drawer,
  Divider,
  ToggleButton,
  Button,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import PipelineTab from "./components/PipelineTab";
import BookingsTab from "./components/BookingsTab";
import ServiceLinesTab from "./components/ServiceLinesTab";
import FilterPanel from "./components/FilterPanel";
import FileUploader from "./components/FileUploader";
import { processExcelData, getUniqueValues } from "./utils/dataUtils";
import theme from "./theme";

// Sidebar width definition
const LEFT_DRAWER_WIDTH = 200;
const RIGHT_DRAWER_WIDTH = 200;

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filters, setFilters] = useState({
    subSegmentCodes: [],
    serviceLine1: [],
    dateRange: [null, null],
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
    serviceLine1: [],
  });

  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const handleFileUploaded = async (fileName, fileData) => {
    try {
      setLoading(true);
      setCurrentFile(fileName);

      // Process the uploaded Excel file
      const processedData = await processExcelData(fileData);

      setData(processedData);
      setFilteredData(processedData);

      // Set filter options
      setFilterOptions({
        subSegmentCodes: getUniqueValues(processedData, "Sub Segment Code"),
        serviceLine1: getUniqueValues(processedData, "Service Line 1"),
      });

      setNotification({
        open: true,
        message: `Successfully loaded ${processedData.length} opportunities from ${fileName}`,
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

  // Apply filters whenever they change
  useEffect(() => {
    if (data.length === 0) return;

    let result = [...data];

    // Apply each filter except serviceLine1 first
    if (filters.subSegmentCodes.length > 0) {
      result = result.filter((item) =>
        filters.subSegmentCodes.includes(item["Sub Segment Code"])
      );
    }

    if (filters.dateRange[0] && filters.dateRange[1]) {
      const startDate = new Date(filters.dateRange[0]);
      const endDate = new Date(filters.dateRange[1]);
      result = result.filter((item) => {
        const creationDate = new Date(item["Creation Date"]);
        return creationDate >= startDate && creationDate <= endDate;
      });
    }

    if (filters.status.length > 0) {
      result = result.filter((item) => filters.status.includes(item["Status"]));
    }

    if (filters.manager.length > 0) {
      result = result.filter((item) =>
        filters.manager.includes(item["Manager"])
      );
    }

    if (filters.partner.length > 0) {
      result = result.filter((item) =>
        filters.partner.includes(item["Partner"])
      );
    }

    // Handle service line filtering and allocation separately
    if (filters.serviceLine1.length > 0) {
      // Find opportunities that have the selected service line in any of the three service line positions
      result = result.filter(
        (item) =>
          (item["Service Line 1"] &&
            filters.serviceLine1.includes(item["Service Line 1"])) ||
          (item["Service Line 2"] &&
            filters.serviceLine1.includes(item["Service Line 2"])) ||
          (item["Service Line 3"] &&
            filters.serviceLine1.includes(item["Service Line 3"]))
      );

      // Apply service line allocation percentages
      result = result.map((item) => {
        let newItem = { ...item };
        let allocation = 0;
        let allocatedServiceLine = "";

        // Check if any of the service lines match and calculate allocation percentage
        if (
          newItem["Service Line 1"] &&
          filters.serviceLine1.includes(newItem["Service Line 1"]) &&
          newItem["Service Offering 1 %"]
        ) {
          allocation = parseFloat(newItem["Service Offering 1 %"]) / 100;
          allocatedServiceLine = newItem["Service Line 1"];
        } else if (
          newItem["Service Line 2"] &&
          filters.serviceLine1.includes(newItem["Service Line 2"]) &&
          newItem["Service Offering 2 %"]
        ) {
          allocation = parseFloat(newItem["Service Offering 2 %"]) / 100;
          allocatedServiceLine = newItem["Service Line 2"];
        } else if (
          newItem["Service Line 3"] &&
          filters.serviceLine1.includes(newItem["Service Line 3"]) &&
          newItem["Service Offering 3 %"]
        ) {
          allocation = parseFloat(newItem["Service Offering 3 %"]) / 100;
          allocatedServiceLine = newItem["Service Line 3"];
        } else {
          // If we can't find a percentage, default to 100%
          allocation = 1;
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
    } else {
      // Reset allocations if no service line filter
      result = result.map((item) => {
        const newItem = { ...item };
        newItem["Allocated Gross Revenue"] = newItem["Gross Revenue"];
        newItem["Allocated Net Revenue"] = newItem["Net Revenue"];
        newItem["Is Allocated"] = false;
        newItem["Allocation Percentage"] = 100;
        newItem["Allocated Service Line"] = "";
        return newItem;
      });
    }

    setFilteredData(result);
  }, [filters, data]);

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
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
    handleFilterChange({ [type]: [] });
  };

  // Filter data based on active tab
  const getTabData = () => {
    if (activeTab === 0) {
      // Pipeline Tab: Status 1-11
      return filteredData.filter(
        (item) => item["Status"] >= 1 && item["Status"] <= 11
      );
    } else if (activeTab === 1) {
      // Bookings Tab: Status 14
      return filteredData.filter((item) => item["Status"] === 14);
    } else {
      // Service Lines Tab: All data
      return filteredData;
    }
  };

  // Left sidebar content - Sub Segment Code filters
  const leftSidebarContent = (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          Sub Segment Code
        </Typography>
        {filters.subSegmentCodes.length > 0 && (
          <Button
            variant="text"
            color="primary"
            size="small"
            startIcon={<ClearIcon />}
            onClick={() => handleClearFilterType("subSegmentCodes")}
            sx={{ minWidth: "auto", p: 0.5 }}
          >
            Clear
          </Button>
        )}
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {filterOptions.subSegmentCodes.map((code) => (
          <ToggleButton
            key={code}
            value={code}
            selected={filters.subSegmentCodes.includes(code)}
            onChange={() => handleToggleFilter("subSegmentCodes", code)}
            size="small"
            sx={{
              justifyContent: "flex-start",
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              mb: 0.5,
              "&.Mui-selected": {
                backgroundColor: "primary.main",
                color: "white",
                "&:hover": {
                  backgroundColor: "primary.dark",
                },
              },
            }}
          >
            {code}
          </ToggleButton>
        ))}
      </Box>
    </Box>
  );

  // Right sidebar content - Service Line filters
  const rightSidebarContent = (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          Service Line
        </Typography>
        {filters.serviceLine1.length > 0 && (
          <Button
            variant="text"
            color="secondary"
            size="small"
            startIcon={<ClearIcon />}
            onClick={() => handleClearFilterType("serviceLine1")}
            sx={{ minWidth: "auto", p: 0.5 }}
          >
            Clear
          </Button>
        )}
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {filterOptions.serviceLine1.map((line) => (
          <ToggleButton
            key={line}
            value={line}
            selected={filters.serviceLine1.includes(line)}
            onChange={() => handleToggleFilter("serviceLine1", line)}
            size="small"
            sx={{
              justifyContent: "flex-start",
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              mb: 0.5,
              "&.Mui-selected": {
                backgroundColor: "secondary.main",
                color: "white",
                "&:hover": {
                  backgroundColor: "secondary.dark",
                },
              },
            }}
          >
            {line}
          </ToggleButton>
        ))}
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
                borderColor: "divider",
                pt: "64px", // AppBar height
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
          <AppBar
            position="fixed"
            elevation={0}
            color="default"
            sx={{
              borderBottom: "1px solid",
              borderColor: "divider",
              backgroundColor: "background.paper",
              zIndex: (theme) => theme.zIndex.drawer + 1,
            }}
          >
            <Toolbar>
              <Box display="flex" alignItems="center" flex={1}>
                <Typography
                  variant="h5"
                  color="text.primary"
                  sx={{
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  AIM Team Dashboard
                </Typography>
              </Box>

              {currentFile && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mr: 2, display: { xs: "none", md: "block" } }}
                >
                  File: {currentFile}
                </Typography>
              )}

              <FileUploader
                onFileUploaded={handleFileUploaded}
                hasData={data.length > 0}
              />
            </Toolbar>

            {data.length > 0 && (
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                aria-label="dashboard tabs"
                variant={isMobile ? "fullWidth" : "standard"}
                centered={!isMobile}
                sx={{
                  px: { xs: 0, md: 4 },
                  "& .MuiTabs-indicator": {
                    backgroundColor: "primary.main",
                  },
                }}
              >
                <Tab label="Pipeline" sx={{ minHeight: 64 }} />
                <Tab label="Bookings" sx={{ minHeight: 64 }} />
                <Tab label="Service Lines" sx={{ minHeight: 64 }} />
              </Tabs>
            )}
          </AppBar>

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              pt: data.length > 0 ? "140px" : "80px",
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
                      md: "calc(100vh - 200px)",
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
                borderColor: "divider",
                pt: "64px", // AppBar height
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
