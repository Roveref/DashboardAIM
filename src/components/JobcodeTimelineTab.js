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
  IconButton,
  TextField,
  Autocomplete,
  Collapse,
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
  const [opportunityStreams, setOpportunityStreams] = useState([]);
  const [expandedCards, setExpandedCards] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [timelineYears, setTimelineYears] = useState([]);

  // Detect jobcode field and organize data by jobcode
  useEffect(() => {
    if (!data || loading) return;

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
        setJobcodes(filteredArray);
      } else {
        setJobcodes(jobcodeArray);
      }
    } else {
      setJobcodes(jobcodeArray);
    }

    // Don't auto-select anything by default
    setSelectedJobcode(null);
  }, [data, loading]);

  // Process timeline data when selected jobcode changes
  useEffect(() => {
    if (!selectedJobcode) {
      setTimelineData([]);
      setOpportunityStreams([]);
      setTimelineYears([]);
      return;
    }

    // Create timeline items for each opportunity
    const allTimelineItems = [];
    const streams = [];
    const years = new Set();
    const months = new Set();

    // Process each opportunity separately to create streams
    selectedJobcode.opportunities.forEach((opp) => {
      // Create a list of timeline events for this opportunity
      const opportunityEvents = [];

      // Add opportunity creation
      const creationDate = new Date(opp["Creation Date"]);
      years.add(creationDate.getFullYear());
      months.add(`${creationDate.getFullYear()}-${creationDate.getMonth()}`);

      opportunityEvents.push({
        date: creationDate,
        type: "creation",
        title: `Opportunity Created: ${opp["Opportunity"]}`,
        opportunity: opp,
        id: `${opp["Opportunity ID"]}-creation`,
      });

      // Add status changes if available
      if (opp["Last Status Change Date"]) {
        const statusDate = new Date(opp["Last Status Change Date"]);
        years.add(statusDate.getFullYear());
        months.add(`${statusDate.getFullYear()}-${statusDate.getMonth()}`);

        opportunityEvents.push({
          date: statusDate,
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
        const winDate = new Date(opp["Winning Date"]);
        years.add(winDate.getFullYear());
        months.add(`${winDate.getFullYear()}-${winDate.getMonth()}`);

        opportunityEvents.push({
          date: winDate,
          type: "win",
          title: `Opportunity Won: ${opp["Opportunity"]}`,
          opportunity: opp,
          id: `${opp["Opportunity ID"]}-win`,
        });
      }

      // Add lost date if available and status is 15 (Lost)
      if (opp["Status"] === 15 && opp["Lost Date"]) {
        const lostDate = new Date(opp["Lost Date"]);
        years.add(lostDate.getFullYear());
        months.add(`${lostDate.getFullYear()}-${lostDate.getMonth()}`);

        opportunityEvents.push({
          date: lostDate,
          type: "loss",
          title: `Opportunity Lost: ${opp["Opportunity"]}`,
          opportunity: opp,
          id: `${opp["Opportunity ID"]}-loss`,
        });
      }

      // Sort events by date
      opportunityEvents.sort((a, b) => a.date - b.date);

      // Add all events to the main timeline
      allTimelineItems.push(...opportunityEvents);

      // Only create a stream if there are events
      if (opportunityEvents.length > 0) {
        streams.push({
          opportunityId: opp["Opportunity ID"],
          opportunityName: opp["Opportunity"],
          serviceLine: opp["Service Line 1"] || "Unknown",
          events: opportunityEvents,
          firstDate: opportunityEvents[0].date,
          lastDate: opportunityEvents[opportunityEvents.length - 1].date,
          status: opp["Status"],
          revenue: opp["Gross Revenue"] || 0,
        });
      }
    });

    // Sort all timeline items by date for the main timeline
    allTimelineItems.sort((a, b) => a.date - b.date);

    // Sort streams by first date
    streams.sort((a, b) => a.firstDate - b.firstDate);

    // Convert years to array and sort
    const yearsArray = Array.from(years).sort();

    // Process months into a chronological array
    const monthsArray = Array.from(months).sort();
    const processedMonths = monthsArray.map((monthYearStr) => {
      const [yearPart, monthPart] = monthYearStr.split("-");
      return {
        year: parseInt(yearPart),
        month: parseInt(monthPart),
        label: new Date(
          parseInt(yearPart),
          parseInt(monthPart),
          1
        ).toLocaleDateString('fr-FR'),
      };
    });

    setTimelineData(allTimelineItems);
    setOpportunityStreams(streams);
    setTimelineYears(yearsArray);
  }, [selectedJobcode]);

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
    return new Date(date).toLocaleDateString('fr-FR');
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
          opp["Opportunity"]?.toLowerCase().includes(query) ||
          (opp["Service Line 1"] &&
            opp["Service Line 1"].toLowerCase().includes(query))
      )
    );
  });

  // Helper to format currency values
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Helper to get status chip color
  const getStatusChipColor = (status) => {
    return statusColors[status] || "default";
  };

  // Calculate relative position of an event in the timeline (as a percentage)
  const calculateTimelinePosition = (date) => {
    if (!timelineYears.length || !opportunityStreams.length) return 0;

    // Get the earliest and latest dates from all streams
    const earliestDate = Math.min(
      ...opportunityStreams.map((s) => s.firstDate.getTime())
    );
    const latestDate = Math.max(
      ...opportunityStreams.map((s) => s.lastDate.getTime())
    );

    const totalDuration = latestDate - earliestDate;
    if (totalDuration <= 0) return 0;

    const eventPosition = date.getTime() - earliestDate;
    return (eventPosition / totalDuration) * 100;
  };

  // Generate an array of months between start and end dates for timeline markers
  const generateTimelineMarkers = () => {
    if (!opportunityStreams.length) return [];

    // Get earliest and latest dates
    const earliestDate = new Date(
      Math.min(...opportunityStreams.map((s) => s.firstDate.getTime()))
    );
    const latestDate = new Date(
      Math.max(...opportunityStreams.map((s) => s.lastDate.getTime()))
    );

    // Ensure we have at least the start and end markers
    const markers = [
      {
        date: earliestDate,
        position: 0,
        label: formatDate(earliestDate),
      },
      {
        date: latestDate,
        position: 100,
        label: formatDate(latestDate),
      },
    ];

    // Add midpoint
    const midpointDate = new Date(
      (earliestDate.getTime() + latestDate.getTime()) / 2
    );
    markers.push({
      date: midpointDate,
      position: 50,
      label: formatDate(midpointDate),
    });

    // Add quarter markers if timeline is long enough
    const durationMonths =
      (latestDate.getFullYear() - earliestDate.getFullYear()) * 12 +
      (latestDate.getMonth() - earliestDate.getMonth());

    if (durationMonths > 3) {
      // Add quarter markers
      const quarterDate1 = new Date(
        earliestDate.getTime() +
          (latestDate.getTime() - earliestDate.getTime()) * 0.25
      );
      const quarterDate3 = new Date(
        earliestDate.getTime() +
          (latestDate.getTime() - earliestDate.getTime()) * 0.75
      );

      markers.push(
        {
          date: quarterDate1,
          position: 25,
          label: formatDate(quarterDate1),
        },
        {
          date: quarterDate3,
          position: 75,
          label: formatDate(quarterDate3),
        }
      );
    }

    // Sort markers by position
    return markers.sort((a, b) => a.position - b.position);
  };

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
              opportunities are shown as separate streams.
            </Typography>

            <Box sx={{ mb: selectedJobcode ? 3 : 0 }}>
              <Autocomplete
                id="jobcode-search"
                options={jobcodes}
                getOptionLabel={(option) => {
                  return `${String(option.jobcode)} - ${option.account}`;
                }}
                onChange={(event, newValue) => {
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

                  return options.filter((option) => {
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

              {/* Multi-column timeline with vertical time markers on the left */}
              <Box sx={{ display: "flex" }}>
                {/* Vertical timeline markers on the left */}
                <Box
                  sx={{
                    width: "150px",
                    position: "relative",
                    borderRight: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.2
                    )}`,
                    mr: 3,
                    height: "600px", // Fixed height for timeline visualization
                  }}
                >
                  {/* Vertical line representing the timeline */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: "50%",
                      width: "2px",
                      backgroundColor: alpha(theme.palette.primary.main, 0.3),
                      transform: "translateX(-50%)",
                    }}
                  />

                  {/* Timeline year markers */}
                  {timelineYears.map((year, index) => {
                    // Calculate position based on first event in this year
                    const yearEvents = timelineData.filter(
                      (event) => event.date.getFullYear() === year
                    );

                    if (yearEvents.length === 0) return null;

                    // Get first and last events of the year
                    const firstEvent = yearEvents.reduce(
                      (earliest, event) =>
                        event.date < earliest.date ? event : earliest,
                      yearEvents[0]
                    );

                    const position = calculateTimelinePosition(firstEvent.date);

                    return (
                      <Box
                        key={`year-${year}`}
                        sx={{
                          position: "absolute",
                          top: `${position}%`,
                          left: 0,
                          right: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          pr: 2,
                          transform: "translateY(-50%)",
                          pointerEvents: "none",
                        }}
                      >
                        <Typography
                          variant="h6"
                          fontWeight={600}
                          color="primary.main"
                          sx={{
                            backgroundColor: alpha(
                              theme.palette.background.paper,
                              0.8
                            ),
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                          }}
                        >
                          {year}
                        </Typography>
                        <Box
                          sx={{
                            width: 10,
                            height: 2,
                            backgroundColor: theme.palette.primary.main,
                            mx: 1,
                          }}
                        />
                      </Box>
                    );
                  })}

                  {/* Additional date markers */}
                  {generateTimelineMarkers().map((marker, index) => (
                    <Box
                      key={`marker-${index}`}
                      sx={{
                        position: "absolute",
                        top: `${marker.position}%`,
                        left: 0,
                        right: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        pr: 2,
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          backgroundColor: alpha(
                            theme.palette.background.paper,
                            0.8
                          ),
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: "0.7rem",
                          display:
                            marker.position % 25 === 0 ? "block" : "none", // Only show at 0, 25, 50, 75, 100
                        }}
                      >
                        {new Date(marker.date).toLocaleDateString('fr-FR')}
                      </Typography>
                      <Box
                        sx={{
                          width: marker.position % 25 === 0 ? 8 : 4, // Longer lines for main markers
                          height: 1,
                          backgroundColor: alpha(
                            theme.palette.primary.main,
                            marker.position % 25 === 0 ? 0.8 : 0.4
                          ),
                          mx: 1,
                        }}
                      />
                    </Box>
                  ))}
                </Box>

                {/* Multi-column timeline content */}
                {opportunityStreams.length > 0 ? (
                  <Box sx={{ flex: 1, position: "relative" }}>
                    {/* Timeline header with each opportunity as a column */}
                    <Box
                      sx={{
                        display: "flex",
                        mb: 3,
                        borderBottom: `1px solid ${alpha(
                          theme.palette.primary.main,
                          0.2
                        )}`,
                        pb: 2,
                      }}
                    >
                      {opportunityStreams.map((stream, index) => (
                        <Box
                          key={`header-${stream.opportunityId}`}
                          sx={{
                            flex: 1,
                            px: 1,
                            borderLeft:
                              index > 0
                                ? `1px dashed ${alpha(
                                    theme.palette.divider,
                                    0.5
                                  )}`
                                : "none",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              mb: 1,
                            }}
                          >
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                bgcolor:
                                  theme.palette[
                                    getStatusChipColor(stream.status)
                                  ].main,
                                mr: 1,
                              }}
                            />
                            <Typography
                              variant="subtitle2"
                              fontWeight={600}
                              noWrap
                              sx={{ maxWidth: "150px" }}
                            >
                              {stream.opportunityName}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Chip
                              size="small"
                              label={formatCurrency(stream.revenue)}
                              variant="outlined"
                              color={getStatusChipColor(stream.status)}
                              sx={{ height: 20, fontSize: "0.7rem" }}
                            />
                            {stream.serviceLine && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                                sx={{ maxWidth: "100px" }}
                              >
                                {stream.serviceLine}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>

                    {/* Vertical timeline with multiple columns */}
                    <Box
                      sx={{
                        display: "flex",
                        position: "relative",
                        height: "600px", // Fixed height for timeline visualization
                        mb: 4,
                      }}
                    >
                      {/* Timeline connector - vertical line in the center of each column */}
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: "100%",
                          display: "flex",
                          pointerEvents: "none",
                        }}
                      >
                        {opportunityStreams.map((stream, index) => (
                          <Box
                            key={`connector-${stream.opportunityId}`}
                            sx={{
                              flex: 1,
                              px: 1,
                              position: "relative",
                              "&::before": {
                                content: '""',
                                position: "absolute",
                                top: 0,
                                bottom: 0,
                                left: "50%",
                                width: "2px",
                                backgroundColor: alpha(
                                  theme.palette[
                                    getStatusChipColor(stream.status)
                                  ].main,
                                  0.3
                                ),
                                transform: "translateX(-50%)",
                              },
                              borderLeft:
                                index > 0
                                  ? `1px dashed ${alpha(
                                      theme.palette.divider,
                                      0.5
                                    )}`
                                  : "none",
                            }}
                          />
                        ))}
                      </Box>

                      {/* Timeline content columns */}
                      {opportunityStreams.map((stream, streamIndex) => (
                        <Box
                          key={`stream-${stream.opportunityId}`}
                          sx={{
                            flex: 1,
                            px: 1,
                            position: "relative",
                            borderLeft:
                              streamIndex > 0
                                ? `1px dashed ${alpha(
                                    theme.palette.divider,
                                    0.5
                                  )}`
                                : "none",
                          }}
                        >
                          {/* Timeline events for this opportunity */}
                          {stream.events.map((event, eventIndex) => {
                            const topPosition = `${calculateTimelinePosition(
                              event.date
                            )}%`;
                            const dotColor = getTimelineDotColor(
                              event.type,
                              event.status
                            );

                            return (
                              <Box
                                key={event.id}
                                sx={{
                                  position: "absolute",
                                  top: topPosition,
                                  left: 0,
                                  right: 0,
                                  display: "flex",
                                  justifyContent: "center",
                                  transform: "translateY(-50%)",
                                  zIndex: 10,
                                  mb: 4,
                                }}
                              >
                                {/* Event dot */}
                                <Box
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    backgroundColor:
                                      theme.palette[dotColor].main,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    zIndex: 3,
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                    border: "2px solid white",
                                    cursor: "pointer",
                                    "&:hover": {
                                      transform: "scale(1.1)",
                                    },
                                  }}
                                  onClick={() => toggleExpanded(event.id)}
                                >
                                  {getTimelineIcon(event.type, event.status)}
                                </Box>

                                {/* Event card - shown when expanded */}
                                <Collapse
                                  in={!!expandedCards[event.id]}
                                  sx={{
                                    position: "absolute",
                                    top: "100%",
                                    left: "-50%",
                                    right: "-50%",
                                    zIndex: 20,
                                    mt: 1,
                                  }}
                                >
                                  <Card
                                    sx={{
                                      borderRadius: 2,
                                      boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
                                      borderLeft: `4px solid ${theme.palette[dotColor].main}`,
                                      mb: 2,
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
                                        <Box>
                                          <Typography
                                            variant="subtitle1"
                                            fontWeight={600}
                                          >
                                            {event.title}
                                          </Typography>
                                          <Typography
                                            variant="body2"
                                            color="text.secondary"
                                          >
                                            {formatDate(event.date)}
                                          </Typography>
                                        </Box>
                                        <IconButton
                                          size="small"
                                          onClick={() =>
                                            toggleExpanded(event.id)
                                          }
                                          sx={{
                                            bgcolor: expandedCards[event.id]
                                              ? alpha(
                                                  theme.palette[dotColor].main,
                                                  0.1
                                                )
                                              : "transparent",
                                          }}
                                        >
                                          <ExpandLessIcon />
                                        </IconButton>
                                      </Box>

                                      <Box
                                        sx={{
                                          mt: 1,
                                          display: "flex",
                                          flexWrap: "wrap",
                                          gap: 1,
                                        }}
                                      >
                                        <Chip
                                          size="small"
                                          label={`ID: ${event.opportunity["Opportunity ID"]}`}
                                          variant="outlined"
                                          color="primary"
                                        />
                                        {event.type === "status" && (
                                          <Chip
                                            size="small"
                                            label={
                                              statusText[event.status] ||
                                              `Status ${event.status}`
                                            }
                                            color={
                                              statusColors[event.status] ||
                                              "default"
                                            }
                                          />
                                        )}
                                        {event.opportunity[
                                          "Service Line 1"
                                        ] && (
                                          <Chip
                                            size="small"
                                            label={
                                              event.opportunity[
                                                "Service Line 1"
                                              ]
                                            }
                                            variant="outlined"
                                            color="secondary"
                                          />
                                        )}
                                      </Box>

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
                                                sx={{
                                                  mr: 1,
                                                  color: "text.secondary",
                                                }}
                                              />
                                              <Typography
                                                variant="body2"
                                                color="text.secondary"
                                              >
                                                Account:{" "}
                                                <b>
                                                  {event.opportunity["Account"]}
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
                                              <EuroIcon
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
                                                Revenue:{" "}
                                                <b>
                                                  {formatCurrency(
                                                    event.opportunity[
                                                      "Gross Revenue"
                                                    ] || 0
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
                                                sx={{
                                                  mr: 1,
                                                  color: "text.secondary",
                                                }}
                                              />
                                              <Typography
                                                variant="body2"
                                                color="text.secondary"
                                              >
                                                Service:{" "}
                                                <b>
                                                  {event.opportunity[
                                                    "Service Line 1"
                                                  ] || "N/A"}
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
                                                sx={{
                                                  mr: 1,
                                                  color: "text.secondary",
                                                }}
                                              />
                                              <Typography
                                                variant="body2"
                                                color="text.secondary"
                                              >
                                                Team:{" "}
                                                <b>
                                                  {event.opportunity["EP"] ||
                                                    "N/A"}{" "}
                                                  /{" "}
                                                  {event.opportunity["EM"] ||
                                                    "N/A"}
                                                </b>
                                              </Typography>
                                            </Box>

                                            {event.opportunity[
                                              "Service Offering 1"
                                            ] && (
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
                                                      event.opportunity[
                                                        "Service Offering 1"
                                                      ]
                                                    }
                                                  </b>
                                                </Typography>
                                              </Box>
                                            )}

                                            {event.opportunity[
                                              "Project Type"
                                            ] && (
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
                                                    {
                                                      event.opportunity[
                                                        "Project Type"
                                                      ]
                                                    }
                                                  </b>
                                                </Typography>
                                              </Box>
                                            )}
                                          </Grid>
                                        </Grid>
                                      </Box>
                                    </CardContent>
                                  </Card>
                                </Collapse>

                                {/* Date label next to dot */}
                                <Typography
                                  variant="caption"
                                  sx={{
                                    position: "absolute",
                                    right: "-75%",
                                    top: 0,
                                    whiteSpace: "nowrap",
                                    fontSize: "0.7rem",
                                    color: "text.secondary",
                                    backgroundColor: alpha(
                                      theme.palette.background.paper,
                                      0.8
                                    ),
                                    px: 0.5,
                                    borderRadius: 1,
                                    pointerEvents: "none",
                                  }}
                                >
                                  {event.date.toLocaleDateString('fr-FR')}
                                </Typography>
                              </Box>
                            );
                          })}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      flex: 1,
                      p: 4,
                      textAlign: "center",
                      borderRadius: 2,
                      border: `1px dashed ${alpha(
                        theme.palette.primary.main,
                        0.2
                      )}`,
                      bgcolor: alpha(theme.palette.primary.main, 0.02),
                    }}
                  >
                    <TimelineIcon
                      color="disabled"
                      sx={{ fontSize: 48, mb: 2 }}
                    />
                    <Typography variant="body1" color="text.secondary">
                      No timeline events found for this jobcode.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Fade>
  );
};

export default JobcodeTimelineTab;
