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
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DescriptionIcon from "@mui/icons-material/Description";
import DeleteIcon from "@mui/icons-material/Delete";

const FileUploader = ({ onFileUploaded, hasData }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(!hasData);

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

    // Auto-upload the file when selected
    handleUpload(selectedFile);
  };

  const handleUpload = async (selectedFile) => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      // Read the file as ArrayBuffer
      const buffer = await readFile(selectedFile);
      // Pass the file data to the parent component
      onFileUploaded(selectedFile.name, buffer);
      // Close the dialog if open
      setOpen(false);
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
    // Only close if we have data loaded
    if (hasData) {
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<CloudUploadIcon />}
        onClick={openUploadDialog}
        sx={{ ml: 2 }}
      >
        {hasData ? "Change Data File" : "Upload Excel File"}
      </Button>

      <Dialog open={open} onClose={closeUploadDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Excel Data File</DialogTitle>
        <DialogContent>
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
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                    sx={{ mt: 2 }}
                  >
                    Remove
                  </Button>
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
                    Upload your Excel file (.xlsx or .xls)
                  </Typography>
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
          {hasData && (
            <Button onClick={closeUploadDialog} color="primary">
              Cancel
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FileUploader;
