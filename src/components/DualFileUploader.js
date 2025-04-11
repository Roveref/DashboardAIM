import React, { useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Chip,
  alpha,
  useTheme,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import TimelineIcon from "@mui/icons-material/Timeline";
import PeopleIcon from "@mui/icons-material/People";

/**
 * DualFileUploader component that prominently displays two distinct file upload areas
 * for opportunities and staffing data.
 */
const DualFileUploader = ({
  onOpportunityFileUploaded,
  onStaffingFileUploaded,
  hasOpportunityData,
  hasStaffingData,
  currentOpportunityFile,
  currentStaffingFile,
}) => {
  const theme = useTheme();

  const [opportunityLoading, setOpportunityLoading] = useState(false);
  const [staffingLoading, setStaffingLoading] = useState(false);

  const [opportunityError, setOpportunityError] = useState("");
  const [staffingError, setStaffingError] = useState("");

  const handleOpportunityFileChange = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];

    // Check file type
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setOpportunityError("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    setOpportunityLoading(true);
    setOpportunityError("");

    try {
      // Read the file as ArrayBuffer
      const buffer = await readFile(file);
      // Pass the file data to the parent component
      onOpportunityFileUploaded(file.name, buffer);
    } catch (err) {
      console.error("Error reading opportunities file:", err);
      setOpportunityError("Failed to read the file. Please try again.");
    } finally {
      setOpportunityLoading(false);
    }
  };

  const handleStaffingFileChange = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];

    // Check file type
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setStaffingError("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    setStaffingLoading(true);
    setStaffingError("");

    try {
      // Read the file as ArrayBuffer
      const buffer = await readFile(file);
      // Pass the file data to the parent component
      onStaffingFileUploaded(file.name, buffer);
    } catch (err) {
      console.error("Error reading staffing file:", err);
      setStaffingError("Failed to read the file. Please try again.");
    } finally {
      setStaffingLoading(false);
    }
  };

  const readFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    });
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          gap: 4,
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        {/* Opportunities File Upload */}
        <Paper
          sx={{
            p: 3,
            border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
            borderRadius: 2,
            width: { xs: "100%", md: "50%" },
            backgroundColor: alpha(theme.palette.primary.main, 0.03),
            textAlign: "center",
            cursor: opportunityLoading ? "wait" : "pointer",
            transition: "all 0.2s",
            "&:hover": {
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              borderColor: alpha(theme.palette.primary.main, 0.5),
            },
          }}
          onClick={() =>
            !opportunityLoading &&
            document.getElementById("opportunity-file-input").click()
          }
        >
          {opportunityLoading ? (
            <CircularProgress size={48} color="primary" sx={{ my: 2 }} />
          ) : (
            <TimelineIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
          )}

          <Typography variant="h6" fontWeight={600} color="primary">
            Opportunities Data
          </Typography>

          {hasOpportunityData ? (
            <Box sx={{ mt: 2 }}>
              <Chip
                label={currentOpportunityFile || "File uploaded"}
                color="primary"
                variant="outlined"
                sx={{ mb: 1 }}
              />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 1,
                  mt: 1,
                }}
              >
                <Button
                  variant="outlined"
                  size="small"
                  color="primary"
                  startIcon={<CloudUploadIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    !opportunityLoading &&
                      document.getElementById("opportunity-file-input").click();
                  }}
                  disabled={opportunityLoading}
                >
                  Change
                </Button>
              </Box>
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Upload Excel file (.xlsx or .xls)
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                for pipeline, bookings, and service lines
              </Typography>
              {opportunityError && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  {opportunityError}
                </Typography>
              )}
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CloudUploadIcon />}
                  disabled={opportunityLoading}
                >
                  Upload
                </Button>
              </Box>
            </>
          )}

          <input
            id="opportunity-file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleOpportunityFileChange}
            style={{ display: "none" }}
          />
        </Paper>

        {/* Staffing File Upload */}
        <Paper
          sx={{
            p: 3,
            border: `1px dashed ${alpha(theme.palette.secondary.main, 0.3)}`,
            borderRadius: 2,
            width: { xs: "100%", md: "50%" },
            backgroundColor: alpha(theme.palette.secondary.main, 0.03),
            textAlign: "center",
            cursor: staffingLoading ? "wait" : "pointer",
            transition: "all 0.2s",
            "&:hover": {
              backgroundColor: alpha(theme.palette.secondary.main, 0.05),
              borderColor: alpha(theme.palette.secondary.main, 0.5),
            },
          }}
          onClick={() =>
            !staffingLoading &&
            document.getElementById("staffing-file-input").click()
          }
        >
          {staffingLoading ? (
            <CircularProgress size={48} color="secondary" sx={{ my: 2 }} />
          ) : (
            <PeopleIcon color="secondary" sx={{ fontSize: 48, mb: 2 }} />
          )}

          <Typography variant="h6" fontWeight={600} color="secondary">
            Staffing Data
          </Typography>

          {hasStaffingData ? (
            <Box sx={{ mt: 2 }}>
              <Chip
                label={currentStaffingFile || "File uploaded"}
                color="secondary"
                variant="outlined"
                sx={{ mb: 1 }}
              />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 1,
                  mt: 1,
                }}
              >
                <Button
                  variant="outlined"
                  size="small"
                  color="secondary"
                  startIcon={<CloudUploadIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    !staffingLoading &&
                      document.getElementById("staffing-file-input").click();
                  }}
                  disabled={staffingLoading}
                >
                  Change
                </Button>
              </Box>
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Upload Excel file (.xlsx or .xls)
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                for team utilization and staffing
              </Typography>
              {staffingError && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  {staffingError}
                </Typography>
              )}
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<CloudUploadIcon />}
                  disabled={staffingLoading}
                >
                  Upload
                </Button>
              </Box>
            </>
          )}

          <input
            id="staffing-file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleStaffingFileChange}
            style={{ display: "none" }}
          />
        </Paper>
      </Box>
    </Box>
  );
};

export default DualFileUploader;
