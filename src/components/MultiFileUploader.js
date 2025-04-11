import React, { useState } from "react";
import {
  Button,
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tabs,
  Tab,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DescriptionIcon from "@mui/icons-material/Description";
import DeleteIcon from "@mui/icons-material/Delete";
import PeopleIcon from "@mui/icons-material/People";
import TimelineIcon from "@mui/icons-material/Timeline";

/**
 * Enhanced file uploader that supports both opportunity and staffing files
 */
const MultiFileUploader = ({
  onOpportunityFileUploaded,
  onStaffingFileUploaded,
  hasOpportunityData,
  hasStaffingData,
}) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 for opportunities, 1 for staffing

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setFile(null); // Reset selected file when switching tabs
    setError("");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e) => {
    handleFiles(e.target.files);
  };

  const handleFiles = (files) => {
    if (files.length === 0) return;

    const selectedFile = files[0];

    // Check file type
    if (
      !selectedFile.name.endsWith(".xlsx") &&
      !selectedFile.name.endsWith(".xls")
    ) {
      setError("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    setFile(selectedFile);
    setError("");
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    try {
      // Read the file as ArrayBuffer
      const buffer = await readFile(file);

      // Pass the file data to the appropriate callback based on activeTab
      if (activeTab === 0) {
        onOpportunityFileUploaded(file.name, buffer);
      } else {
        onStaffingFileUploaded(file.name, buffer);
      }

      // Close the dialog
      setOpen(false);
      // Reset file
      setFile(null);
    } catch (err) {
      console.error("Error reading file:", err);
      setError("Failed to read the file. Please try again.");
    } finally {
      setLoading(false);
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

  const clearFile = () => {
    setFile(null);
  };

  const openUploadDialog = () => {
    setOpen(true);
  };

  const closeUploadDialog = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<CloudUploadIcon />}
        onClick={openUploadDialog}
        sx={{ ml: 2 }}
      >
        Upload Files
      </Button>

      <Dialog open={open} onClose={closeUploadDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Data File</DialogTitle>
        <DialogContent>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="file upload tabs"
            sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
          >
            <Tab
              icon={<TimelineIcon />}
              iconPosition="start"
              label="Opportunities"
              sx={{ textTransform: "none" }}
            />
            <Tab
              icon={<PeopleIcon />}
              iconPosition="start"
              label="Staffing"
              sx={{ textTransform: "none" }}
            />
          </Tabs>

          <Box sx={{ p: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Paper
              sx={{
                border: "2px dashed #ccc",
                borderRadius: 2,
                p: 4,
                textAlign: "center",
                backgroundColor: "#f8f8f8",
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: "#f0f0f0",
                  borderColor: "#aaa",
                },
              }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input").click()}
            >
              {loading ? (
                <CircularProgress size={40} />
              ) : file ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                  }}
                >
                  <DescriptionIcon
                    sx={{ fontSize: 48, color: "primary.main", mb: 1 }}
                  />
                  <Typography variant="body1">{file.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {(file.size / 1024).toFixed(2)} KB
                  </Typography>
                  <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFile();
                      }}
                    >
                      Remove
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpload();
                      }}
                    >
                      Upload
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <CloudUploadIcon
                    sx={{ fontSize: 48, color: "primary.main", mb: 1 }}
                  />
                  <Typography variant="h6">
                    Drag & Drop or Click to Upload
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    {activeTab === 0
                      ? "Upload your Opportunities Excel file (.xlsx or .xls)"
                      : "Upload your Staffing Excel file (.xlsx or .xls)"}
                  </Typography>
                  {activeTab === 1 && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1, fontStyle: "italic" }}
                    >
                      File should contain employees with chargeable hours and
                      total hours rows
                    </Typography>
                  )}
                </Box>
              )}
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeUploadDialog} color="primary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MultiFileUploader;
