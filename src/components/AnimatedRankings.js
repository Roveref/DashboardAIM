import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  alpha,
  Slider,
  IconButton,
  Tooltip,
  Grid,
  Chip,
  LinearProgress,
  useTheme,
  Fade,
  Zoom,
  Grow,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import FastForwardIcon from "@mui/icons-material/FastForward";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Format date in French format
const formatDateFR = (date) => {
  if (!date) return "";
  return format(date, "dd/MM/yyyy", { locale: fr });
};

const AnimatedRankings = ({ data }) => {
  const theme = useTheme();
  const animationRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentDate, setCurrentDate] = useState(null);
  const [sliderValue, setSliderValue] = useState(0);
  const [topAccounts, setTopAccounts] = useState([]);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [dateRange, setDateRange] = useState([null, null]);
  const [dataByDate, setDataByDate] = useState({});
  const [allDates, setAllDates] = useState([]);
  const barRefs = useRef({});

  // Initialize component with default date range (Jan 1st to today)
  useEffect(() => {
    if (!data || data.length === 0) return;

    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    
    setDateRange([startOfYear, today]);
    setCurrentDate(startOfYear);
    
    // Process data for each day of the year
    processDataByDate(startOfYear, today);
  }, [data]);

  // Process all booking data by date
  const processDataByDate = (startDate, endDate) => {
    if (!data || data.length === 0 || !startDate || !endDate) return;
    
    // Filter to only include booked opportunities (Status 14)
    const bookedOpportunities = data.filter(item => item.Status === 14);
    
    // Create a map of all dates between start and end
    const dateMap = {};
    const allDatesList = [];
    
    // Clone the dates to avoid mutation
    const currentDate = new Date(startDate.getTime());
    const lastDate = new Date(endDate.getTime());
    
    // Create an array of dates and initialize empty data for each
    while (currentDate <= lastDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dateMap[dateKey] = [];
      allDatesList.push(new Date(currentDate));
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Assign opportunities to each date based on Last Status Change Date
    bookedOpportunities.forEach(opp => {
      if (!opp["Last Status Change Date"]) return;
      
      const oppDate = new Date(opp["Last Status Change Date"]);
      // Skip if outside our date range
      if (oppDate < startDate || oppDate > endDate) return;
      
      const dateKey = oppDate.toISOString().split('T')[0];
      
      // If the date exists in our map, add the opportunity
      if (dateMap[dateKey]) {
        dateMap[dateKey].push(opp);
      }
    });
    
    // For the animation, we need a cumulative view
    // So each date should include all opportunities up to that date
    const cumulativeMap = {};
    let cumulativeOpps = [];
    
    allDatesList.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      
      // Add new opportunities for this date to our cumulative list
      cumulativeOpps = [...cumulativeOpps, ...dateMap[dateKey]];
      
      // Store the cumulative list for this date
      cumulativeMap[dateKey] = [...cumulativeOpps];
    });
    
    setDataByDate(cumulativeMap);
    setAllDates(allDatesList);
    
    // Update the slider max value
    if (allDatesList.length > 0) {
      updateTopAccountsForDate(allDatesList[0]);
    }
  };

  // Revenue calculation function to match existing implementation
  const calculateRevenueWithSegmentLogic = (item) => {
    // Check if segment code is AUTO, CLR, or IEM
    const specialSegmentCodes = ["AUTO", "CLR", "IEM"];
    const isSpecialSegmentCode = specialSegmentCodes.includes(
      item["Sub Segment Code"]
    );

    // If special segment code, return full gross revenue
    if (isSpecialSegmentCode) {
      return item["Gross Revenue"] || 0;
    }

    // Check each service line (1, 2, and 3)
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
        return (
          total + (item["Gross Revenue"] || 0) * (service.percentage / 100)
        );
      }
      return total;
    }, 0);

    // If any Operations allocation is found, return that
    if (operationsAllocation > 0) {
      return operationsAllocation;
    }

    // If no specific Operations allocation, return full gross revenue
    return item["Gross Revenue"] || 0;
  };

  // Update top accounts based on a specific date with smoother transitions
  const updateTopAccountsForDate = (date) => {
    if (!date) return;
    
    const dateKey = date.toISOString().split('T')[0];
    const relevantOpportunities = dataByDate[dateKey] || [];
    
    // Group by account
    const accountMap = {};

    relevantOpportunities.forEach((opportunity) => {
      const account = opportunity.Account || "Unknown";
      if (!accountMap[account]) {
        accountMap[account] = {
          account: account,
          bookingAmount: 0,
          calculatedAmount: 0,
          opportunityCount: 0,
          avgBookingSize: 0,
          opportunities: [],
          serviceLines: new Set(),
          latestBookingDate: null,
          hasSpecialSegment: false,
          previousRank: null,
          animationId: Math.random().toString(36).substr(2, 9), // Unique ID for animation keys
        };
      }

      // Add to total amount
      const bookingAmount = opportunity["Gross Revenue"] || 0;
      const calculatedAmount = calculateRevenueWithSegmentLogic(opportunity);

      accountMap[account].bookingAmount += bookingAmount;
      accountMap[account].calculatedAmount += calculatedAmount;
      accountMap[account].opportunityCount += 1;
      accountMap[account].opportunities.push(opportunity);
      
      // Check for special segment
      if (["AUTO", "CLR", "IEM"].includes(opportunity["Sub Segment Code"])) {
        accountMap[account].hasSpecialSegment = true;
      }

      // Track service lines
      if (opportunity["Service Line 1"]) {
        accountMap[account].serviceLines.add(opportunity["Service Line 1"]);
      }

      // Track latest booking date
      const bookingDate = new Date(
        opportunity["Last Status Change Date"] ||
          opportunity["Winning Date"] ||
          opportunity["Creation Date"]
      );
      
      if (
        !accountMap[account].latestBookingDate ||
        bookingDate > accountMap[account].latestBookingDate
      ) {
        accountMap[account].latestBookingDate = bookingDate;
      }
    });

    // Calculate the IO target for progress bars (1M euros)
    const IO_TARGET = 1000000;

    // Preserve previous animation details and IDs
    const previousTopAccounts = [...topAccounts];
    
    // Convert to array, calculate averages and convert sets to arrays
    let accountsArray = Object.values(accountMap).map((account) => {
      // Find if account existed in previous set to maintain animation ID
      const existingAccount = previousTopAccounts.find(a => a.account === account.account);
      
      return {
        ...account,
        avgBookingSize:
          account.opportunityCount > 0
            ? account.bookingAmount / account.opportunityCount
            : 0,
        serviceLines: Array.from(account.serviceLines),
        percentOfTotal: 0, // Will be calculated after sorting
        ioProgressPercentage: Math.min((account.calculatedAmount / IO_TARGET) * 100, 100),
        
        // Keep the same animation ID if it existed before for smoother transitions
        animationId: existingAccount ? existingAccount.animationId : account.animationId,
        
        // Track last value for animated number transitions
        lastCalculatedAmount: existingAccount ? existingAccount.calculatedAmount : account.calculatedAmount,
        lastBookingAmount: existingAccount ? existingAccount.bookingAmount : account.bookingAmount,
        lastOpportunityCount: existingAccount ? existingAccount.opportunityCount : account.opportunityCount,
      };
    });

    // Sort by I&O amount (calculatedAmount) - largest to smallest
    accountsArray.sort((a, b) => b.calculatedAmount - a.calculatedAmount);
    
    // Take top 10 accounts
    accountsArray = accountsArray.slice(0, 10);
    
    // Calculate total for percentage calculation
    const totalAmount = accountsArray.reduce(
      (sum, account) => sum + account.bookingAmount, 
      0
    );
    
    // Add percentage of total and keep track of previous rank
    accountsArray.forEach((account, index) => {
      account.percentOfTotal = totalAmount > 0 
        ? (account.bookingAmount / totalAmount) * 100 
        : 0;
      
      // Find previous rank if it existed
      const prevAccount = previousTopAccounts.find(
        a => a.account === account.account
      );
      
      if (prevAccount) {
        // Find the index of this account in the previous ranking
        const prevIndex = previousTopAccounts.findIndex(
          a => a.account === account.account
        );
        account.previousRank = prevIndex;
        
        // Add change values for animation
        account.amountChange = account.calculatedAmount - prevAccount.calculatedAmount;
        account.rankChange = prevIndex - index; // Positive means moved up, negative means moved down
      } else {
        account.previousRank = null; // New entry
        account.amountChange = 0;
        account.rankChange = 0; 
      }
      
      // Current rank
      account.currentRank = index;
    });
    
    // Add exit animations for accounts that have disappeared
    const disappearingAccounts = previousTopAccounts.filter(
      prevAccount => !accountsArray.some(newAccount => newAccount.account === prevAccount.account)
    ).map(account => ({
      ...account,
      isExiting: true, // Mark as exiting for animation
    }));
    
    // Combine current accounts with those that are exiting
    // We'll handle the animation for exiting accounts separately
    if (disappearingAccounts.length > 0 && previousTopAccounts.length > 0) {
      // Only add disappearing accounts if we're not on the initial render
      setTopAccounts([...accountsArray, ...disappearingAccounts]);
      
      // Remove exiting accounts after animation duration
      setTimeout(() => {
        setTopAccounts(current => current.filter(acc => !acc.isExiting));
      }, 500);
    } else {
      setTopAccounts(accountsArray);
    }
  };

  // Animate rankings between time steps with smoother, slower timing
  useEffect(() => {
    if (!isPlaying || allDates.length === 0) return;
    
    // Calculate current date based on slider position
    const dateIndex = Math.min(
      Math.floor(sliderValue), 
      allDates.length - 1
    );
    
    const date = allDates[dateIndex];
    setCurrentDate(date);
    updateTopAccountsForDate(date);
    
    // Set up the next animation frame with slower timing
    const timer = setTimeout(() => {
      // Move slider based on animation speed (EVEN SLOWER)
      if (sliderValue < allDates.length - 1) {
        setSliderValue(prev => Math.min(prev + (0.1 * animationSpeed), allDates.length - 1));
      } else {
        // End of animation
        setIsPlaying(false);
      }
    }, 300); // Add a delay between updates for smoother motion
    
    // Clean up timer on component unmount
    return () => {
      clearTimeout(timer);
    };
  }, [isPlaying, sliderValue, allDates, animationSpeed]);

  // Handle slider change
  const handleSliderChange = (event, newValue) => {
    setSliderValue(newValue);
    
    if (allDates.length > 0) {
      const dateIndex = Math.min(Math.floor(newValue), allDates.length - 1);
      const date = allDates[dateIndex];
      
      setCurrentDate(date);
      updateTopAccountsForDate(date);
    }
  };

  // Play/Pause animation
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    
    // If we're at the end, reset to start when playing again
    if (sliderValue >= allDates.length - 1) {
      setSliderValue(0);
      
      if (allDates.length > 0) {
        setCurrentDate(allDates[0]);
        updateTopAccountsForDate(allDates[0]);
      }
    }
  };

  // Reset animation
  const resetAnimation = () => {
    setIsPlaying(false);
    setSliderValue(0);
    
    if (allDates.length > 0) {
      setCurrentDate(allDates[0]);
      updateTopAccountsForDate(allDates[0]);
    }
  };

  // Speed up animation
  const increaseSpeed = () => {
    // Lower maximum speed to prevent going too fast
    setAnimationSpeed(prev => {
      if (prev >= 3) return 1; // Reset to 1 if already at max speed
      return prev + 1;
    });
  };

  // Get background color based on rank change - MORE SUBTLE COLORS
  const getRankChangeColor = (account) => {
    if (account.previousRank === null) {
      // New entry - very subtle green
      return alpha(theme.palette.success.main, 0.07);
    }
    
    if (account.previousRank < account.currentRank) {
      // Moved down (worse) - very subtle red
      return alpha(theme.palette.error.light, 0.07);
    }
    
    if (account.previousRank > account.currentRank) {
      // Moved up (better) - very subtle green
      return alpha(theme.palette.success.light, 0.07);
    }
    
    // No change
    return "transparent";
  };

  // Get progress bar color based on percentage
  const getProgressColor = (percentage) => {
    if (percentage >= 100) return theme.palette.success.main;
    if (percentage >= 70) return theme.palette.success.light;
    if (percentage >= 30) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  // Get icon for rank change
  const getRankChangeIcon = (account) => {
    if (account.previousRank === null) {
      // New entry
      return "🆕";
    }
    
    if (account.previousRank < account.currentRank) {
      // Moved down (worse)
      return "↓";
    }
    
    if (account.previousRank > account.currentRank) {
      // Moved up (better)
      return "↑";
    }
    
    // No change
    return "—";
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        mb: 3,
        overflow: "hidden",
      }}
    >
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Top 10 Accounts Animation
      </Typography>
      
      {/* Animation Controls */}
      <Grid container spacing={2} sx={{ mb: 3, alignItems: "center" }}>
        <Grid item>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Zoom in={true} style={{ transitionDelay: '100ms' }}>
              <IconButton 
                onClick={togglePlayPause} 
                color="primary" 
                size="large"
                sx={{ 
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  }
                }}
              >
                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
            </Zoom>
            
            <Zoom in={true} style={{ transitionDelay: '200ms' }}>
              <IconButton 
                onClick={resetAnimation} 
                color="primary"
                sx={{ 
                  backgroundColor: alpha(theme.palette.grey[300], 0.5),
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.grey[400], 0.5),
                  }
                }}
              >
                <RestartAltIcon />
              </IconButton>
            </Zoom>
            
            <Zoom in={true} style={{ transitionDelay: '300ms' }}>
              <Tooltip title={`Speed: ${animationSpeed}x`}>
                <IconButton 
                  onClick={increaseSpeed} 
                  color="primary"
                  sx={{ 
                    backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.secondary.main, 0.2),
                    }
                  }}
                >
                  <FastForwardIcon />
                </IconButton>
              </Tooltip>
            </Zoom>
          </Box>
        </Grid>
        
        <Grid item xs>
          <Fade in={true} style={{ transitionDelay: '200ms' }}>
            <Slider
              value={sliderValue}
              onChange={handleSliderChange}
              min={0}
              max={allDates.length - 1}
              step={0.1}
              sx={{
                color: theme.palette.primary.main,
                height: 8,
                '& .MuiSlider-thumb': {
                  width: 16,
                  height: 16,
                },
              }}
            />
          </Fade>
        </Grid>
        
        <Grid item xs={3} md={2}>
          <Fade in={true} style={{ transitionDelay: '300ms' }}>
            <Box 
              sx={{ 
                display: "flex", 
                alignItems: "center", 
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                p: 1,
                borderRadius: 2,
                justifyContent: "center",
                gap: 1
              }}
            >
              <CalendarTodayIcon fontSize="small" color="primary" />
              <Typography variant="body2" fontWeight={600}>
                {currentDate ? formatDateFR(currentDate) : ""}
              </Typography>
            </Box>
          </Fade>
        </Grid>
      </Grid>
      
      {/* Progress indicator */}
      <Box sx={{ width: "100%", mb: 3 }}>
        <LinearProgress 
          variant="determinate" 
          value={(sliderValue / (allDates.length - 1)) * 100} 
          sx={{ 
            height: 4, 
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.grey[300], 0.5),
            '& .MuiLinearProgress-bar': {
              borderRadius: 2,
            },
          }}
        />
      </Box>
      
      {/* Animated Account Rankings */}
      <Box sx={{ position: 'relative', minHeight: 700, mb: 4 }}>
        {topAccounts.map((account, index) => {
          // Determine if this is a new account
          const isNew = account.previousRank === null;
          
          // Determine direction of movement
          let movement = 0; // No movement
          if (!isNew && account.previousRank !== account.currentRank) {
            movement = account.previousRank < account.currentRank ? 1 : -1; // 1: moved down, -1: moved up
          }
          
          // Animation styles with smoother transitions
          const animationStyles = {
            transform: account.isExiting 
              ? 'translateX(-100px) scale(0.8)' 
              : isNew 
                ? 'translateX(0) scale(1)' 
                : `translateY(${index * 65}px)`, // Reduced height per item to fit more
            opacity: account.isExiting ? 0 : 1,
            transition: `transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), 
                        opacity 0.8s ease-in-out,
                        background-color 1.5s ease-in-out`,
          };
          
          // Initial styles for new entries with longer fade-in
          const initialStyles = isNew ? {
            transform: 'translateX(100px) scale(0.8)',
            opacity: 0,
          } : {};
          
          return (
            <Grow 
              in={!account.isExiting} 
              style={{ 
                transformOrigin: 'center left',
                position: 'absolute',
                width: '100%',
                top: 0,
                ...initialStyles,
                ...animationStyles
              }}
              key={account.animationId || account.account}
              timeout={isNew ? 500 : 300}
            >
              <Box
                ref={el => barRefs.current[account.account] = el}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1, // Reduced padding
                  mb: 0.5, // Reduced margin
                  borderRadius: 2,
                  backgroundColor: getRankChangeColor(account),
                  border: "1px solid",
                  borderColor: alpha(theme.palette.divider, 0.1),
                  position: "relative",
                  boxShadow: account.previousRank !== account.currentRank ?
                    `0 4px 8px ${alpha(theme.palette.common.black, 0.1)}` : "none",
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.action.hover, 0.1),
                  }
                }}
              >
                {/* Left side: Rank and Account */}
                <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <Zoom in={true} style={{ transitionDelay: '100ms', transitionDuration: '800ms' }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        width: 36, 
                        height: 36, 
                        borderRadius: "50%", 
                        backgroundColor: theme.palette.primary.main, 
                        color: "white", 
                        display: "flex", 
                        justifyContent: "center", 
                        alignItems: "center", 
                        fontWeight: 700,
                        mr: 2
                      }}
                    >
                      {index + 1}
                    </Typography>
                  </Zoom>
                  
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      {account.account}
                      {account.hasSpecialSegment && (
                        <Fade in={true} style={{ transitionDelay: '600ms', transitionDuration: '1000ms' }}>
                          <Chip
                            label="AUTO/CLR/IEM"
                            size="small"
                            color="info"
                            sx={{ ml: 1, height: 20, fontSize: '0.65rem' }}
                          />
                        </Fade>
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {account.opportunityCount} opportunities
                    </Typography>
                  </Box>
                  
                  {/* Rank change indicator with slower transition */}
                  <Zoom in={true} style={{ transitionDelay: '400ms', transitionDuration: '800ms' }}>
                    <Box 
                      sx={{ 
                        ml: 2, 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        backgroundColor: account.previousRank === null
                          ? alpha(theme.palette.success.main, 0.08)
                          : account.previousRank < account.currentRank
                          ? alpha(theme.palette.error.main, 0.08)
                          : account.previousRank > account.currentRank
                          ? alpha(theme.palette.success.main, 0.08)
                          : alpha(theme.palette.grey[300], 0.3),
                        color: account.previousRank === null
                          ? theme.palette.success.main
                          : account.previousRank < account.currentRank
                          ? theme.palette.error.main
                          : account.previousRank > account.currentRank
                          ? theme.palette.success.main
                          : theme.palette.text.secondary,
                        fontWeight: 700,
                        fontSize: "1rem",
                        transform: movement === 1 
                          ? 'rotate(45deg)' 
                          : movement === -1 
                          ? 'rotate(-45deg)' 
                          : 'rotate(0)',
                        transition: 'transform 1s ease-out, background-color 1s ease'
                      }}
                    >
                      {getRankChangeIcon(account)}
                    </Box>
                  </Zoom>
                </Box>
                
                {/* Right side: Values and Progress */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                  {/* I&O Amount */}
                  <Box sx={{ textAlign: "right", minWidth: 120 }}>
                    <Fade in={true} style={{ transitionDelay: '800ms', transitionDuration: '1000ms' }}>
                      <div>
                        <Typography variant="body2" fontWeight={600} color="primary.main">
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(account.calculatedAmount)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          I&O Amount
                        </Typography>
                      </div>
                    </Fade>
                  </Box>
                  
                  {/* Progress Bar */}
                  <Box sx={{ width: 200 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={600}>
                        {account.ioProgressPercentage.toFixed(1)}% to €1M
                      </Typography>
                    </Box>
                    <Fade in={true} style={{ transitionDelay: '900ms', transitionDuration: '1200ms' }}>
                      <div style={{ width: '100%' }}>
                        <LinearProgress
                          variant="determinate"
                          value={account.ioProgressPercentage}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: alpha(theme.palette.grey[300], 0.5),
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4,
                              backgroundColor: getProgressColor(account.ioProgressPercentage),
                              transition: 'transform 2s cubic-bezier(0.65, 0, 0.35, 1)'
                            },
                          }}
                        />
                      </div>
                    </Fade>
                  </Box>
                  
                  {/* Total Booking Amount */}
                  <Box sx={{ textAlign: "right", minWidth: 120 }}>
                    <Fade in={true} style={{ transitionDelay: '1000ms', transitionDuration: '1000ms' }}>
                      <div>
                        <Typography variant="body2" fontWeight={600}>
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(account.bookingAmount)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total Bookings
                        </Typography>
                      </div>
                    </Fade>
                  </Box>
                </Box>
              </Box>
            </Grow>
          );
        })}
        
        {/* Empty state if no accounts */}
        {topAccounts.length === 0 && (
          <Box sx={{ 
            p: 4, 
            textAlign: "center", 
            backgroundColor: alpha(theme.palette.grey[100], 0.5),
            borderRadius: 2
          }}>
            <Typography variant="body1" color="text.secondary">
              No account data available for the selected date.
            </Typography>
            <Typography variant="caption">
              Move the slider forward to see accounts as they appear.
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default AnimatedRankings;
