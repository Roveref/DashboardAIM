// src/App.js (Version optimisée)
import React, { useState, useEffect, Suspense, lazy } from "react";
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
  Button,
  Chip,
  Grid,
  Switch,
  FormControlLabel,
  CircularProgress,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import BusinessIcon from "@mui/icons-material/Business";
import PeopleIcon from "@mui/icons-material/People";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";

// Imports statiques des composants principaux
import PipelineTab from "./components/PipelineTab";
import BookingsTab from "./components/BookingsTab";
import FilterPanel from "./components/FilterPanel";
import FileUploader from "./components/FileUploader";

// Lazy loading des composants lourds
const ServiceLinesTab = lazy(() => import("./components/ServiceLinesTab"));
const StaffingTab = lazy(() => import("./components/StaffingTab"));
const JobcodeTimelineTab = lazy(() =>
  import("./components/JobcodeTimelineTab")
);

// Hooks et utilitaires
import { useFilters, useFilteredOpportunities } from "./hooks/useFilters";
import { processExcelData } from "./utils/dataUtils";
import { formatCurrency } from "./utils/revenueCalculations";
import theme from "./theme";

// Constantes
const LEFT_DRAWER_WIDTH = 240;
const RIGHT_DRAWER_WIDTH = 240;

// Hook personnalisé pour la gestion des fichiers
const useFileManagement = () => {
  const [currentFiles, setCurrentFiles] = useState({
    opportunity: null,
    staffing: null,
  });
  const [staffingFileData, setStaffingFileData] = useState(null);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const handleFileUploaded = async (fileName, fileData, fileType) => {
    try {
      setCurrentFiles((prev) => ({
        ...prev,
        [fileType]: fileName,
      }));

      if (fileType === "staffing") {
        setStaffingFileData(fileData);
        setNotification({
          open: true,
          message: `Successfully loaded staffing data from ${fileName}`,
          severity: "success",
        });
      }

      return fileData; // Retourner les données pour traitement ultérieur
    } catch (error) {
      console.error(`Error processing ${fileType} file:`, error);
      setNotification({
        open: true,
        message: `Error loading ${fileType} file: ${
          error.message || "Unknown error"
        }`,
        severity: "error",
      });
      throw error;
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return {
    currentFiles,
    staffingFileData,
    notification,
    handleFileUploaded,
    handleCloseNotification,
  };
};

function App() {
  // États principaux
  const [activeTab, setActiveTab] = useState(0);
  const [opportunityData, setOpportunityData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOpportunities, setSelectedOpportunities] = useState([]);
  const [showNetRevenue, setShowNetRevenue] = useState(false);

  // Hooks personnalisés
  const fileManagement = useFileManagement();
  const { filters, updateFilter, clearAllFilters, hasActiveFilters } =
    useFilters(opportunityData);

  // Données filtrées
  const filteredData = useFilteredOpportunities(opportunityData, filters);

  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Gestionnaire de chargement des données d'opportunité
  const handleOpportunityFileUploaded = async (
    fileName,
    fileData,
    fileType
  ) => {
    if (fileType !== "opportunity") {
      return fileManagement.handleFileUploaded(fileName, fileData, fileType);
    }

    try {
      setLoading(true);

      // Traitement du fichier Excel
      const processedData = await processExcelData(fileData);
      const safeProcessedData = Array.isArray(processedData)
        ? processedData
        : [];

      setOpportunityData(safeProcessedData);

      // Mise à jour des fichiers
      fileManagement.handleFileUploaded(fileName, fileData, fileType);

      return processedData;
    } catch (error) {
      console.error("Error processing opportunity file:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaires d'événements
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSelectedOpportunities([]);
  };

  const handleSelection = (opportunities) => {
    setSelectedOpportunities(opportunities);
  };

  const handleRevenueToggle = () => {
    setShowNetRevenue(!showNetRevenue);
  };

  // Filtrage des données par onglet
  const getTabData = () => {
    if (!filteredData || !Array.isArray(filteredData)) return [];

    switch (activeTab) {
      case 0: // Pipeline Tab: Status 1-11
        return filteredData.filter(
          (item) => item["Status"] >= 1 && item["Status"] <= 11
        );
      case 1: // Bookings Tab: Status 14 and 15
        return filteredData.filter((item) => [14, 15].includes(item["Status"]));
      case 2: // Service Lines Tab: All data
      case 3: // Jobcode Timeline Tab: All data
        return filteredData;
      case 4: // Staffing Tab: All data
        return filteredData;
      default:
        return [];
    }
  };

  // Calcul des statistiques rapides
  const totalRevenue = filteredData.reduce(
    (sum, item) =>
      sum +
      ((showNetRevenue ? item["Net Revenue"] : item["Gross Revenue"]) || 0),
    0
  );

  // Composant de chargement
  const LoadingFallback = () => (
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex" }}>
        {/* Sidebar gauche - Segments (si données chargées) */}
        {opportunityData.length > 0 && !isMobile && (
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
                pt: "64px",
                boxShadow: "1px 0 5px rgba(0,0,0,0.05)",
              },
            }}
          >
            {/* Contenu sidebar gauche - à implémenter */}
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight={600} color="primary.main">
                Segments
              </Typography>
              {/* Filtres de segments seront ici */}
            </Box>
          </Drawer>
        )}

        {/* Contenu principal */}
        <Box
          sx={{
            flexGrow: 1,
            width: {
              sm: `calc(100% - ${
                opportunityData.length > 0 && !isMobile
                  ? LEFT_DRAWER_WIDTH + RIGHT_DRAWER_WIDTH
                  : 0
              }px)`,
            },
          }}
        >
          {/* AppBar */}
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
            <Toolbar sx={{ py: 0.5, px: { xs: 2, md: 3 }, height: 64 }}>
              {/* Logo */}
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 500,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  mr: 2,
                }}
              >
                I&O Team Dashboard
              </Typography>

              {/* Toggle Net/Gross Revenue */}
              {opportunityData.length > 0 && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={showNetRevenue}
                      onChange={handleRevenueToggle}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <MonetizationOnIcon sx={{ mr: 0.5, fontSize: 20 }} />
                      <Typography variant="body2" fontWeight={600}>
                        {showNetRevenue ? "Net Revenue" : "Gross Revenue"}
                      </Typography>
                    </Box>
                  }
                  sx={{
                    mr: 2,
                    ml: 1,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    borderRadius: 2,
                    px: 1,
                    py: 0.25,
                  }}
                />
              )}

              {/* Onglets */}
              {opportunityData.length > 0 && (
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  sx={{
                    minHeight: 64,
                    "& .MuiTabs-indicator": {
                      backgroundColor: theme.palette.primary.main,
                      height: 3,
                      borderRadius: 3,
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
                  }}
                >
                  <Tab label="Pipeline" />
                  <Tab label="Bookings" />
                  <Tab label="Service Lines" />
                  <Tab label="Jobcode Timeline" />
                  <Tab
                    label="Staffing"
                    disabled={!fileManagement.currentFiles.staffing}
                  />
                </Tabs>
              )}

              {/* Informations fichiers et uploaders */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  ml: "auto",
                }}
              >
                {/* Statistiques rapides */}
                {opportunityData.length > 0 && (
                  <Box
                    sx={{
                      display: { xs: "none", md: "flex" },
                      flexDirection: "column",
                      alignItems: "flex-end",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Total: {formatCurrency(totalRevenue)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {filteredData.length} opportunities
                    </Typography>
                  </Box>
                )}

                {/* File uploaders */}
                <Box sx={{ display: "flex", gap: 1 }}>
                  <FileUploader
                    onFileUploaded={handleOpportunityFileUploaded}
                    hasData={fileManagement.currentFiles.opportunity !== null}
                    fileType="opportunity"
                  />
                  <FileUploader
                    onFileUploaded={fileManagement.handleFileUploaded}
                    hasData={fileManagement.currentFiles.staffing !== null}
                    fileType="staffing"
                  />
                </Box>
              </Box>
            </Toolbar>
          </AppBar>

          {/* Contenu principal */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              pt: "80px",
              pb: 3,
              px: 3,
              overflow: "hidden",
            }}
          >
            {opportunityData.length === 0 ? (
              // Écran d'accueil
              <Fade in={true} timeout={800}>
                <Paper
                  elevation={2}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "calc(100vh - 160px)",
                    borderRadius: 3,
                    p: 6,
                    background:
                      "linear-gradient(to bottom right, #ffffff, #f8fafc)",
                    textAlign: "center",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <Typography
                    variant="h4"
                    gutterBottom
                    sx={{ fontWeight: 700, mb: 2 }}
                  >
                    Welcome to the I&O Team Dashboard
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ maxWidth: "600px", mb: 4 }}
                  >
                    Upload your Excel files to visualize pipeline, bookings,
                    service line performance, and team staffing data.
                  </Typography>
                  <Grid container spacing={3} justifyContent="center">
                    <Grid item>
                      <Paper
                        elevation={2}
                        sx={{ p: 3, borderRadius: 2, textAlign: "center" }}
                      >
                        <BusinessIcon
                          sx={{ fontSize: 48, color: "primary.main", mb: 2 }}
                        />
                        <Typography variant="h6" gutterBottom>
                          Opportunity Data
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2 }}
                        >
                          Upload pipeline and bookings data
                        </Typography>
                        <FileUploader
                          onFileUploaded={handleOpportunityFileUploaded}
                          hasData={false}
                          fileType="opportunity"
                        />
                      </Paper>
                    </Grid>
                    <Grid item>
                      <Paper
                        elevation={2}
                        sx={{ p: 3, borderRadius: 2, textAlign: "center" }}
                      >
                        <PeopleIcon
                          sx={{ fontSize: 48, color: "secondary.main", mb: 2 }}
                        />
                        <Typography variant="h6" gutterBottom>
                          Staffing Data
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2 }}
                        >
                          Upload team utilization data
                        </Typography>
                        <FileUploader
                          onFileUploaded={fileManagement.handleFileUploaded}
                          hasData={false}
                          fileType="staffing"
                        />
                      </Paper>
                    </Grid>
                  </Grid>
                </Paper>
              </Fade>
            ) : (
              // Contenu principal avec données
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Panel de filtres (sauf pour Staffing) */}
                {activeTab !== 4 && (
                  <FilterPanel
                    data={opportunityData}
                    filters={filters}
                    onFilterChange={updateFilter}
                  />
                )}

                {/* Contenu des onglets */}
                <Box sx={{ flex: 1, overflow: "auto" }}>
                  <Suspense fallback={<LoadingFallback />}>
                    {activeTab === 0 && (
                      <PipelineTab
                        data={getTabData()}
                        loading={loading}
                        onSelection={handleSelection}
                        selectedOpportunities={selectedOpportunities}
                        showNetRevenue={showNetRevenue}
                      />
                    )}
                    {activeTab === 1 && (
                      <BookingsTab
                        data={getTabData()}
                        loading={loading}
                        onSelection={handleSelection}
                        selectedOpportunities={selectedOpportunities}
                        showNetRevenue={showNetRevenue}
                      />
                    )}
                    {activeTab === 2 && (
                      <ServiceLinesTab
                        data={getTabData()}
                        loading={loading}
                        onSelection={handleSelection}
                        selectedOpportunities={selectedOpportunities}
                        showNetRevenue={showNetRevenue}
                      />
                    )}
                    {activeTab === 3 && (
                      <JobcodeTimelineTab
                        data={opportunityData}
                        loading={loading}
                        onSelection={handleSelection}
                        selectedOpportunities={selectedOpportunities}
                        showNetRevenue={showNetRevenue}
                      />
                    )}
                    {activeTab === 4 &&
                      fileManagement.currentFiles.staffing &&
                      fileManagement.staffingFileData && (
                        <StaffingTab
                          data={opportunityData}
                          loading={loading}
                          staffingFileName={
                            fileManagement.currentFiles.staffing
                          }
                          staffingFileData={fileManagement.staffingFileData}
                          showNetRevenue={showNetRevenue}
                        />
                      )}
                  </Suspense>
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        {/* Sidebar droite - Service Lines (si données chargées) */}
        {opportunityData.length > 0 && !isMobile && (
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
                pt: "64px",
                boxShadow: "-1px 0 5px rgba(0,0,0,0.05)",
              },
            }}
          >
            {/* Contenu sidebar droite - à implémenter */}
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight={600} color="secondary.main">
                Service Lines
              </Typography>
              {/* Filtres de service lines seront ici */}
            </Box>
          </Drawer>
        )}
      </Box>

      {/* Notifications */}
      <Snackbar
        open={fileManagement.notification.open}
        autoHideDuration={6000}
        onClose={fileManagement.handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={fileManagement.handleCloseNotification}
          severity={fileManagement.notification.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {fileManagement.notification.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
