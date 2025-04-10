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
  Button,
  Collapse,
  IconButton,
  TextField,
  Autocomplete,
} from "@mui/material";
import TimelineIcon from "@mui/icons-material/Timeline";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import FolderIcon from "@mui/icons-material/Folder";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import EuroIcon from "@mui/icons-material/Euro";
import SearchIcon from "@mui/icons-material/Search";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import DescriptionIcon from "@mui/icons-material/Description";
import CallMadeIcon from "@mui/icons-material/CallMade";
import GroupIcon from "@mui/icons-material/Group";
import LabelIcon from "@mui/icons-material/Label";

const groupTimelineByOpportunity = (timelineItems) => {
  const opportunityGroups = {};

  // First, group by opportunity ID
  timelineItems.forEach((item) => {
    const oppId = item.opportunity["Opportunity ID"];
    if (!opportunityGroups[oppId]) {
      opportunityGroups[oppId] = {
        id: oppId,
        name: item.opportunity["Opportunity"],
        items: [],
        firstDate: new Date(item.opportunity["Creation Date"]),
        branchLevel: 0, // Will be assigned later
      };
    }
    opportunityGroups[oppId].items.push(item);
  });

  // Convert to array and sort by first date
  const groupsArray = Object.values(opportunityGroups);
  groupsArray.sort((a, b) => a.firstDate - b.firstDate);

  // Assign branch levels to avoid overlaps
  // This is a simple algorithm that may need to be improved for complex cases
  const assignedTimeRanges = [];

  groupsArray.forEach((group) => {
    const startDate = group.firstDate;
    const endDate = new Date(Math.max(...group.items.map((item) => item.date)));

    // Find a branch level that doesn't overlap with this opportunity's time range
    let branchLevel = 0;
    let foundLevel = false;

    while (!foundLevel) {
      foundLevel = true;

      // Check if this level is already occupied during our date range
      for (const range of assignedTimeRanges) {
        if (range.level === branchLevel) {
          // Check for overlap
          if (startDate <= range.end && endDate >= range.start) {
            foundLevel = false;
            break;
          }
        }
      }

      if (!foundLevel) {
        branchLevel++;
      } else {
        // Found an available level
        assignedTimeRanges.push({
          level: branchLevel,
          start: startDate,
          end: endDate,
        });
        group.branchLevel = branchLevel;
        break;
      }
    }
  });

  return groupsArray;
};

const debugDataSample = (data) => {
  if (!data || data.length === 0) return;

  // Log a small sample of the data
  console.log(
    "Data Sample (first 2 items):",
    data.slice(0, 2).map((item) => ({
      Jobcode: item["Jobcode"],
      Account: item["Account"],
      Opportunity: item["Opportunity"],
      "Opportunity ID": item["Opportunity ID"],
    }))
  );

  // Check for the existence of Jobcode field
  const hasJobcode = data.some((item) => item["Jobcode"] !== undefined);
  console.log("Data has Jobcode field:", hasJobcode);

  // Check different possible field names
  const possibleJobcodeFields = [
    "Jobcode",
    "JobCode",
    "Job Code",
    "ProjectCode",
    "Project Code",
    "Project_Code",
  ];
  possibleJobcodeFields.forEach((field) => {
    const hasField = data.some((item) => item[field] !== undefined);
    if (hasField) {
      console.log(`Found alternative field: ${field}`);
    }
  });
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

// Status icons mapping
const statusIcons = {
  1: <LabelIcon />,
  4: <CheckCircleIcon />,
  6: <DescriptionIcon />,
  11: <BusinessIcon />,
  14: <CheckCircleIcon />,
  15: <CancelIcon />,
};

const JobcodeTimelineTab = ({
  data,
  loading,
  onSelection,
  selectedOpportunities,
}) => {
  const theme = useTheme();
  const [jobcodes, setJobcodes] = useState([]);
  const [selectedJobcode, setSelectedJobcode] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [expandedCards, setExpandedCards] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  // Group data by jobcode when data changes
  useEffect(() => {
    if (!data || loading) return;

    // Debug the data structure
    debugDataSample(data);

    // Detect the jobcode field - try multiple possible field names
    const possibleJobcodeFields = [
      "Jobcode",
      "JobCode",
      "Job Code",
      "ProjectCode",
      "Project Code",
      "Project_Code",
    ];
    let jobcodeField = null;

    for (const field of possibleJobcodeFields) {
      if (data.some((item) => item[field] !== undefined)) {
        jobcodeField = field;
        console.log(`Using ${field} as jobcode field`);
        break;
      }
    }

    // If no jobcode field is found, try to create one from opportunity ID
    if (!jobcodeField) {
      console.log(
        "No jobcode field found, using Opportunity ID prefix as jobcode"
      );
      jobcodeField = "Opportunity ID";
    }

    // Group opportunities by the detected jobcode field
    const jobcodeMap = {};

    data.forEach((opp) => {
      let jobcode;

      if (jobcodeField === "Opportunity ID" && opp[jobcodeField]) {
        // Extract prefix from opportunity ID (e.g., "PRJ-123" from "PRJ-123-456")
        const idParts = String(opp[jobcodeField]).split("-");
        if (idParts.length > 1) {
          jobcode = `${idParts[0]}-${idParts[1]}`;
        } else {
          jobcode = String(opp[jobcodeField]);
        }
      } else {
        // Use the detected jobcode field
        jobcode = opp[jobcodeField];
      }

      // Provide a default and clean up the value
      jobcode = String(jobcode || "Unknown").trim();

      if (!jobcodeMap[jobcode]) {
        jobcodeMap[jobcode] = [];
      }

      jobcodeMap[jobcode].push(opp);
    });

    console.log(`Found ${Object.keys(jobcodeMap).length} unique jobcodes`);

    // Convert to array and sort by most recent opportunity
    const jobcodeArray = Object.entries(jobcodeMap).map(
      ([code, opportunities]) => {
        // Sort opportunities by creation date
        opportunities.sort(
          (a, b) => new Date(a["Creation Date"]) - new Date(b["Creation Date"])
        );

        // Get the most recent opportunity
        const latestOpp = opportunities[opportunities.length - 1];

        return {
          jobcode: code,
          opportunities: opportunities,
          account: opportunities[0]["Account"] || "Unknown",
          totalRevenue: opportunities.reduce(
            (sum, opp) => sum + (opp["Gross Revenue"] || 0),
            0
          ),
          opportunityCount: opportunities.length,
          firstDate: new Date(opportunities[0]["Creation Date"]),
          latestDate: new Date(latestOpp["Creation Date"]),
          status: latestOpp["Status"],
        };
      }
    );

    // Remove the "Unknown" jobcode if it's just one item and there are others
    if (jobcodeArray.length > 1) {
      const filteredArray = jobcodeArray.filter(
        (item) => item.jobcode !== "Unknown"
      );
      if (filteredArray.length > 0) {
        console.log(
          `Filtered out "Unknown" jobcode, ${filteredArray.length} jobcodes remaining`
        );
        setJobcodes(filteredArray);
      } else {
        setJobcodes(jobcodeArray);
      }
    } else {
      setJobcodes(jobcodeArray);
    }

    // Don't auto-select anything by default
    setSelectedJobcode(null);

    // Log the final list of jobcodes
    console.log(
      "Final jobcodes:",
      jobcodeArray.map((j) => j.jobcode)
    );
  }, [data, loading]);

  // Update timeline data when selected jobcode changes
  useEffect(() => {
    if (!selectedJobcode) return;

    const { timelineItems, opportunityGroups } =
      generateTimelineData(selectedJobcode);
    setTimelineData(timelineItems);
    setOpportunityGroups(opportunityGroups);
  }, [selectedJobcode]);

  // Generate timeline data from opportunities
  const generateTimelineData = (jobcodeData) => {
    const timelineItems = [];
    const opportunities = jobcodeData.opportunities;

    opportunities.forEach((opp, index) => {
      // Add opportunity creation
      timelineItems.push({
        date: new Date(opp["Creation Date"]),
        type: "creation",
        title: `Opportunity Created: ${opp["Opportunity"]}`,
        opportunity: opp,
        id: `${opp["Opportunity ID"]}-creation`,
        isFirst: index === 0,
      });

      // Add status changes if available
      if (opp["Last Status Change Date"]) {
        timelineItems.push({
          date: new Date(opp["Last Status Change Date"]),
          type: "status",
          title: `Status Changed to: ${
            statusText[opp["Status"]] || `Status ${opp["Status"]}`
          }`,
          status: opp["Status"],
          opportunity: opp,
          id: `${opp["Opportunity ID"]}-status-${opp["Status"]}`,
        });
      }

      // Add booking date if available and status is 14 (Booked)
      if (opp["Status"] === 14 && opp["Winning Date"]) {
        timelineItems.push({
          date: new Date(opp["Winning Date"]),
          type: "win",
          title: `Opportunity Won: ${opp["Opportunity"]}`,
          opportunity: opp,
          id: `${opp["Opportunity ID"]}-win`,
        });
      }

      // Add lost date if available and status is 15 (Lost)
      if (opp["Status"] === 15 && opp["Lost Date"]) {
        timelineItems.push({
          date: new Date(opp["Lost Date"]),
          type: "loss",
          title: `Opportunity Lost: ${opp["Opportunity"]}`,
          opportunity: opp,
          id: `${opp["Opportunity ID"]}-loss`,
        });
      }
    });

    // Sort timeline items by date
    timelineItems.sort((a, b) => a.date - b.date);

    // Group by opportunity for branch visualization
    const opportunityGroups = groupTimelineByOpportunity(timelineItems);

    setTimelineData(timelineItems);
    return { timelineItems, opportunityGroups };
  };

  const [opportunityGroups, setOpportunityGroups] = useState([]);

  // Handle jobcode selection
  const handleJobcodeSelection = (jobcode) => {
    setSelectedJobcode(jobcode);
    setExpandedCards({}); // Reset expanded cards
  };

  // Toggle expanded card
  const toggleExpanded = (id) => {
    setExpandedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Format date to readable string
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Function to get timeline dot color based on item type
  const getTimelineDotColor = (type, status) => {
    switch (type) {
      case "creation":
        return "info";
      case "status":
        return statusColors[status] || "default";
      case "win":
        return "success";
      case "loss":
        return "error";
      default:
        return "default";
    }
  };

  // Get icon for timeline item
  const getTimelineIcon = (type, status) => {
    switch (type) {
      case "creation":
        return <FolderIcon />;
      case "status":
        return statusIcons[status] || <TimelineIcon />;
      case "win":
        return <CheckCircleIcon />;
      case "loss":
        return <CancelIcon />;
      default:
        return <TimelineIcon />;
    }
  };

  // Filter jobcodes based on search query
  const filteredJobcodes = jobcodes.filter((jobcode) => {
    const query = searchQuery.toLowerCase();
    return (
      jobcode.jobcode.toLowerCase().includes(query) ||
      jobcode.account.toLowerCase().includes(query) ||
      jobcode.opportunities.some(
        (opp) =>
          opp["Opportunity"].toLowerCase().includes(query) ||
          (opp["Service Line 1"] &&
            opp["Service Line 1"].toLowerCase().includes(query))
      )
    );
  });

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

  // Helper to format currency values
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Fade in={!loading} timeout={500}>
      <Grid container spacing={3}>
        {/* Jobcode Selection Panel */}
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
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Jobcode Timeline View
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Select a jobcode to view the complete project timeline. Connected
              opportunities are shown as a unified project history.
            </Typography>

            <Box sx={{ mb: selectedJobcode ? 3 : 0 }}>
              <Autocomplete
                id="jobcode-search"
                options={jobcodes}
                getOptionLabel={(option) => {
                  return `${String(option.jobcode)} - ${option.account}`;
                }}
                onChange={(event, newValue) => {
                  console.log("Selected jobcode:", newValue);
                  if (newValue) handleJobcodeSelection(newValue);
                }}
                value={selectedJobcode}
                isOptionEqualToValue={(option, value) => {
                  if (!option || !value) return false;
                  return String(option.jobcode) === String(value.jobcode);
                }}
                filterOptions={(options, state) => {
                  const inputValue = state.inputValue.toLowerCase().trim();

                  if (!inputValue) {
                    return options;
                  }

                  const filtered = options.filter((option) => {
                    const jobcodeStr = String(option.jobcode).toLowerCase();
                    const accountStr = String(option.account).toLowerCase();

                    return (
                      jobcodeStr.includes(inputValue) ||
                      accountStr.includes(inputValue) ||
                      option.opportunities.some(
                        (opp) =>
                          (opp["Opportunity"] &&
                            opp["Opportunity"]
                              .toLowerCase()
                              .includes(inputValue)) ||
                          (opp["Service Line 1"] &&
                            opp["Service Line 1"]
                              .toLowerCase()
                              .includes(inputValue))
                      )
                    );
                  });

                  console.log(
                    `Search "${inputValue}" found ${filtered.length} matches`
                  );
                  return filtered;
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Jobcode or Account"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <SearchIcon color="action" sx={{ mr: 1 }} />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                    placeholder="Type to search..."
                    fullWidth
                    variant="outlined"
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        width: "100%",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          width: "100%",
                        }}
                      >
                        <Typography variant="body1" fontWeight={600}>
                          {option.jobcode}
                        </Typography>
                        <Chip
                          size="small"
                          label={formatCurrency(option.totalRevenue)}
                          color="primary"
                        />
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          width: "100%",
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {option.account}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.opportunityCount} opportunities
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
              />
            </Box>

            {!selectedJobcode && (
              <Box
                sx={{
                  mt: 4,
                  p: 4,
                  textAlign: "center",
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  borderRadius: 3,
                  borderStyle: "dashed",
                  borderWidth: 1,
                  borderColor: alpha(theme.palette.primary.main, 0.2),
                }}
              >
                <TimelineIcon
                  sx={{
                    fontSize: 60,
                    color: alpha(theme.palette.primary.main, 0.3),
                    mb: 2,
                  }}
                />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Jobcode Selected
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Search and select a jobcode above to view its complete project
                  timeline
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Timeline View - Only show when a jobcode is selected */}
        {selectedJobcode && (
          <Grid item xs={12}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                mb: 3,
              }}
            >
              {/* Jobcode Header */}
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Box>
                    <Typography
                      variant="h5"
                      fontWeight={700}
                      color="primary.main"
                    >
                      {selectedJobcode.jobcode}
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                      {selectedJobcode.account}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography
                      variant="h6"
                      fontWeight={600}
                      color="secondary.main"
                    >
                      {formatCurrency(selectedJobcode.totalRevenue)}
                    </Typography>
                    <Chip
                      icon={<FolderIcon />}
                      label={`${selectedJobcode.opportunityCount} opportunities`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </Box>
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <CalendarTodayIcon
                      fontSize="small"
                      color="primary"
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body2">
                      First activity:{" "}
                      <b>{formatDate(selectedJobcode.firstDate)}</b>
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <CalendarTodayIcon
                      fontSize="small"
                      color="secondary"
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body2">
                      Latest activity:{" "}
                      <b>{formatDate(selectedJobcode.latestDate)}</b>
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <TimelineIcon
                      fontSize="small"
                      color="info"
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body2">
                      Timeline duration:{" "}
                      <b>
                        {Math.round(
                          (selectedJobcode.latestDate -
                            selectedJobcode.firstDate) /
                            (1000 * 60 * 60 * 24)
                        )}{" "}
                        days
                      </b>
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 4 }} />

              {/* Custom Timeline Implementation */}
              <Box sx={{ position: "relative", ml: 2, mr: 2 }}>
                {/* Center Timeline Line */}
                <Box
                  sx={{
                    position: "absolute",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "4px",
                    height: "100%",
                    backgroundColor: alpha(theme.palette.primary.main, 0.2),
                    zIndex: 0,
                    borderRadius: 4,
                  }}
                />

                {/* Opportunity Branch Lines */}
                {opportunityGroups.map((group) => {
                  // Calculate offset - each branch level is offset by a certain amount
                  const leftOffset = 50 - group.branchLevel * 6;
                  const rightOffset = 50 + group.branchLevel * 6;

                  // Define branch color based on branch level (alternating colors)
                  const branchColor = [
                    theme.palette.primary.main,
                    theme.palette.secondary.main,
                    theme.palette.info.main,
                    theme.palette.success.main,
                    theme.palette.warning.main,
                  ][group.branchLevel % 5];

                  // Calculate branch start and end positions based on timeline items
                  const groupItems = timelineData.filter(
                    (item) => item.opportunity["Opportunity ID"] === group.id
                  );

                  if (groupItems.length === 0) return null;

                  // Sort items by date
                  groupItems.sort((a, b) => a.date - b.date);

                  // Calculate start and end positions
                  const firstItemDate = new Date(groupItems[0].date).getTime();
                  const lastItemDate = new Date(
                    groupItems[groupItems.length - 1].date
                  ).getTime();

                  // Find the earliest and latest dates in the entire timeline
                  const timelineStart = new Date(
                    timelineData[0].date
                  ).getTime();
                  const timelineEnd = new Date(
                    timelineData[timelineData.length - 1].date
                  ).getTime();
                  const timelineRange = timelineEnd - timelineStart;

                  // Calculate positions as percentages of the timeline height
                  // Add a small offset (5%) to ensure the branch doesn't start/end exactly at an item
                  const startPosition = Math.max(
                    0,
                    ((firstItemDate - timelineStart) / timelineRange) * 100 - 5
                  );
                  const endPosition = Math.min(
                    100,
                    ((lastItemDate - timelineStart) / timelineRange) * 100 + 5
                  );

                  return (
                    <Box
                      key={`branch-${group.id}`}
                      sx={{
                        position: "absolute",
                        left: `${
                          group.branchLevel % 2 === 0 ? leftOffset : rightOffset
                        }%`,
                        top: `${startPosition}%`,
                        height: `${endPosition - startPosition}%`,
                        width: "3px",
                        backgroundColor: alpha(branchColor, 0.5),
                        borderRadius: 4,
                        zIndex: 1,
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: -5,
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          backgroundColor: branchColor,
                          zIndex: 2,
                        },
                        "&::after": {
                          content: '""',
                          position: "absolute",
                          bottom: -5,
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          backgroundColor: branchColor,
                          zIndex: 2,
                        },
                      }}
                    />
                  );
                })}

                {/* Branch Labels */}
                {opportunityGroups.map((group) => {
                  // Calculate offset
                  const leftOffset = 50 - group.branchLevel * 6;
                  const rightOffset = 50 + group.branchLevel * 6;
                  const side = group.branchLevel % 2 === 0 ? "left" : "right";

                  // Define branch color based on branch level
                  const branchColor = [
                    theme.palette.primary.main,
                    theme.palette.secondary.main,
                    theme.palette.info.main,
                    theme.palette.success.main,
                    theme.palette.warning.main,
                  ][group.branchLevel % 5];

                  return (
                    <Box
                      key={`branch-label-${group.id}`}
                      sx={{
                        position: "absolute",
                        [side]: `${
                          side === "left" ? leftOffset - 10 : rightOffset + 10
                        }%`,
                        top: "0%",
                        transform: "translateY(-100%)",
                        color: branchColor,
                        backgroundColor: alpha(branchColor, 0.1),
                        borderRadius: 1,
                        px: 1,
                        py: 0.5,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "120px",
                        zIndex: 3,
                      }}
                    >
                      {group.name}
                    </Box>
                  );
                })}

                {/* Timeline Items */}
                {timelineData.map((item, index) => {
                  // Find which opportunity group this item belongs to
                  const oppGroup = opportunityGroups.find(
                    (group) => group.id === item.opportunity["Opportunity ID"]
                  );

                  // Determine which side to render (left or right) based on branch level
                  // Even branch levels go on left, odd on right
                  const isEven = oppGroup && oppGroup.branchLevel % 2 === 0;
                  const dotColor = getTimelineDotColor(item.type, item.status);

                  // Calculate offset from center (to align with branch)
                  const leftOffset =
                    50 - (oppGroup ? oppGroup.branchLevel * 6 : 0);
                  const rightOffset =
                    50 + (oppGroup ? oppGroup.branchLevel * 6 : 0);

                  return (
                    <Box
                      key={item.id}
                      sx={{
                        display: "flex",
                        mb: 4,
                        position: "relative",
                        justifyContent: isEven ? "flex-start" : "flex-end",
                      }}
                    >
                      {/* Date - Only shown on one side */}
                      {isEven && (
                        <Box
                          sx={{
                            width: "48%",
                            textAlign: "right",
                            pr: 3,
                            pt: 1,
                          }}
                        >
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            fontWeight={500}
                          >
                            {formatDate(item.date)}
                          </Typography>
                        </Box>
                      )}

                      {/* Timeline Dot */}
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          backgroundColor: theme.palette[dotColor].main,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          position: "absolute",
                          left: oppGroup
                            ? `${
                                oppGroup.branchLevel % 2 === 0
                                  ? leftOffset
                                  : rightOffset
                              }%`
                            : "50%",
                          transform: "translateX(-50%)",
                          zIndex: 2,
                          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                          border: "2px solid white",
                        }}
                      >
                        {getTimelineIcon(item.type, item.status)}
                      </Box>

                      {/* Content Card */}
                      <Box
                        sx={{
                          width: "48%",
                          ...(isEven
                            ? {
                                ml: 3,
                                pl: oppGroup ? oppGroup.branchLevel * 2 : 0,
                              }
                            : {
                                mr: 3,
                                pr: oppGroup ? oppGroup.branchLevel * 2 : 0,
                              }),
                        }}
                      >
                        <Card
                          variant="outlined"
                          sx={{
                            borderRadius: 2,
                            boxShadow: expandedCards[item.id] ? 3 : 1,
                            borderColor: expandedCards[item.id]
                              ? theme.palette[dotColor].main
                              : alpha(theme.palette[dotColor].main, 0.3),
                            transition: "all 0.3s ease",
                            "&:hover": {
                              boxShadow: 3,
                              borderColor: theme.palette[dotColor].main,
                            },
                            ...(oppGroup && {
                              borderLeft: `4px solid ${
                                [
                                  theme.palette.primary.main,
                                  theme.palette.secondary.main,
                                  theme.palette.info.main,
                                  theme.palette.success.main,
                                  theme.palette.warning.main,
                                ][oppGroup.branchLevel % 5]
                              }`,
                            }),
                          }}
                        >
                          <CardContent>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                              }}
                            >
                              <Typography
                                variant="subtitle1"
                                fontWeight={600}
                                gutterBottom
                              >
                                {item.title}
                              </Typography>
                              <Box
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                {!isEven && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    fontWeight={500}
                                    sx={{ mr: 1 }}
                                  >
                                    {formatDate(item.date)}
                                  </Typography>
                                )}
                                <IconButton
                                  size="small"
                                  onClick={() => toggleExpanded(item.id)}
                                  sx={{
                                    bgcolor: expandedCards[item.id]
                                      ? alpha(theme.palette[dotColor].main, 0.1)
                                      : "transparent",
                                  }}
                                >
                                  {expandedCards[item.id] ? (
                                    <ExpandLessIcon />
                                  ) : (
                                    <ExpandMoreIcon />
                                  )}
                                </IconButton>
                              </Box>
                            </Box>

                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 1,
                                mb: 1,
                              }}
                            >
                              <Chip
                                size="small"
                                label={`ID: ${item.opportunity["Opportunity ID"]}`}
                                variant="outlined"
                                color="primary"
                              />
                              {item.type === "status" && (
                                <Chip
                                  size="small"
                                  label={
                                    statusText[item.status] ||
                                    `Status ${item.status}`
                                  }
                                  color={statusColors[item.status] || "default"}
                                />
                              )}
                              {item.opportunity["Service Line 1"] && (
                                <Chip
                                  size="small"
                                  label={item.opportunity["Service Line 1"]}
                                  variant="outlined"
                                  color="secondary"
                                />
                              )}
                            </Box>

                            <Collapse in={expandedCards[item.id]}>
                              <Box sx={{ mt: 2 }}>
                                <Divider sx={{ mb: 2 }} />

                                <Grid container spacing={2}>
                                  <Grid item xs={12} sm={6}>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        mb: 1,
                                      }}
                                    >
                                      <BusinessIcon
                                        fontSize="small"
                                        sx={{ mr: 1, color: "text.secondary" }}
                                      />
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        Account:{" "}
                                        <b>{item.opportunity["Account"]}</b>
                                      </Typography>
                                    </Box>

                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        mb: 1,
                                      }}
                                    >
                                      <EuroIcon
                                        fontSize="small"
                                        sx={{ mr: 1, color: "text.secondary" }}
                                      />
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        Revenue:{" "}
                                        <b>
                                          {formatCurrency(
                                            item.opportunity["Gross Revenue"] ||
                                              0
                                          )}
                                        </b>
                                      </Typography>
                                    </Box>

                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        mb: 1,
                                      }}
                                    >
                                      <LabelIcon
                                        fontSize="small"
                                        sx={{ mr: 1, color: "text.secondary" }}
                                      />
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        Service:{" "}
                                        <b>
                                          {item.opportunity["Service Line 1"] ||
                                            "N/A"}
                                        </b>
                                      </Typography>
                                    </Box>
                                  </Grid>

                                  <Grid item xs={12} sm={6}>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        mb: 1,
                                      }}
                                    >
                                      <GroupIcon
                                        fontSize="small"
                                        sx={{ mr: 1, color: "text.secondary" }}
                                      />
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        Team:{" "}
                                        <b>
                                          {item.opportunity["EP"] || "N/A"} /{" "}
                                          {item.opportunity["EM"] || "N/A"}
                                        </b>
                                      </Typography>
                                    </Box>

                                    {item.opportunity["Service Offering 1"] && (
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          mb: 1,
                                        }}
                                      >
                                        <CallMadeIcon
                                          fontSize="small"
                                          sx={{
                                            mr: 1,
                                            color: "text.secondary",
                                          }}
                                        />
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                        >
                                          Offering:{" "}
                                          <b>
                                            {
                                              item.opportunity[
                                                "Service Offering 1"
                                              ]
                                            }
                                          </b>
                                        </Typography>
                                      </Box>
                                    )}

                                    {item.opportunity["Project Type"] && (
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          mb: 1,
                                        }}
                                      >
                                        <AccountTreeIcon
                                          fontSize="small"
                                          sx={{
                                            mr: 1,
                                            color: "text.secondary",
                                          }}
                                        />
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                        >
                                          Project Type:{" "}
                                          <b>
                                            {item.opportunity["Project Type"]}
                                          </b>
                                        </Typography>
                                      </Box>
                                    )}
                                  </Grid>
                                </Grid>

                                <Box
                                  sx={{
                                    mt: 2,
                                    display: "flex",
                                    justifyContent: "flex-end",
                                  }}
                                >
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color={dotColor}
                                    onClick={() =>
                                      onSelection([item.opportunity])
                                    }
                                  >
                                    Select Opportunity
                                  </Button>
                                </Box>
                              </Box>
                            </Collapse>
                          </CardContent>
                        </Card>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Fade>
  );
};

export default JobcodeTimelineTab;
