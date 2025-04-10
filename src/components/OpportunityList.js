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
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

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

// Row component with expandable details
const OpportunityRow = ({ row, isSelected, onRowClick }) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();

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
        <TableCell padding="checkbox">
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
        <TableCell component="th" scope="row" padding="none">
          <Typography variant="body2" fontWeight={500} sx={{ ml: 1 }}>
            {row["Opportunity ID"]}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography
            variant="body2"
            fontWeight={isSelected ? 600 : 400}
            noWrap
          >
            {row["Opportunity"]}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={statusText[row["Status"]] || `Status ${row["Status"]}`}
            color={statusColors[row["Status"]] || "default"}
            size="small"
            variant="filled"
            sx={{ fontWeight: 500 }}
          />
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2" fontWeight={500}>
            {row["Is Allocated"] ? (
              <>
                {typeof row["Allocated Gross Revenue"] === "number"
                  ? new Intl.NumberFormat("en-US", {
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
                  {row["Allocation Percentage"]}% of{" "}
                  {row["Allocated Service Line"]}
                </Typography>
              </>
            ) : typeof row["Gross Revenue"] === "number" ? (
              new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(row["Gross Revenue"])
            ) : (
              row["Gross Revenue"]
            )}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" noWrap>
            {row["Account"]}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" noWrap>
            {row["Service Line 1"]}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" noWrap>
            {row["Manager"]}
          </Typography>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ m: 2 }}>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.background.paper, 0.7),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                }}
              >
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="subtitle2"
                        color="primary.main"
                        fontWeight={600}
                        gutterBottom
                      >
                        Opportunity Details
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Creation Date
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {new Date(
                                row["Creation Date"]
                              ).toLocaleDateString()}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Last Status Change
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {new Date(
                                row["Last Status Change Date"]
                              ).toLocaleDateString()}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sx={{ mt: 2 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Project Type
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {row["Project Type"]}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sx={{ mt: 2 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Contribution Margin
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {row["CM1%"] ? `${row["CM1%"]}%` : "N/A"}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="subtitle2"
                        color="primary.main"
                        fontWeight={600}
                        gutterBottom
                      >
                        Service Offerings
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Typography
                          variant="body2"
                          fontWeight={500}
                          sx={{ mb: 1 }}
                        >
                          <strong>Primary:</strong> {row["Service Line 1"]} -{" "}
                          {row["Service Offering 1"]} (
                          {row["Service Offering 1 %"]}%)
                        </Typography>

                        {row["Service Line 2"] &&
                          row["Service Line 2"] !== "-" && (
                            <Typography
                              variant="body2"
                              fontWeight={500}
                              sx={{ mb: 1 }}
                            >
                              <strong>Secondary:</strong>{" "}
                              {row["Service Line 2"]} -{" "}
                              {row["Service Offering 2"]} (
                              {row["Service Offering 2 %"]}%)
                            </Typography>
                          )}

                        {row["Service Line 3"] &&
                          row["Service Line 3"] !== "-" && (
                            <Typography variant="body2" fontWeight={500}>
                              <strong>Tertiary:</strong> {row["Service Line 3"]}{" "}
                              - {row["Service Offering 3"]} (
                              {row["Service Offering 3 %"]}%)
                            </Typography>
                          )}
                      </Box>
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
  defaultRowsPerPage = 10, // Add this line with a default value of 10
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage); // Use the prop here
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

  return (
    <Paper
      elevation={2}
      sx={{
        width: "100%",
        overflow: "hidden",
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
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
        <Box>
          <Typography variant="h6" component="div" fontWeight={600}>
            {title || "Opportunities"}
          </Typography>
          {data.length > 0 && (
            <Typography variant="body2" color="text.secondary" component="div">
              {data.length} opportunities
            </Typography>
          )}
        </Box>
        <Tooltip title="Click on rows to select. Expand rows for more details.">
          <InfoIcon color="action" fontSize="small" />
        </Tooltip>
      </Box>

      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader aria-label="opportunities table" size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" style={{ width: 48 }} />
              <TableCell padding="none" style={{ width: 80 }}>
                <TableSortLabel
                  active={orderBy === "Opportunity ID"}
                  direction={orderBy === "Opportunity ID" ? order : "asc"}
                  onClick={() => handleSortRequest("Opportunity ID")}
                >
                  ID
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ minWidth: 180 }}>
                <TableSortLabel
                  active={orderBy === "Opportunity"}
                  direction={orderBy === "Opportunity" ? order : "asc"}
                  onClick={() => handleSortRequest("Opportunity")}
                >
                  Opportunity
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ width: 120 }}>
                <TableSortLabel
                  active={orderBy === "Status"}
                  direction={orderBy === "Status" ? order : "asc"}
                  onClick={() => handleSortRequest("Status")}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ width: 120 }} align="right">
                <TableSortLabel
                  active={orderBy === "Gross Revenue"}
                  direction={orderBy === "Gross Revenue" ? order : "asc"}
                  onClick={() => handleSortRequest("Gross Revenue")}
                >
                  Revenue
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ minWidth: 150 }}>
                <TableSortLabel
                  active={orderBy === "Account"}
                  direction={orderBy === "Account" ? order : "asc"}
                  onClick={() => handleSortRequest("Account")}
                >
                  Account
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ minWidth: 150 }}>
                <TableSortLabel
                  active={orderBy === "Service Line 1"}
                  direction={orderBy === "Service Line 1" ? order : "asc"}
                  onClick={() => handleSortRequest("Service Line 1")}
                >
                  Service Line
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ minWidth: 120 }}>
                <TableSortLabel
                  active={orderBy === "Manager"}
                  direction={orderBy === "Manager" ? order : "asc"}
                  onClick={() => handleSortRequest("Manager")}
                >
                  Manager
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
              sortedData()
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row) => (
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

      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
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
    </Paper>
  );
};

export default OpportunityList;
