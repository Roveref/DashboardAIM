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
import InfoIcon from "@mui/icons-material/Info";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";

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
const calculateRevenueWithSegmentLogic = (item) => {
  // Check if segment code is AUTO, CLR, or IEM
  const specialSegmentCodes = ['AUTO', 'CLR', 'IEM'];
  const isSpecialSegmentCode = specialSegmentCodes.includes(item['Sub Segment Code']);

  // If special segment code, return full gross revenue
  if (isSpecialSegmentCode) {
    return item['Gross Revenue'] || 0;
  }

  // Check each service line (1, 2, and 3)
  const serviceLines = [
    { line: item['Service Line 1'], percentage: item['Service Offering 1 %'] || 0 },
    { line: item['Service Line 2'], percentage: item['Service Offering 2 %'] || 0 },
    { line: item['Service Line 3'], percentage: item['Service Offering 3 %'] || 0 }
  ];

  // Calculate total allocated revenue for Operations
  const operationsAllocation = serviceLines.reduce((total, service) => {
    if (service.line === 'Operations') {
      return total + ((item['Gross Revenue'] || 0) * (service.percentage / 100));
    }
    return total;
  }, 0);

  // If any Operations allocation is found, return that
  if (operationsAllocation > 0) {
    return operationsAllocation;
  }

  // If no specific Operations allocation, return full gross revenue
  return item['Gross Revenue'] || 0;
};


// Row component with expandable details
const OpportunityRow = ({ row, isSelected, onRowClick }) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const calculatedRevenue = calculateRevenueWithSegmentLogic(row);

  return (
    <>
      <TableRow
        hover
        onClick={() => onRowClick(row)}
        selected={isSelected}
        sx={{
          "&:last-child td, &:last-child th": { border: 0 },
          cursor: "pointer",
          transition: "background-color 0.2s",
          "&.Mui-selected": {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            "&:hover": {
              backgroundColor: alpha(theme.palette.primary.main, 0.12),
            },
          },
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
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
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
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
            sx={{ fontWeight: 500 }}
          />
        </TableCell>
        <TableCell
          align="right"
          sx={{ width: 150, minWidth: 150, maxWidth: 150 }}
        >
          <Typography variant="body2" fontWeight={500}>
            {row["Is Allocated"] ? (
              <>
                {typeof row["Allocated Gross Revenue"] === "number"
                  ? new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(row["Allocated Gross Revenue"])
                  : row["Allocated Gross Revenue"]}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  {row["Allocated Service Line"]}: {row["Allocation Percentage"]}%
                  
                </Typography>
              </>
            ) : typeof row["Gross Revenue"] === "number" ? (
              new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(row["Gross Revenue"])
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
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ m: 2 }}>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.background.paper, 0.7),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  overflow: "hidden",
                  boxShadow: `0 4px 12px ${alpha(
                    theme.palette.primary.main,
                    0.08
                  )}`,
                }}
              >
                {/* Opportunity Title Banner */}
                <Box
                  sx={{
                    p: 2.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                    borderBottom: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.1
                    )}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography
                      variant="h6"
                      color="primary.main"
                      fontWeight={700}
                    >
                      {row["Opportunity"]}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ID: {row["Opportunity ID"]} • Created:{" "}
                      {new Date(row["Creation Date"]).toLocaleDateString('fr-FR')}
                    </Typography>
                  </Box>
                  <Chip
                    label={
                      statusText[row["Status"]] || `Status ${row["Status"]}`
                    }
                    color={statusColors[row["Status"]] || "default"}
                    size="medium"
                    sx={{ fontWeight: 600, px: 1 }}
                  />
                </Box>

                {/* Total Opportunity Amount - Improved Allocation Display */}
                <Box
                  sx={{
                    p: 2.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.02),
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
                      Total Opportunity Amount
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
                      }).format(row["Gross Revenue"] || 0)}
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
                          }).format(row["Allocated Gross Revenue"] || 0)}
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
                            Last Status Change
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{ mb: 2 }}
                          >
                            {new Date(
                              row["Last Status Change Date"]
                            ).toLocaleDateString('fr-FR')}
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
                              (row["Gross Revenue"] || 0) *
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
                                  (row["Gross Revenue"] || 0) *
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
                                  (row["Gross Revenue"] || 0) *
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
                    <Grid item xs={12} md={4} sx={{ p: 2.5 }}>
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
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const theme = useTheme();
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("Opportunity ID");

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
            {title || "Opportunities"}
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

        {/* Fixed-width container for filter controls */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Box
            sx={{
              width: 110, // Fixed width that accommodates the largest content
              height: 32, // Fixed height
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
          // Force table layout to respect column widths exactly
          "& .MuiTable-root": {
            tableLayout: "fixed", // This is key for fixed column widths
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
              <TableCell
                padding="checkbox"
                sx={{ width: 48, minWidth: 48, maxWidth: 48 }} // Fixed width
              />
              <TableCell
                padding="none"
                sx={{ width: 120, minWidth: 120, maxWidth: 120 }} // Increased from 80 to 120px
              >
                <TableSortLabel
                  active={orderBy === "Opportunity ID"}
                  direction={orderBy === "Opportunity ID" ? order : "asc"}
                  onClick={() => handleSortRequest("Opportunity ID")}
                >
                  ID
                </TableSortLabel>
              </TableCell>
              <TableCell
                sx={{ width: "25%", minWidth: 180 }} // Percentage width for flexibility with fixed minimum
              >
                <TableSortLabel
                  active={orderBy === "Opportunity"}
                  direction={orderBy === "Opportunity" ? order : "asc"}
                  onClick={() => handleSortRequest("Opportunity")}
                >
                  Opportunity
                </TableSortLabel>
              </TableCell>
              <TableCell
                sx={{ width: 120, minWidth: 120, maxWidth: 120 }} // Fixed width
              >
                <TableSortLabel
                  active={orderBy === "Status"}
                  direction={orderBy === "Status" ? order : "asc"}
                  onClick={() => handleSortRequest("Status")}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell
                align="right"
                sx={{ width: 150, minWidth: 150, maxWidth: 150 }} // Fixed width
              >
                <TableSortLabel
                  active={orderBy === "Gross Revenue"}
                  direction={orderBy === "Gross Revenue" ? order : "asc"}
                  onClick={() => handleSortRequest("Gross Revenue")}
                >
                  Revenue
                </TableSortLabel>
              </TableCell>
              <TableCell
                sx={{ width: "25%", minWidth: 150 }} // Percentage width for flexibility with fixed minimum
              >
                <TableSortLabel
                  active={orderBy === "Account"}
                  direction={orderBy === "Account" ? order : "asc"}
                  onClick={() => handleSortRequest("Account")}
                >
                  Account
                </TableSortLabel>
              </TableCell>
              <TableCell
                sx={{ width: "25%", minWidth: 150 }} // Percentage width for flexibility with fixed minimum
              >
                <TableSortLabel
                  active={orderBy === "Service Line 1"}
                  direction={orderBy === "Service Line 1" ? order : "asc"}
                  onClick={() => handleSortRequest("Service Line 1")}
                >
                  Service Line
                </TableSortLabel>
              </TableCell>
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
              // Use the getDisplayData method instead of direct slicing
              getDisplayData().map((row) => (
                <OpportunityRow
                  key={row["Opportunity ID"]}
                  row={row}
                  isSelected={isSelected(row)}
                  onRowClick={handleRowClick}
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
