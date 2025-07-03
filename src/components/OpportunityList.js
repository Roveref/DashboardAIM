import React, { useState } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  Card,
  CardContent,
  Grid,
  alpha,
  useTheme,
  TableSortLabel,
  Button,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import DescriptionIcon from "@mui/icons-material/Description";
import InfoIcon from "@mui/icons-material/Info";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import CommentIcon from "@mui/icons-material/Comment";
import MeetingMinutes from "./MeetingMinutes"; // Import the meeting minutes component
import OpportunityActions from "./OpportunityActions"; // Import the actions component
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";

const isSAPProject = (opportunity) => {
  // Get all service lines for this opportunity
  const serviceLines = [
    opportunity["Service Line 1"],
    opportunity["Service Line 2"],
    opportunity["Service Line 3"],
  ].filter((line) => line && line !== "-"); // Remove empty or dash values

  // Check if the opportunity has all three required service lines for SAP
  const hasOperations = serviceLines.some(
    (line) => line && line.toLowerCase().includes("operations")
  );
  const hasTechnology = serviceLines.some(
    (line) => line && line.toLowerCase().includes("technology")
  );
  const hasFinanceRisk = serviceLines.some(
    (line) =>
      line &&
      (line.toLowerCase().includes("finance") ||
        line.toLowerCase().includes("risk"))
  );

  return hasOperations && hasTechnology && hasFinanceRisk;
};

// Status colors mapping
const statusColors = {
  1: "primary", // Earliest pipeline stages
  4: "primary", // Mid pipeline
  6: "primary", // Mid pipeline
  11: "primary", // Last pipeline stage
  14: "success", // Bookings
  15: "error", // Lost
};

// Status text mapping
const statusText = {
  1: "New Lead",
  4: "Go Approved",
  6: "Proposal Delivered",
  11: "Final Negotiation",
  14: "Booked",
  15: "Lost",
};

// Revenue calculation function to match previous implementation
const calculateRevenueWithSegmentLogic = (item, showNetRevenue = false) => {
  // Determine which revenue field to use based on showNetRevenue flag
  const revenueField = showNetRevenue ? "Net Revenue" : "Gross Revenue";

  // Check if segment code is AUTO, CLR, or IEM
  const specialSegmentCodes = ["AUTO", "CLR", "IEM"];
  const isSpecialSegmentCode = specialSegmentCodes.includes(
    item["Sub Segment Code"]
  );

  // If special segment code, return full revenue
  if (isSpecialSegmentCode) {
    return item[revenueField] || 0;
  }

  // Check each service line (1, 2 and 3)
  const serviceLines = [
    {
      line: item["Service Line 1"],
      percentage: item["Service Offering 1 %"] || 0,
    },
    {
      line: item["Service Line 2"],
      percentage: item["Service Offering 2 %"] || 0,
    },
    {
      line: item["Service Line 3"],
      percentage: item["Service Offering 3 %"] || 0,
    },
  ];

  // Calculate total allocated revenue for Operations
  const operationsAllocation = serviceLines.reduce((total, service) => {
    if (service.line === "Operations") {
      return total + (item[revenueField] || 0) * (service.percentage / 100);
    }
    return total;
  }, 0);

  // If any Operations allocation is found, return that
  if (operationsAllocation > 0) {
    return operationsAllocation;
  }

  // If no specific Operations allocation, return full revenue
  return item[revenueField] || 0;
};

const exportOpportunities = (
  data,
  isFiltered = false,
  showNetRevenue = false
) => {
  // Ensure data is an array
  const opportunitiesData = Array.isArray(data) ? data : [];

  // If no data, show an alert and return
  if (opportunitiesData.length === 0) {
    alert("No opportunities to export.");
    return;
  }

  // Create a formatted markdown file of all displayed opportunities
  let markdownContent = `# Opportunity List Export\n`;
  markdownContent += `Date: ${new Date().toLocaleDateString("fr-FR")}\n`;
  markdownContent += `Total Opportunities: ${opportunitiesData.length}\n`;
  markdownContent += `Revenue Type: ${
    showNetRevenue ? "Net Revenue" : "Gross Revenue"
  }\n\n`;

  if (isFiltered) {
    markdownContent += `> Note: This is a filtered list of opportunities\n\n`;
  }

  // Group opportunities by client with defensive checks
  const opportunitiesByClient = opportunitiesData.reduce((acc, opp) => {
    const client = (opp && opp["Account"]) || "Unknown Client";
    if (!acc[client]) {
      acc[client] = [];
    }
    acc[client].push(opp);
    return acc;
  }, {});

  // Add opportunities grouped by client
  Object.entries(opportunitiesByClient).forEach(([client, opportunities]) => {
    markdownContent += `## Client: ${client}\n\n`;

    opportunities.forEach((opp) => {
      // Defensive checks for each opportunity
      if (!opp) return;

      markdownContent += `### ${
        opp["Opportunity"] || "Unnamed Opportunity"
      } (ID: ${opp["Opportunity ID"] || "N/A"})\n\n`;

      // Status
      markdownContent += `**Status**: ${
        (opp["Status"] && statusText[opp["Status"]]) ||
        `Status ${opp["Status"] || "Unknown"}`
      }\n\n`;

      // Add Lost Comment if this is a lost opportunity and comment exists
      if (opp["Status"] === 15 && opp["Lost Comment"]) {
        markdownContent += `**Lost Comment**: ${opp["Lost Comment"]}\n\n`;
      }

      // Financial Details
      markdownContent += `#### Financial Details\n\n`;

      // Use the appropriate revenue field based on showNetRevenue flag
      const revenueField = showNetRevenue ? "Net Revenue" : "Gross Revenue";
      markdownContent += `- **${showNetRevenue ? "Net" : "Gross"} Revenue**: ${
        typeof opp[revenueField] === "number"
          ? new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(opp[revenueField])
          : opp[revenueField] || "N/A"
      }\n`;

      // Calculate I&O Revenue
      const calculatedRevenue = calculateRevenueWithSegmentLogic(
        opp,
        showNetRevenue
      );
      markdownContent += `- **I&O Revenue**: ${new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(calculatedRevenue)}\n`;

      // Allocation information if present
      if (opp["Is Allocated"]) {
        markdownContent += `- **Allocated to**: ${
          opp["Allocated Service Line"] || "N/A"
        }\n`;
        markdownContent += `- **Allocation Percentage**: ${
          opp["Allocation Percentage"] || "N/A"
        }%\n`;
        markdownContent += `- **Allocated Amount**: ${
          typeof opp[
            showNetRevenue ? "Allocated Net Revenue" : "Allocated Gross Revenue"
          ] === "number"
            ? new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(
                opp[
                  showNetRevenue
                    ? "Allocated Net Revenue"
                    : "Allocated Gross Revenue"
                ]
              )
            : opp[
                showNetRevenue
                  ? "Allocated Net Revenue"
                  : "Allocated Gross Revenue"
              ] || "N/A"
        }\n`;
      }

      // Contribution margin if available
      if (opp["CM1%"]) {
        markdownContent += `- **Contribution Margin**: ${opp["CM1%"]}%\n`;
      }

      markdownContent += `\n`;

      // Team Information
      markdownContent += `#### Team Information\n\n`;
      markdownContent += `- **Engagement Manager**: ${
        opp["EM"] || "Not assigned"
      }\n`;
      markdownContent += `- **Engagement Partner**: ${
        opp["EP"] || "Not assigned"
      }\n`;
      markdownContent += `- **Manager**: ${opp["Manager"] || "Not assigned"}\n`;
      markdownContent += `- **Partner**: ${
        opp["Partner"] || "Not assigned"
      }\n\n`;

      // Service Details
      markdownContent += `#### Service Offerings\n\n`;

      // Primary Service
      if (opp["Service Line 1"]) {
        markdownContent += `##### Primary Service\n`;
        markdownContent += `- **Service Line**: ${opp["Service Line 1"]}\n`;
        markdownContent += `- **Service Offering**: ${
          opp["Service Offering 1"] || "N/A"
        }\n`;
        markdownContent += `- **Percentage**: ${
          opp["Service Offering 1 %"] || 0
        }%\n`;
        markdownContent += `- **Amount**: ${new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: "EUR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(
          ((opp[revenueField] || 0) * (opp["Service Offering 1 %"] || 0)) / 100
        )}\n\n`;
      }

      // Secondary Service
      if (opp["Service Line 2"] && opp["Service Line 2"] !== "-") {
        markdownContent += `##### Secondary Service\n`;
        markdownContent += `- **Service Line**: ${opp["Service Line 2"]}\n`;
        markdownContent += `- **Service Offering**: ${
          opp["Service Offering 2"] || "N/A"
        }\n`;
        markdownContent += `- **Percentage**: ${
          opp["Service Offering 2 %"] || 0
        }%\n`;
        markdownContent += `- **Amount**: ${new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: "EUR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(
          ((opp[revenueField] || 0) * (opp["Service Offering 2 %"] || 0)) / 100
        )}\n\n`;
      }

      // Tertiary Service
      if (opp["Service Line 3"] && opp["Service Line 3"] !== "-") {
        markdownContent += `##### Tertiary Service\n`;
        markdownContent += `- **Service Line**: ${opp["Service Line 3"]}\n`;
        markdownContent += `- **Service Offering**: ${
          opp["Service Offering 3"] || "N/A"
        }\n`;
        markdownContent += `- **Percentage**: ${
          opp["Service Offering 3 %"] || 0
        }%\n`;
        markdownContent += `- **Amount**: ${new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: "EUR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(
          ((opp[revenueField] || 0) * (opp["Service Offering 3 %"] || 0)) / 100
        )}\n\n`;
      }

      // Additional Information
      markdownContent += `#### Additional Information\n\n`;
      markdownContent += `- **Project Type**: ${
        opp["Project Type"] || "N/A"
      }\n`;
      markdownContent += `- **Creation Date**: ${
        opp["Creation Date"]
          ? new Date(opp["Creation Date"]).toLocaleDateString("fr-FR")
          : "N/A"
      }\n`;
      markdownContent += `- **Booking/Lost**: ${
        opp["Booking/Lost Date"]
          ? new Date(opp["Booking/Lost Date"]).toLocaleDateString("fr-FR")
          : "N/A"
      }\n\n`;

      // Separator between opportunities
      markdownContent += `---\n\n`;
    });
  });

  // Add summary at the end
  markdownContent += `## Summary\n\n`;
  markdownContent += `- **Total Clients**: ${
    Object.keys(opportunitiesByClient).length
  }\n`;
  markdownContent += `- **Total Opportunities**: ${opportunitiesData.length}\n`;

  // Count statuses
  const statusCounts = opportunitiesData.reduce((acc, opp) => {
    if (!opp) return acc;
    const statusName =
      (opp["Status"] && statusText[opp["Status"]]) || `Status ${opp["Status"]}`;
    acc[statusName] = (acc[statusName] || 0) + 1;
    return acc;
  }, {});

  markdownContent += `\n#### Opportunities by Status\n\n`;
  Object.entries(statusCounts).forEach(([status, count]) => {
    markdownContent += `- **${status}**: ${count}\n`;
  });

  // Calculate total revenue using appropriate revenue field
  const revenueField = showNetRevenue ? "Net Revenue" : "Gross Revenue";
  const totalRevenue = opportunitiesData.reduce(
    (total, opp) => total + ((opp && opp[revenueField]) || 0),
    0
  );
  const totalIORevenue = opportunitiesData.reduce(
    (total, opp) =>
      total + calculateRevenueWithSegmentLogic(opp, showNetRevenue),
    0
  );

  markdownContent += `\n#### Financial Summary\n\n`;
  markdownContent += `- **Total ${
    showNetRevenue ? "Net" : "Gross"
  } Revenue**: ${new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(totalRevenue)}\n`;
  markdownContent += `- **Total I&O Revenue**: ${new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }
  ).format(totalIORevenue)}\n`;

  // Add export footer
  markdownContent += `\n---\n`;
  markdownContent += `Generated on ${new Date().toLocaleString("fr-FR")}\n`;

  // Download the file
  const element = document.createElement("a");
  const file = new Blob([markdownContent], { type: "text/markdown" });
  element.href = URL.createObjectURL(file);
  element.download = `opportunities_export_${
    showNetRevenue ? "net" : "gross"
  }_${new Date().toISOString().split("T")[0]}.md`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

// Row component with expandable details
const OpportunityRow = ({ row, isSelected, onRowClick, showNetRevenue }) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const calculatedRevenue = calculateRevenueWithSegmentLogic(
    row,
    showNetRevenue
  );

  return (
    <>
      <TableRow
        hover
        onClick={() => onRowClick(row)}
        selected={isSelected}
        sx={{
          "&:last-child td, &:last-child th": { border: 0 },
          cursor: "pointer",
          transition: "all 0.2s ease",
          "&.Mui-selected": {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            "&:hover": {
              backgroundColor: alpha(theme.palette.primary.main, 0.12),
            },
          },
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
            transform: "translateY(-1px)",
            boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.05)}`,
          },
        }}
      >
        <TableCell
          padding="checkbox"
          sx={{ width: 48, minWidth: 48, maxWidth: 48 }}
        >
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(!open);
            }}
            sx={{
              transition: "transform 0.2s",
              transform: open ? "rotate(-180deg)" : "rotate(0)",
            }}
          >
            <KeyboardArrowDownIcon />
          </IconButton>
        </TableCell>
        <TableCell
          component="th"
          scope="row"
          padding="none"
          sx={{ width: 120, minWidth: 120, maxWidth: 120 }}
        >
          <Typography
            variant="body2"
            fontWeight={500}
            sx={{
              ml: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {row["Opportunity ID"]}
          </Typography>
        </TableCell>
        <TableCell sx={{ width: "25%", minWidth: 180 }}>
          <Typography
            variant="body2"
            fontWeight={isSelected ? 600 : 400}
            sx={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {row["Opportunity"]}
          </Typography>
        </TableCell>
        <TableCell sx={{ width: 120, minWidth: 120, maxWidth: 120 }}>
          <Chip
            label={statusText[row["Status"]] || `Status ${row["Status"]}`}
            color={statusColors[row["Status"]] || "default"}
            size="small"
            variant="filled"
            sx={{
              fontWeight: 500,
              boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.1)}`,
            }}
          />
          {/* Add comment indicator for lost opportunities */}
          {row["Status"] === 15 && row["Lost Comment"] && (
            <Tooltip title={`Lost Comment: ${row["Lost Comment"]}`}>
              <CommentIcon
                fontSize="small"
                color="error"
                sx={{ ml: 0.5, verticalAlign: "middle" }}
              />
            </Tooltip>
          )}
        </TableCell>
        <TableCell
          align="right"
          sx={{ width: 150, minWidth: 150, maxWidth: 150 }}
        >
          <Typography variant="body2" fontWeight={500}>
            {row["Is Allocated"] ? (
              <>
                {typeof (showNetRevenue
                  ? row["Allocated Net Revenue"]
                  : row["Allocated Gross Revenue"]) === "number"
                  ? new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(
                      showNetRevenue
                        ? row["Allocated Net Revenue"]
                        : row["Allocated Gross Revenue"]
                    )
                  : showNetRevenue
                  ? row["Allocated Net Revenue"]
                  : row["Allocated Gross Revenue"]}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  {row["Allocated Service Line"]}:{" "}
                  {row["Allocation Percentage"]}%
                </Typography>
              </>
            ) : typeof (showNetRevenue
                ? row["Net Revenue"]
                : row["Gross Revenue"]) === "number" ? (
              new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(
                showNetRevenue ? row["Net Revenue"] : row["Gross Revenue"]
              )
            ) : showNetRevenue ? (
              row["Net Revenue"]
            ) : (
              row["Gross Revenue"]
            )}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            I&O:{" "}
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(calculatedRevenue)}
          </Typography>
        </TableCell>
        <TableCell sx={{ width: "25%", minWidth: 150 }}>
          <Typography
            variant="body2"
            sx={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {row["Account"]}
          </Typography>
        </TableCell>
        <TableCell sx={{ width: "25%", minWidth: 150 }}>
          <Typography
            variant="body2"
            sx={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {row["Service Line 1"]}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ width: 80 }}>
          {isSAPProject(row) && (
            <Chip
              label="SAP"
              size="small"
              sx={{
                height: 20,
                fontSize: "0.65rem",
                fontWeight: 600,
                backgroundColor: alpha(theme.palette.success.main, 0.15),
                color: theme.palette.success.main,
                border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                "& .MuiChip-label": {
                  px: 1,
                },
              }}
            />
          )}
        </TableCell>
      </TableRow>

      {/* Collapsed row with details */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse
            in={open}
            timeout="auto"
            unmountOnExit
            sx={{
              transition: "all 0.3s ease !important",
            }}
          >
            <Box sx={{ m: 2 }}>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.background.paper, 0.7),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  overflow: "hidden",
                  boxShadow: `0 4px 20px ${alpha(
                    theme.palette.primary.main,
                    0.08
                  )}`,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    boxShadow: `0 6px 24px ${alpha(
                      theme.palette.primary.main,
                      0.12
                    )}`,
                  },
                }}
              >
                {/* Opportunity Title Banner */}
                <Box
                  sx={{
                    p: 2.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                    borderBottom: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.1
                    )}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundImage: `linear-gradient(to right, ${alpha(
                      theme.palette.primary.light,
                      0.1
                    )}, ${alpha(theme.palette.primary.main, 0.04)})`,
                  }}
                >
                  <Box>
                    {row["CRM Link"] ? (
                      <Typography
                        variant="h6"
                        color="primary.main"
                        fontWeight={700}
                        component="a"
                        href={row["CRM Link"]}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          textDecoration: "none",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            textDecoration: "underline",
                            color: theme.palette.primary.dark,
                            transform: "translateX(2px)",
                          },
                          "&:active": {
                            transform: "translateX(1px)",
                          },
                          display: "flex",
                          alignItems: "center",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row["Opportunity"]}
                        <Box
                          component="span"
                          sx={{
                            ml: 1,
                            fontSize: "0.8rem",
                            opacity: 0.7,
                            transition: "opacity 0.2s ease",
                            "&:hover": {
                              opacity: 1,
                            },
                          }}
                        >
                          🔗
                        </Box>
                      </Typography>
                    ) : (
                      <Typography
                        variant="h6"
                        color="primary.main"
                        fontWeight={700}
                      >
                        {row["Opportunity"]}
                      </Typography>
                    )}
                    {isSAPProject(row) && (
                      <Chip
                        label="SAP"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.65rem",
                          fontWeight: 600,
                          backgroundColor: alpha(
                            theme.palette.success.main,
                            0.15
                          ),
                          color: theme.palette.success.main,
                          border: `1px solid ${alpha(
                            theme.palette.success.main,
                            0.3
                          )}`,
                          "& .MuiChip-label": {
                            px: 1,
                          },
                        }}
                      />
                    )}
                    <Typography variant="body2" color="text.secondary">
                      ID: {row["Opportunity ID"]} • Created:{" "}
                      {new Date(row["Creation Date"]).toLocaleDateString(
                        "fr-FR"
                      )}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Chip
                      label={
                        statusText[row["Status"]] || `Status ${row["Status"]}`
                      }
                      color={statusColors[row["Status"]] || "default"}
                      size="medium"
                      sx={{
                        fontWeight: 600,
                        px: 1,
                        boxShadow: `0 2px 4px ${alpha(
                          theme.palette.common.black,
                          0.1
                        )}`,
                        borderRadius: "8px",
                      }}
                    />
                  </Box>
                </Box>

                {/* Lost Comment Section - Only for lost opportunities */}
                {row["Status"] === 15 && row["Lost Comment"] && (
                  <Box
                    sx={{
                      p: 2.5,
                      bgcolor: alpha(theme.palette.error.main, 0.04),
                      borderBottom: `1px solid ${alpha(
                        theme.palette.error.main,
                        0.1
                      )}`,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        mb: 1,
                      }}
                    >
                      <CommentIcon
                        color="error"
                        sx={{ mr: 1, mt: 0.5, fontSize: 20 }}
                      />
                      <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        color="error.main"
                      >
                        Lost Comment
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        ml: 3,
                        p: 1.5,
                        bgcolor: alpha(theme.palette.error.main, 0.08),
                        borderRadius: 1,
                        borderLeft: `3px solid ${theme.palette.error.main}`,
                        fontStyle: "italic",
                      }}
                    >
                      "{row["Lost Comment"]}"
                    </Typography>
                  </Box>
                )}

                {/* Total Opportunity Amount - Improved Allocation Display */}
                <Box
                  sx={{
                    p: 2.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                    borderBottom: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.1
                    )}`,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: row["Is Allocated"] ? 1.5 : 0,
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      color="primary.main"
                    >
                      Total Opportunity{" "}
                      {showNetRevenue ? "Net Amount" : "Gross Amount"}
                    </Typography>
                    <Typography
                      variant="h5"
                      fontWeight={700}
                      color="primary.main"
                    >
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(
                        showNetRevenue
                          ? row["Net Revenue"] || 0
                          : row["Gross Revenue"] || 0
                      )}
                    </Typography>
                  </Box>

                  {/* Allocation Information - Only shown when allocated */}
                  {row["Is Allocated"] && (
                    <Box
                      sx={{
                        mt: 1,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.secondary.main, 0.08),
                        border: `1px solid ${alpha(
                          theme.palette.secondary.main,
                          0.2
                        )}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        boxShadow: `0 2px 8px ${alpha(
                          theme.palette.secondary.main,
                          0.1
                        )}`,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="caption"
                          fontWeight={500}
                          color="secondary.main"
                          sx={{ display: "flex", alignItems: "center" }}
                        >
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              bgcolor: "secondary.main",
                              mr: 1,
                            }}
                          />
                          Allocated to {row["Allocated Service Line"]}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color="secondary.dark"
                        >
                          {row["Allocation Percentage"]}% of total value
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography variant="caption" color="secondary.main">
                          Allocated Amount
                        </Typography>
                        <Typography
                          variant="h6"
                          fontWeight={700}
                          color="secondary.main"
                        >
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(
                            showNetRevenue
                              ? row["Allocated Net Revenue"] || 0
                              : row["Allocated Gross Revenue"] || 0
                          )}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>

                <CardContent sx={{ p: 0 }}>
                  <Grid container>
                    {/* Opportunity Details - Left Column */}
                    <Grid
                      item
                      xs={12}
                      md={4}
                      sx={{
                        p: 2.5,
                        borderRight: {
                          xs: "none",
                          md: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                        },
                        borderBottom: {
                          xs: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                          md: "none",
                        },
                        backgroundColor: alpha(
                          theme.palette.background.default,
                          0.3
                        ),
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        color="primary.main"
                        fontWeight={700}
                        sx={{ mb: 2, display: "flex", alignItems: "center" }}
                      >
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: "primary.main",
                            mr: 1,
                          }}
                        />
                        Opportunity Details
                      </Typography>

                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Booking/Lost
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{ mb: 2 }}
                          >
                            {new Date(
                              row["Booking/Lost Date"]
                            ).toLocaleDateString("fr-FR")}
                          </Typography>

                          <Typography variant="caption" color="text.secondary">
                            Project Type
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {row["Project Type"] || "N/A"}
                          </Typography>
                        </Grid>

                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Account
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{ mb: 2 }}
                          >
                            {row["Account"]}
                          </Typography>

                          <Typography variant="caption" color="text.secondary">
                            Contribution Margin
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {row["CM1%"] ? `${row["CM1%"]}%` : "N/A"}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Grid>

                    {/* Service Offerings - Center Column */}
                    <Grid
                      item
                      xs={12}
                      md={4}
                      sx={{
                        p: 2.5,
                        borderRight: {
                          xs: "none",
                          md: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                        },
                        borderBottom: {
                          xs: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                          md: "none",
                        },
                        background: alpha(theme.palette.background.paper, 0.6),
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        color="secondary.main"
                        fontWeight={700}
                        sx={{ mb: 2, display: "flex", alignItems: "center" }}
                      >
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: "secondary.main",
                            mr: 1,
                          }}
                        />
                        Service Offerings
                      </Typography>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Primary Service
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {row["Service Line 1"]}
                        </Typography>

                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 1,
                            mt: 0.5,
                            p: 0.75,
                            borderRadius: 1,
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                            border: `1px solid ${alpha(
                              theme.palette.primary.main,
                              0.08
                            )}`,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontSize: "0.8rem" }}
                            >
                              {row["Service Offering 1"]}
                            </Typography>
                            <Chip
                              label={`${row["Service Offering 1 %"]}%`}
                              size="small"
                              sx={{
                                ml: 1,
                                height: 20,
                                fontSize: "0.7rem",
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                fontWeight: 600,
                              }}
                            />
                          </Box>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color="primary.main"
                          >
                            {new Intl.NumberFormat("fr-FR", {
                              style: "currency",
                              currency: "EUR",
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(
                              ((showNetRevenue
                                ? row["Net Revenue"]
                                : row["Gross Revenue"]) || 0) *
                                (row["Service Offering 1 %"] / 100)
                            )}
                          </Typography>
                        </Box>
                      </Box>

                      {row["Service Line 2"] &&
                        row["Service Line 2"] !== "-" && (
                          <Box sx={{ mb: 2 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Secondary Service
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {row["Service Line 2"]}
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mb: 1,
                                mt: 0.5,
                                p: 0.75,
                                borderRadius: 1,
                                bgcolor: alpha(
                                  theme.palette.secondary.main,
                                  0.05
                                ),
                                border: `1px solid ${alpha(
                                  theme.palette.secondary.main,
                                  0.08
                                )}`,
                              }}
                            >
                              <Box
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ fontSize: "0.8rem" }}
                                >
                                  {row["Service Offering 2"]}
                                </Typography>
                                <Chip
                                  label={`${row["Service Offering 2 %"]}%`}
                                  size="small"
                                  sx={{
                                    ml: 1,
                                    height: 20,
                                    fontSize: "0.7rem",
                                    bgcolor: alpha(
                                      theme.palette.secondary.main,
                                      0.1
                                    ),
                                    color: theme.palette.secondary.main,
                                    fontWeight: 600,
                                  }}
                                />
                              </Box>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color="secondary.main"
                              >
                                {new Intl.NumberFormat("fr-FR", {
                                  style: "currency",
                                  currency: "EUR",
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                }).format(
                                  ((showNetRevenue
                                    ? row["Net Revenue"]
                                    : row["Gross Revenue"]) || 0) *
                                    (row["Service Offering 2 %"] / 100)
                                )}
                              </Typography>
                            </Box>
                          </Box>
                        )}

                      {row["Service Line 3"] &&
                        row["Service Line 3"] !== "-" && (
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Tertiary Service
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {row["Service Line 3"]}
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mt: 0.5,
                                p: 0.75,
                                borderRadius: 1,
                                bgcolor: alpha(theme.palette.info.main, 0.05),
                                border: `1px solid ${alpha(
                                  theme.palette.info.main,
                                  0.08
                                )}`,
                              }}
                            >
                              <Box
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ fontSize: "0.8rem" }}
                                >
                                  {row["Service Offering 3"]}
                                </Typography>
                                <Chip
                                  label={`${row["Service Offering 3 %"]}%`}
                                  size="small"
                                  sx={{
                                    ml: 1,
                                    height: 20,
                                    fontSize: "0.7rem",
                                    bgcolor: alpha(
                                      theme.palette.info.main,
                                      0.1
                                    ),
                                    color: theme.palette.info.main,
                                    fontWeight: 600,
                                  }}
                                />
                              </Box>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color="info.main"
                              >
                                {new Intl.NumberFormat("fr-FR", {
                                  style: "currency",
                                  currency: "EUR",
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                }).format(
                                  ((showNetRevenue
                                    ? row["Net Revenue"]
                                    : row["Gross Revenue"]) || 0) *
                                    (row["Service Offering 3 %"] / 100)
                                )}
                              </Typography>
                            </Box>
                          </Box>
                        )}

                      {/* Allocation verification - Display total allocated percentage */}
                      {(row["Service Offering 1 %"] ||
                        row["Service Offering 2 %"] ||
                        row["Service Offering 3 %"]) && (
                        <Box
                          sx={{
                            mt: 3,
                            pt: 1.5,
                            borderTop: `1px dashed ${alpha(
                              theme.palette.divider,
                              0.7
                            )}`,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Total Allocation:
                          </Typography>
                          <Chip
                            label={`${(
                              parseFloat(row["Service Offering 1 %"] || 0) +
                              parseFloat(row["Service Offering 2 %"] || 0) +
                              parseFloat(row["Service Offering 3 %"] || 0)
                            ).toFixed(0)}%`}
                            size="small"
                            color={
                              Math.abs(
                                parseFloat(row["Service Offering 1 %"] || 0) +
                                  parseFloat(row["Service Offering 2 %"] || 0) +
                                  parseFloat(row["Service Offering 3 %"] || 0) -
                                  100
                              ) < 0.01
                                ? "success"
                                : "warning"
                            }
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                      )}
                    </Grid>

                    {/* Team Information - Right Column */}
                    <Grid
                      item
                      xs={12}
                      md={4}
                      sx={{
                        p: 2.5,
                        backgroundColor: alpha(
                          theme.palette.background.default,
                          0.3
                        ),
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        color="info.main"
                        fontWeight={700}
                        sx={{ mb: 2, display: "flex", alignItems: "center" }}
                      >
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: "info.main",
                            mr: 1,
                          }}
                        />
                        Team Information
                      </Typography>

                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Engagement Manager
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{ mb: 2 }}
                          >
                            {row["EM"] || "Not assigned"}
                          </Typography>

                          <Typography variant="caption" color="text.secondary">
                            Manager
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {row["Manager"] || "Not assigned"}
                          </Typography>
                        </Grid>

                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Engagement Partner
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{ mb: 2 }}
                          >
                            {row["EP"] || "Not assigned"}
                          </Typography>

                          <Typography variant="caption" color="text.secondary">
                            Partner
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {row["Partner"] || "Not assigned"}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* Add the OpportunityActions component here with the opportunity details */}
                  <OpportunityActions
                    opportunityId={row["Opportunity ID"]}
                    opportunityName={row["Opportunity"]}
                    opportunityDetails={{
                      EM: row["EM"],
                      EP: row["EP"],
                      Account: row["Account"],
                      Status:
                        statusText[row["Status"]] || `Status ${row["Status"]}`,
                      Revenue: row["Gross Revenue"],
                      ServiceLine: row["Service Line 1"],
                    }}
                  />
                </CardContent>
              </Card>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const OpportunityList = ({
  data,
  title,
  selectedOpportunities,
  onSelectionChange,
  defaultRowsPerPage = 100,
  resetFilterCallback = null,
  isFiltered = false,
  disablePagination = false, // New prop to disable pagination
  showNetRevenue = false, // Added the showNetRevenue prop with default value
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const theme = useTheme();
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("Opportunity ID");

  const opportunitiesData = Array.isArray(data) ? data : [];

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRowClick = (row) => {
    const opportunityId = row["Opportunity ID"];
    let newSelection;

    if (
      selectedOpportunities.some(
        (opp) => opp["Opportunity ID"] === opportunityId
      )
    ) {
      // If already selected, remove it
      newSelection = selectedOpportunities.filter(
        (opp) => opp["Opportunity ID"] !== opportunityId
      );
    } else {
      // If not selected, add it
      newSelection = [...selectedOpportunities, row];
    }

    onSelectionChange(newSelection);
  };

  const isSelected = (row) => {
    return selectedOpportunities.some(
      (opp) => opp["Opportunity ID"] === row["Opportunity ID"]
    );
  };

  const handleSortRequest = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedData = () => {
    return data.slice().sort((a, b) => {
      let aValue = a[orderBy];
      let bValue = b[orderBy];

      // Handle specific types of data
      if (orderBy === "Gross Revenue" || orderBy === "Net Revenue") {
        aValue = typeof aValue === "number" ? aValue : 0;
        bValue = typeof bValue === "number" ? bValue : 0;
      } else if (orderBy === "Status") {
        // For status, use the numeric value
        aValue =
          typeof aValue === "number" ? aValue : parseInt(aValue, 10) || 0;
        bValue =
          typeof bValue === "number" ? bValue : parseInt(bValue, 10) || 0;
      } else if (typeof aValue === "string" && typeof bValue === "string") {
        // Case-insensitive string comparison
        return order === "asc"
          ? aValue.toLowerCase().localeCompare(bValue.toLowerCase())
          : bValue.toLowerCase().localeCompare(aValue.toLowerCase());
      }

      // Default numeric comparison
      return order === "asc" ? aValue - bValue : bValue - aValue;
    });
  };
  const getDisplayData = () => {
    const sortedResults = sortedData();

    // If pagination is disabled, return all data
    if (disablePagination) {
      return sortedResults;
    }

    // Otherwise return paginated data
    return sortedResults.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  };

  return (
    <Paper
      elevation={2}
      sx={{
        width: "100%",
        overflow: "hidden",
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: alpha(theme.palette.primary.main, 0.03),
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="h6" component="div" fontWeight={600}>
            {title || "Opportunities"}{" "}
            {showNetRevenue ? "(Net Revenue)" : "(Gross Revenue)"}
          </Typography>
          {data.length > 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              component="div"
              sx={{ ml: 1 }}
            >
              {data.length} opportunities
            </Typography>
          )}
        </Box>

        {/* Control area with filter reset and meeting minutes */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {/* Filter reset button */}
          <Box
            sx={{
              width: 110, // Fixed width that accommodates the largest content
              height: 32, // Fixed height
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mr: 1,
            }}
          >
            {isFiltered && resetFilterCallback ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<FilterListOffIcon />}
                onClick={resetFilterCallback}
                color="primary"
                sx={{
                  minWidth: "auto",
                  maxWidth: 110,
                  height: 32,
                }}
              >
                Show All
              </Button>
            ) : (
              <Box
                sx={{
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  px: 1.5,
                  py: 0.5,
                  maxWidth: 110,
                  height: 32,
                  opacity: 0.7,
                  color: "text.secondary",
                }}
              >
                <Typography variant="body2">All Data</Typography>
              </Box>
            )}
          </Box>
          {/* Export Opportunities button - only show when there's data */}
          {opportunitiesData.length > 0 && (
            <IconButton
              size="small"
              color="primary"
              aria-label="export opportunities"
              onClick={() =>
                exportOpportunities(
                  opportunitiesData,
                  isFiltered,
                  showNetRevenue
                )
              } // Pass showNetRevenue
              title={`Export Opportunities List`}
              sx={{
                ml: 1,
                boxShadow: `0 2px 4px ${alpha(
                  theme.palette.common.black,
                  0.08
                )}`,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  boxShadow: `0 2px 6px ${alpha(
                    theme.palette.common.black,
                    0.12
                  )}`,
                },
              }}
            >
              <FormatListBulletedIcon fontSize="small" />
            </IconButton>
          )}
          {/* Meeting Minutes button - only show when there's data */}
          {data.length > 0 && (
            <IconButton
              size="small"
              color="primary"
              aria-label="meeting minutes"
              onClick={() => {
                // This will use the existing MeetingMinutes component's functionality
                document.getElementById("meeting-minutes-button")?.click();
              }}
              sx={{
                ml: 1.5,
                boxShadow: `0 2px 4px ${alpha(
                  theme.palette.common.black,
                  0.08
                )}`,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  boxShadow: `0 2px 6px ${alpha(
                    theme.palette.common.black,
                    0.12
                  )}`,
                },
              }}
            >
              <DescriptionIcon fontSize="small" />
            </IconButton>
          )}

          {/* Hidden original MeetingMinutes component to maintain functionality */}
          {data.length > 0 && (
            <Box sx={{ display: "none" }}>
              <MeetingMinutes id="meeting-minutes-button" />
            </Box>
          )}

          <Tooltip title="Click on rows to select. Expand rows for more details.">
            <InfoIcon color="action" fontSize="small" sx={{ ml: 1 }} />
          </Tooltip>
        </Box>
      </Box>
      {/* Modified TableContainer with no fixed height */}
      <TableContainer
        sx={{
          width: "100%",
          overflow: "visible",
          "& .MuiTable-root": {
            tableLayout: "fixed",
            width: "100%",
          },
        }}
      >
        <Table
          stickyHeader={false}
          aria-label="opportunities table"
          size="small"
        >
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ width: 48 }} />
              <TableCell padding="none" sx={{ width: 120 }}>
                <TableSortLabel
                  active={orderBy === "Opportunity ID"}
                  direction={orderBy === "Opportunity ID" ? order : "asc"}
                  onClick={() => handleSortRequest("Opportunity ID")}
                >
                  ID
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: "25%" }}>
                <TableSortLabel
                  active={orderBy === "Opportunity"}
                  direction={orderBy === "Opportunity" ? order : "asc"}
                  onClick={() => handleSortRequest("Opportunity")}
                >
                  Opportunity
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: 120 }}>
                <TableSortLabel
                  active={orderBy === "Status"}
                  direction={orderBy === "Status" ? order : "asc"}
                  onClick={() => handleSortRequest("Status")}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ width: 150 }}>
                <TableSortLabel
                  active={
                    orderBy ===
                    (showNetRevenue ? "Net Revenue" : "Gross Revenue")
                  }
                  direction={
                    orderBy ===
                    (showNetRevenue ? "Net Revenue" : "Gross Revenue")
                      ? order
                      : "asc"
                  }
                  onClick={() =>
                    handleSortRequest(
                      showNetRevenue ? "Net Revenue" : "Gross Revenue"
                    )
                  }
                >
                  {showNetRevenue ? "Net Revenue" : "Gross Revenue"}
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: "25%" }}>
                <TableSortLabel
                  active={orderBy === "Account"}
                  direction={orderBy === "Account" ? order : "asc"}
                  onClick={() => handleSortRequest("Account")}
                >
                  Account
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: "25%" }}>
                <TableSortLabel
                  active={orderBy === "Service Line 1"}
                  direction={orderBy === "Service Line 1" ? order : "asc"}
                  onClick={() => handleSortRequest("Service Line 1")}
                >
                  Service Line
                </TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={{ width: 80 }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    No opportunities match the current filters
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              getDisplayData().map((row) => (
                <OpportunityRow
                  key={row["Opportunity ID"]}
                  row={row}
                  isSelected={isSelected(row)}
                  onRowClick={handleRowClick}
                  showNetRevenue={showNetRevenue} // Pass the prop here
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Only show pagination if not disabled */}
      {!disablePagination && (
        <TablePagination
          rowsPerPageOptions={[25, 50, 100, 250]}
          component="div"
          count={data.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            borderTop: "1px solid",
            borderColor: "divider",
            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
              {
                fontSize: "0.875rem",
              },
          }}
        />
      )}
    </Paper>
  );
};

export default OpportunityList;
