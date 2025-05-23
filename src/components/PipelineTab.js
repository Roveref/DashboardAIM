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
  Stack,
} from "@mui/material";
import {
  BarChart,
  Bar,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label,
} from "recharts";
import OpportunityList from "./OpportunityList";
import { sumBy, groupDataBy } from "../utils/dataUtils";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import PipelineInsights from "./PipelineInsights";

// Status mapping for better readability
const statusMap = {
  1: "1 - New Lead",
  4: "4 - Go Approved",
  6: "6 - Proposal Delivered",
  11: "11 - Final Negotiation",
};

// Define all possible statuses to ensure complete representation
const ALL_STATUSES = [
  { status: "1 - New Lead", statusNumber: 1 },
  { status: "4 - Go Approved", statusNumber: 4 },
  { status: "6 - Proposal Delivered", statusNumber: 6 },
  { status: "11 - Final Negotiation", statusNumber: 11 },
];



// Revenue calculation function to match previous implementation
const calculateRevenueWithSegmentLogic = (item, showNetRevenue = false) => {
  // Check if segment code is AUTO, CLR, or IEM
  const specialSegmentCodes = ['AUTO', 'CLR', 'IEM'];
  const isSpecialSegmentCode = specialSegmentCodes.includes(item['Sub Segment Code']);

  // If special segment code, return full revenue based on toggle
  if (isSpecialSegmentCode) {
    return showNetRevenue ? (item['Net Revenue'] || 0) : (item['Gross Revenue'] || 0);
  }

  // Check each service line (1, 2, and 3)
  const serviceLines = [
    { line: item['Service Line 1'], percentage: item['Service Offering 1 %'] || 0 },
    { line: item['Service Line 2'], percentage: item['Service Offering 2 %'] || 0 },
    { line: item['Service Line 3'], percentage: item['Service Offering 3 %'] || 0 }
  ];

  // Get the base revenue value based on toggle
  const baseRevenue = showNetRevenue ? (item['Net Revenue'] || 0) : (item['Gross Revenue'] || 0);

  // Calculate total allocated revenue for Operations
  const operationsAllocation = serviceLines.reduce((total, service) => {
    if (service.line === 'Operations') {
      return total + (baseRevenue * (service.percentage / 100));
    }
    return total;
  }, 0);

  // If any Operations allocation is found, return that
  if (operationsAllocation > 0) {
    return operationsAllocation;
  }

  // If no specific Operations allocation, return full revenue
  return baseRevenue;
};



const PipelineTab = ({ data, loading, onSelection, selectedOpportunities, showNetRevenue = false }) => {
  const [pipelineByStatus, setPipelineByStatus] = useState([]);
  const [pipelineByServiceLine, setPipelineByServiceLine] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [allocatedRevenue, setAllocatedRevenue] = useState(0);
  const [filteredOpportunities, setFilteredOpportunities] = useState([]);
  const theme = useTheme();
  const [isAllocated, setIsAllocated] = useState(false);
  const [allocatedServiceLine, setAllocatedServiceLine] = useState("");
  const [calculatedTotalRevenue, setCalculatedTotalRevenue] = useState(0);
  const [activeFilterType, setActiveFilterType] = useState(null);
  const [stackedServiceLineData, setStackedServiceLineData] = useState([]);
  const [insightFilterApplied, setInsightFilterApplied] = useState(false);
  const [insightFilteredData, setInsightFilteredData] = useState([]);
  
  const [panelFilters, setPanelFilters] = useState({
    accounts: [],
    manager: [],
    partner: []
  });
  
  // Custom colors for charts
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.main,
    "#8884d8",
  ];

  const prepareStackedServiceLineData = () => {
    // Create a map for status categories
    const statusCategories = {
      early: [1], // Early pipeline (New Lead)
      mid: [4, 6], // Mid pipeline (Go Approved, Proposal Delivered)
      late: [11], // Late pipeline (Final Negotiation)
    };
  
    // Make sure we're using the current filtered opportunities
    const currentOpportunities = filteredOpportunities;
    
    // Group by service line first
    const serviceLineGroups = {};
  
    currentOpportunities.forEach((opp) => {
      const serviceLine = opp["Service Line 1"] || "Uncategorized";
      if (!serviceLineGroups[serviceLine]) {
        serviceLineGroups[serviceLine] = {
          name: serviceLine,
          early: 0,
          mid: 0,
          late: 0,
          total: 0,
          calculatedEarly: 0,
          calculatedMid: 0,
          calculatedLate: 0,
          calculatedTotal: 0,
        };
      }
  
      // Calculate the revenue using the original and calculated methods
      const originalRevenue = showNetRevenue ? (opp["Net Revenue"] || 0) : (opp["Gross Revenue"] || 0);
      const calculatedRevenue = calculateRevenueWithSegmentLogic(opp, showNetRevenue);
  
      // Add to the right status category using original and calculated revenues
      if (statusCategories.early.includes(opp.Status)) {
        serviceLineGroups[serviceLine].early += originalRevenue;
        serviceLineGroups[serviceLine].calculatedEarly += calculatedRevenue;
      } else if (statusCategories.mid.includes(opp.Status)) {
        serviceLineGroups[serviceLine].mid += originalRevenue;
        serviceLineGroups[serviceLine].calculatedMid += calculatedRevenue;
      } else if (statusCategories.late.includes(opp.Status)) {
        serviceLineGroups[serviceLine].late += originalRevenue;
        serviceLineGroups[serviceLine].calculatedLate += calculatedRevenue;
      }
  
      // Add to total using original and calculated revenues
      serviceLineGroups[serviceLine].total += originalRevenue;
      serviceLineGroups[serviceLine].calculatedTotal += calculatedRevenue;
    });
  
    // Convert to array and sort by total
    return Object.values(serviceLineGroups).sort((a, b) => b.total - a.total);
  };
  
  const FilterStatusIndicator = () => {
    if (!activeFilterType) return null;
    
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        borderRadius: 2,
        p: 1,
        mb: 2
      }}>
        <Typography variant="body2" color="primary.main" fontWeight={500}>
          Filtered by: {activeFilterType}
        </Typography>
        <Chip 
          label="Clear Filter" 
          size="small" 
          onClick={() => {
            setActiveFilterType(null);
            setFilteredOpportunities(data);
          }}
          sx={{ ml: 2, height: '24px' }}
        />
      </Box>
    );
  };
  // Make sure to call this function when preparing data for the chart
  // Replace the current stackedServiceLineData with:
  const calculateMedianOpportunitySize = (opportunities) => {
    if (!opportunities || opportunities.length === 0) return 0;
  
    // Get revenue values and sort them
    const revenueValues = opportunities
      .map((opp) => {
        return opp["Is Allocated"]
          ? (showNetRevenue ? opp["Allocated Net Revenue"] : opp["Allocated Gross Revenue"]) || 0
          : (showNetRevenue ? opp["Net Revenue"] : opp["Gross Revenue"]) || 0;
      })
      .sort((a, b) => a - b);
  
    const len = revenueValues.length;
  
    // Calculate median
    let median;
    if (len % 2 === 0) {
      // Even number of items
      median = (revenueValues[len / 2 - 1] + revenueValues[len / 2]) / 2;
    } else {
      // Odd number of items
      median = revenueValues[Math.floor(len / 2)];
    }
  
    return median;
  };
  const calculateFilteredMedianOpportunitySize = (opportunities) => {
    if (!opportunities || opportunities.length === 0) return 0;
  
    // Get allocated revenue values and sort them
    const revenueValues = opportunities
      .map((opp) => {
        // Use allocated revenue values for the filtered median
        return showNetRevenue ? (opp["Allocated Net Revenue"] || 0) : (opp["Allocated Gross Revenue"] || 0);
      })
      .sort((a, b) => a - b);

    const len = revenueValues.length;

    // Calculate median
    let median;
    if (len % 2 === 0) {
      // Even number of items
      median = (revenueValues[len / 2 - 1] + revenueValues[len / 2]) / 2;
    } else {
      // Odd number of items
      median = revenueValues[Math.floor(len / 2)];
    }

    return median;
  };
  const calculateSizeDistribution = (opportunities) => {
    // Define size ranges
    const ranges = [
      {
        name: "< €100K",
        min: 0,
        max: 100000,
        count: 0,
        value: 0,
        calculatedValue: 0,
        color: theme.palette.primary.light,
      },
      {
        name: "€100K-€500K",
        min: 100000,
        max: 500000,
        count: 0,
        value: 0,
        calculatedValue: 0,
        color: theme.palette.primary.main,
      },
      {
        name: "> €500K",
        min: 500000,
        max: Infinity,
        count: 0,
        value: 0,
        calculatedValue: 0,
        color: theme.palette.primary.dark,
      },
    ];
  
    // Calculate counts and values for each range
    opportunities.forEach((opp) => {
      const revenue = opp["Is Allocated"]
        ? (showNetRevenue ? opp["Allocated Net Revenue"] : opp["Allocated Gross Revenue"]) || 0
        : (showNetRevenue ? opp["Net Revenue"] : opp["Gross Revenue"]) || 0;
      
      // Calculate the I&O allocation value  
      const calculatedRevenue = calculateRevenueWithSegmentLogic(opp, showNetRevenue);
  
      for (const range of ranges) {
        if (revenue >= range.min && revenue < range.max) {
          range.count++;
          range.value += revenue;
          range.calculatedValue += calculatedRevenue;
          break;
        }
      }
    });
  
    // Calculate percentages
    const totalValue = ranges.reduce((sum, range) => sum + range.value, 0);
    ranges.forEach((range) => {
      range.percentage = totalValue > 0 ? (range.value / totalValue) * 100 : 0;
    });
  
    return ranges;
  };

  useEffect(() => {
    if (!data || loading) return;
  
    // Initialize filtered opportunities only on first load or when data changes and no filter is active
    if (filteredOpportunities.length === 0 || 
        (activeFilterType === null && filteredOpportunities !== data)) {
      setFilteredOpportunities(data);
    }
  
    // Check if we're using allocated revenue
    const hasAllocatedData =
      data.length > 0 &&
      data.some(
        (item) =>
          (showNetRevenue ? item["Allocated Net Revenue"] : item["Allocated Gross Revenue"]) !== undefined ||
          (item["Allocation Percentage"] !== undefined &&
            (showNetRevenue ? item["Net Revenue"] : item["Gross Revenue"]) !== undefined)
      );
  
    const isUsingAllocation =
      hasAllocatedData && data[0] && data[0]["Allocated Service Line"];
    setIsAllocated(isUsingAllocation);
  
    // Calculate total pipeline revenue with original and calculated methods
    const originalTotalRevenue = sumBy(
      data,
      (item) => {
        if (item["Is Allocated"]) {
          return showNetRevenue ? (item["Allocated Net Revenue"] || 0) : (item["Allocated Gross Revenue"] || 0);
        } else {
          return showNetRevenue ? (item["Net Revenue"] || 0) : (item["Gross Revenue"] || 0);
        }
      }
    );
    
    const calculatedTotalRevenue = data.reduce(
      (sum, item) => sum + calculateRevenueWithSegmentLogic(item, showNetRevenue),
      0
    );
  
    setTotalRevenue(originalTotalRevenue);
    setCalculatedTotalRevenue(calculatedTotalRevenue);
  
    // Calculate allocated revenue
    let allocated = 0;
    data.forEach((item) => {
      const allocatedRevenue = showNetRevenue 
        ? (typeof item["Allocated Net Revenue"] === "number" ? item["Allocated Net Revenue"] : 0)
        : (typeof item["Allocated Gross Revenue"] === "number" ? item["Allocated Gross Revenue"] : 0);
      allocated += allocatedRevenue;
    });
    setAllocatedRevenue(allocated);
  
    // Modified to ensure ALL statuses are represented
    const byStatus = ALL_STATUSES.map((statusInfo) => {
      // Find opportunities for this specific status
      const opportunities = data.filter(
        (item) => item["Status"] === statusInfo.statusNumber
      );
  
      // Calculate total revenue for this status
      const originalValue = opportunities.reduce((sum, item) => {
        const revenue = isUsingAllocation
          ? (showNetRevenue ? (item["Allocated Net Revenue"] || 0) : (item["Allocated Gross Revenue"] || 0))
          : (showNetRevenue ? (item["Net Revenue"] || 0) : (item["Gross Revenue"] || 0));
        return sum + revenue;
      }, 0);
  
      const calculatedValue = opportunities.reduce((sum, item) => {
        return sum + calculateRevenueWithSegmentLogic(item, showNetRevenue);
      }, 0);
  
      return {
        status: statusInfo.status,
        originalValue: originalValue,
        calculatedValue: calculatedValue,
        count: opportunities.length,
        statusNumber: statusInfo.statusNumber,
      };
    });
  
    setPipelineByStatus(byStatus);
  
    // Group data by service line for pie chart
    const byServiceLine = Object.entries(groupDataBy(data, "Service Line 1"))
      .map(([serviceLine, opportunities]) => {
        const originalValue = opportunities.reduce((sum, item) => {
          return sum + (isUsingAllocation 
            ? (showNetRevenue ? (item["Allocated Net Revenue"] || 0) : (item["Allocated Gross Revenue"] || 0))
            : (showNetRevenue ? (item["Net Revenue"] || 0) : (item["Gross Revenue"] || 0)));
        }, 0);
        
        const calculatedValue = opportunities.reduce(
          (sum, item) => sum + calculateRevenueWithSegmentLogic(item, showNetRevenue),
          0
        );
  
        return {
          name: serviceLine,
          originalValue: originalValue,
          calculatedValue: calculatedValue,
          count: opportunities.length,
        };
      })
      .sort((a, b) => b.originalValue - a.originalValue); // Sort by original value descending
    
    setPipelineByServiceLine(byServiceLine);
  }, [data, loading, filteredOpportunities.length, activeFilterType, showNetRevenue]); // Add showNetRevenue to dependencies


  useEffect(() => {
    if (!filteredOpportunities || filteredOpportunities.length === 0) return;
  
    // Add a cleanup function to prevent stale updates
    const isComponentMounted = true;
  
    // Calculate totals with the current filtered data
    const currentTotalRevenue = filteredOpportunities.reduce(
      (sum, item) => sum + (showNetRevenue ? (item["Net Revenue"] || 0) : (item["Gross Revenue"] || 0)),
      0
    );
    
    const currentCalculatedTotalRevenue = filteredOpportunities.reduce(
      (sum, item) => sum + calculateRevenueWithSegmentLogic(item, showNetRevenue),
      0
    );
  
    // Calculate allocated revenue based on filtered opportunities
    let currentAllocatedRevenue = 0;
    filteredOpportunities.forEach((item) => {
      const allocatedRevenue = showNetRevenue
        ? (typeof item["Allocated Net Revenue"] === "number" ? item["Allocated Net Revenue"] : 0)
        : (typeof item["Allocated Gross Revenue"] === "number" ? item["Allocated Gross Revenue"] : 0);
      currentAllocatedRevenue += allocatedRevenue;
    });
  
    // Only update if the component is still mounted
    if (isComponentMounted) {
      setTotalRevenue(currentTotalRevenue);
      setCalculatedTotalRevenue(currentCalculatedTotalRevenue);
      setAllocatedRevenue(currentAllocatedRevenue); // Update allocated revenue with filtered value
    }
  
    // Calculate pipeline by status with the current filtered data
    const byStatus = ALL_STATUSES.map((statusInfo) => {
      // Find opportunities for this specific status
      const opportunities = filteredOpportunities.filter(
        (item) => item["Status"] === statusInfo.statusNumber
      );
  
      // Calculate revenue for this status
      const originalValue = opportunities.reduce((sum, item) => {
        const revenue = isAllocated
          ? (showNetRevenue ? (item["Allocated Net Revenue"] || 0) : (item["Allocated Gross Revenue"] || 0))
          : (showNetRevenue ? (item["Net Revenue"] || 0) : (item["Gross Revenue"] || 0));
        return sum + revenue;
      }, 0);
  
      const calculatedValue = opportunities.reduce((sum, item) => {
        return sum + calculateRevenueWithSegmentLogic(item, showNetRevenue);
      }, 0);
  
      return {
        status: statusInfo.status,
        originalValue: originalValue,
        calculatedValue: calculatedValue,
        count: opportunities.length,
        statusNumber: statusInfo.statusNumber,
      };
    });
  
    if (isComponentMounted) {
      setPipelineByStatus(byStatus);
    }
      
    // Recalculate the data by service line
    const byServiceLine = Object.entries(groupDataBy(filteredOpportunities, "Service Line 1"))
      .map(([serviceLine, opportunities]) => {
        const originalValue = opportunities.reduce((sum, item) => {
          return sum + (isAllocated 
            ? (showNetRevenue ? (item["Allocated Net Revenue"] || 0) : (item["Allocated Gross Revenue"] || 0))
            : (showNetRevenue ? (item["Net Revenue"] || 0) : (item["Gross Revenue"] || 0)));
        }, 0);
        
        const calculatedValue = opportunities.reduce(
          (sum, item) => sum + calculateRevenueWithSegmentLogic(item, showNetRevenue),
          0
        );
  
        return {
          name: serviceLine,
          originalValue: originalValue,
          calculatedValue: calculatedValue,
          count: opportunities.length,
        };
      })
      .sort((a, b) => b.originalValue - a.originalValue);
    
    if (isComponentMounted) {
      setStackedServiceLineData(prepareStackedServiceLineData());
      setPipelineByServiceLine(byServiceLine);
    }
    
    return () => {
      // This helps prevent memory leaks and race conditions
    };  
  }, [filteredOpportunities, isAllocated, data, showNetRevenue]); // Added showNetRevenue


const handlePipelineInsightFilter = (filteredData, filterType) => {
  console.log(`PipelineInsight filter called with: ${filterType}, data count: ${filteredData?.length || 0}`);
  
  // If clicking on the same filter that's already active, remove it
  if (activeFilterType === filterType && insightFilterApplied) {
    // Reset the insight filter
    setInsightFilterApplied(false);
    setInsightFilteredData([]);
    
    // Reset to original data
    setFilteredOpportunities([...data]);
    setActiveFilterType(null);
    console.log(`Pipeline insight filter removed`);
  } else {
    // Apply the new filter
    if (filteredData && filteredData.length > 0) {
      // Create a deep copy of the filtered data to avoid reference issues
      const insightData = JSON.parse(JSON.stringify(filteredData));
      
      // Debug: Check service lines in the insight filtered data
      const serviceLines = [...new Set(insightData.map(item => item["Service Line 1"]))];
      console.log("Service lines in insight filtered data:", serviceLines);
      
      // Set state in sequence to ensure consistency
      setInsightFilteredData(insightData);
      setInsightFilterApplied(true);
      setActiveFilterType(filterType);
      setFilteredOpportunities(filteredData);
      
      console.log(`Pipeline insight filter applied: ${filterType} with ${filteredData.length} items`);
    }
  }
};

// Also add a debugging component to show current filter state - add it to your UI
const FilterDebugInfo = () => {
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 1, mb: 2, fontSize: '0.75rem' }}>
      <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
        {`DEBUG INFO:
- insightFilterApplied: ${insightFilterApplied}
- activeFilterType: ${activeFilterType || 'none'}
- filteredOpportunities: ${filteredOpportunities.length} items
- insightFilteredData: ${insightFilteredData.length} items
        `}
      </Typography>
    </Box>
  );
};

const handleChartClick = (chartEvent) => {
  if (!chartEvent || !chartEvent.activePayload || chartEvent.activePayload.length === 0) return;

  const clickedItem = chartEvent.activePayload[0].payload;
  let filterType = null;

  // Determine filter type
  if (clickedItem.status) {
    filterType = clickedItem.status;
  } else if (clickedItem.name) {
    filterType = clickedItem.name;
  }

  // DETAILED DEBUGGING to find the issue
  console.log("Chart click details:", {
    clickedItem,
    filterType,
    insightFilterApplied,
    activeFilterType,
    filteredOppsCount: filteredOpportunities.length,
    insightFilteredDataCount: insightFilteredData.length
  });

  // If insight filter is applied, inspect the first few items
  if (insightFilterApplied && insightFilteredData.length > 0) {
    // Check service lines in insightFilteredData
    const serviceLines = [...new Set(insightFilteredData.map(item => item["Service Line 1"]))];
    console.log("Available Service Lines in filtered data:", serviceLines);
    
    if (clickedItem.name) {
      // Check if this service line exists in the filtered data
      const matchCount = insightFilteredData.filter(item => 
        item["Service Line 1"] === clickedItem.name).length;
      console.log(`Looking for "${clickedItem.name}" in insightFilteredData: found ${matchCount} items`);
    }
  }

  // If clicking on the same filter that's already active, remove it
  if (activeFilterType === filterType) {
    if (insightFilterApplied) {
      // If insight filter is applied, revert to insight filtered data only
      setActiveFilterType(null);
      setFilteredOpportunities([...insightFilteredData]); // Use a fresh copy
      console.log("Chart filter removed, reverting to insight filtered data");
    } else {
      // No insight filter, revert to original data
      setActiveFilterType(null);
      setFilteredOpportunities(data);
      console.log("Chart filter removed, reverting to all data");
    }
    return;
  }

  // Apply new filter
  let filtered = [];
  
  // CRITICAL FIX: Make a fresh copy of the source data to avoid reference issues
  const sourceData = insightFilterApplied ? [...insightFilteredData] : [...data];
  
  console.log(`Filtering from source data with ${sourceData.length} items`);
  
  if (clickedItem.status) {
    // Status filter
    const statusNumber = parseInt(clickedItem.status.split(" ")[0]);
    filtered = sourceData.filter(opp => opp.Status === statusNumber);
    console.log(`Status filter results: ${filtered.length} items match status ${statusNumber}`);
  } else if (clickedItem.name) {
    // Service line filter - with detailed logging
    console.log(`Searching for Service Line "${clickedItem.name}"`);
    
    // Debug: Check the first few items in sourceData
    if (sourceData.length > 0) {
      console.log("Sample source item:", {
        id: sourceData[0].ID,
        serviceLine: sourceData[0]["Service Line 1"],
        status: sourceData[0].Status
      });
    }
    
    // Use simple direct filtering and log the results
    filtered = [];
    for (const opp of sourceData) {
      if (opp["Service Line 1"] === clickedItem.name) {
        filtered.push(opp);
      }
    }
    
    console.log(`Service line filter found ${filtered.length} matches for "${clickedItem.name}"`);
    
    // If no results, check for case sensitivity or whitespace issues
    if (filtered.length === 0 && sourceData.length > 0) {
      console.log("No matches found - checking for case sensitivity issues");
      const allServiceLines = sourceData.map(item => item["Service Line 1"]);
      const uniqueServiceLines = [...new Set(allServiceLines)];
      console.log("All service lines in source data:", uniqueServiceLines);
    }
  }

  if (filtered.length > 0) {
    // Update state
    setActiveFilterType(filterType);
    setFilteredOpportunities(filtered);
    console.log(`Filter applied successfully: ${filterType} with ${filtered.length} matches`);
  } else {
    console.log(`No matches found for filter: ${filterType}`);
  }
};


  // Calculate allocation percentage, handling the 100% case
  const allocationPercentage =
    totalRevenue > 0 && isAllocated
      ? Math.abs((allocatedRevenue / totalRevenue) * 100)
      : isAllocated
      ? 100
      : 0; // If we have allocation but can't calculate, assume 100%

      const StatusChartTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
          // Ne pas utiliser de variables d'état du composant parent
          // Utiliser uniquement les données du payload
          
          const serviceLine = payload[0].payload.name;
          // Utiliser les totaux du payload au lieu des variables d'état
          const chartTotalRevenue = payload[0].payload.total || 0;
          const chartCalculatedTotal = payload[0].payload.calculatedTotal || 0;
          
          // Extract pipeline stage data with both original and calculated values
          const pipelineStages = [];
          
          // Check each of the standard data keys we expect
          if (payload.some(p => p.dataKey === 'early')) {
            const earlyValue = payload.find(p => p.dataKey === 'early')?.value || 0;
            const calculatedEarlyValue = payload[0].payload.calculatedEarly || 0;
            if (earlyValue > 0) {
              pipelineStages.push({
                name: 'Early Pipeline',
                value: earlyValue,
                calculatedValue: calculatedEarlyValue,
                color: theme.palette.primary.light
              });
            }
          }
          
          if (payload.some(p => p.dataKey === 'mid')) {
            const midValue = payload.find(p => p.dataKey === 'mid')?.value || 0;
            const calculatedMidValue = payload[0].payload.calculatedMid || 0;
            if (midValue > 0) {
              pipelineStages.push({
                name: 'Mid Pipeline',
                value: midValue,
                calculatedValue: calculatedMidValue,
                color: theme.palette.primary.main
              });
            }
          }
          
          if (payload.some(p => p.dataKey === 'late')) {
            const lateValue = payload.find(p => p.dataKey === 'late')?.value || 0;
            const calculatedLateValue = payload[0].payload.calculatedLate || 0;
            if (lateValue > 0) {
              pipelineStages.push({
                name: 'Late Pipeline',
                value: lateValue,
                calculatedValue: calculatedLateValue,
                color: theme.palette.primary.dark
              });
            }
          }
          
          // Helper function to format currency
          const formatCurrency = (value) => {
            return new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value);
          };
          
          return (
            <Card
              sx={{
                p: 2,
                backgroundColor: "white",
                border: "1px solid",
                borderColor: alpha(theme.palette.primary.main, 0.1),
                boxShadow: theme.shadows[3],
                borderRadius: 2,
                minWidth: 280,
                maxWidth: 350,
              }}
            >
              {/* Service Line Name */}
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                {serviceLine}
              </Typography>
              
              {/* Each Pipeline Stage */}
              {pipelineStages.map((stage, index) => (
                <Box key={index} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" fontWeight={500} color={stage.color}>
                      {stage.name}:
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {formatCurrency(stage.value)}
                    </Typography>
                  </Box>
                  
                  {/* Always show calculated value */}
                  <Typography 
                    variant="body2" 
                    color="primary.main" 
                    sx={{ 
                      fontSize: '0.75rem', 
                      ml: 4,
                      mt: 0.5
                    }}
                  >
                    (I&O: {formatCurrency(stage.calculatedValue)})
                  </Typography>
                </Box>
              ))}
              
              <Divider sx={{ my: 1 }} />
              
              {/* Total Section */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" fontWeight={600}>
            Total:
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {formatCurrency(chartTotalRevenue)}
          </Typography>
        </Box>
        
        <Typography 
          variant="body2" 
          color="primary.main"
          sx={{ 
            fontSize: '0.8rem', 
            ml: 4,
            mt: 0.5
          }}
        >
          (I&O: {formatCurrency(chartCalculatedTotal)})
        </Typography>
        {/* ... */}
      </Card>
    );
  }
  return null;
};
  // Custom tooltip for revenue charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Card
        sx={{
          p: 2,
          backgroundColor: "white",
          border: "1px solid",
          borderColor: alpha(theme.palette.primary.main, 0.1),
          boxShadow: theme.shadows[3],
          borderRadius: 2,
          minWidth: 250,
          maxWidth: 350
        }}
      >
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
            {`${label || payload[0].name}`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {`Revenue: ${new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(payload[0].value)}`}
          </Typography>
          {/* Add calculated value in parentheses if available */}
          {payload[0].payload.calculatedValue && (
            <Typography variant="body2" color="primary.main">
              {`(I&O: ${new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(payload[0].payload.calculatedValue)})`}
            </Typography>
          )}
          {payload[0].payload.count && (
            <Typography variant="body2" color="text.secondary">
              {`Count: ${payload[0].payload.count} opportunities`}
            </Typography>
          )}
        </Card>
      );
    }
    return null;
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
        {/* Summary Cards */}
        {/* Summary Cards - First Row */}
        <Grid item xs={12}>
        <PipelineInsights
          data={data}
          isFiltered={filteredOpportunities.length !== data.length}
          onFilterChange={handlePipelineInsightFilter}
          activeFilterType={activeFilterType}
          showNetRevenue={showNetRevenue}
        />
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: "100%",
              transition: "all 0.3s",
              "&:hover": {
                boxShadow: 6,
                transform: "translateY(-4px)",
              },
              position: "relative",
              overflow: "hidden",
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: 3, height: "100%" }}>
              {/* Card Title */}
              <Typography
  variant="h6"
  fontWeight={700}
  color="primary.main"
  gutterBottom
>
  {isAllocated ? "Filtered Pipeline" : `Pipeline Overview`}
</Typography>

              <Divider sx={{ my: 2 }} />

    {/* Total Pipeline */}

<Box sx={{ mt: 3, mb: 3 }}>
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      position: "relative",
    }}
  >
    {/* Total Pipeline */}
    <Box sx={{ flex: 1 }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Total Pipeline Value
      </Typography>
      <Typography
        variant="h4"
        component="div"
        fontWeight={700}
        color="text.primary"
      >
        {new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: "EUR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(totalRevenue)}
      </Typography>
      <Typography 
        variant="body2" 
        color="primary.main"
        sx={{ mt: 0.5 }}
      >
        (I&O: {new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: "EUR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(calculatedTotalRevenue)})
      </Typography>
    </Box>
                      {/* Center arrow with percentage - only when allocation is active */}

    {isAllocated && (
                    <Box
                      sx={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        px: 1,
                        py: 0.5,
                        borderRadius: 4,
                        bgcolor: alpha(theme.palette.secondary.main, 0.1),
                        zIndex: 1,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="secondary.main"
                        fontWeight={600}
                        sx={{ mb: 0.5 }}
                      >
                        {allocationPercentage === 100
                          ? "100%"
                          : `${allocationPercentage.toFixed(0)}%`}
                      </Typography>
                      <ArrowRightAltIcon color="secondary" fontSize="small" />
                    </Box>
                  )}
    {/* Optional: Allocation Section - only when allocation is active */}
    {isAllocated && (
      <Box sx={{ flex: 1, textAlign: "right" }}>
        <Typography
          variant="body2"
          color="secondary.main"
          gutterBottom
        >
          Filtered Pipeline Value
        </Typography>
        <Typography
          variant="h4"
          component="div"
          color="secondary.main"
          fontWeight={700}
        >
          {new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(allocatedRevenue)}
        </Typography>
      </Box>
    )}
  </Box>
</Box>

              {/* New section: Pipeline breakdown by size ranges */}
              <Box sx={{ mt: 3 }}>
  <Typography
    variant="subtitle2"
    fontWeight={600}
    color="text.primary"
    gutterBottom
  >
    Pipeline Size Breakdown
  </Typography>

  {calculateSizeDistribution(filteredOpportunities).map(
    (range, index) => (
      <Box key={range.name} sx={{ mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 0.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: range.color,
                mr: 1,
              }}
            />
            <Typography variant="body2" fontWeight={500}>
              {range.name}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {range.count} opps
          </Typography>
        </Box>

        <Box
          sx={{ display: "flex", alignItems: "center", mb: 0.5 }}
        >
          <Box sx={{ flex: 1, mr: 1 }}>
            <Box
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: alpha(range.color, 0.15),
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  width: `${range.percentage}%`,
                  bgcolor: range.color,
                  borderRadius: 4,
                }}
              />
            </Box>
          </Box>
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ minWidth: 40, textAlign: "right" }}
          >
            {range.percentage.toFixed(0)}%
          </Typography>
        </Box>

        {/* Revenue value with I&O calculated value in parentheses */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(range.value)}
          </Typography>
          <Typography
            variant="body2"
            color="primary.main"
            sx={{ mt: 0.5, ml: 1, fontSize: '0.75rem' }}
          >
            (I&O: {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(range.calculatedValue)})
          </Typography>
        </Box>
      </Box>
    )
  )}
</Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mt: 3,
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  borderRadius: 2,
                  p: 1.5,
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={500}
                >
                  {data.length} opportunities in pipeline
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        {/* Average Opportunity Size Card */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: "100%",
              transition: "all 0.3s",
              "&:hover": {
                boxShadow: 6,
                transform: "translateY(-4px)",
              },
              position: "relative",
              overflow: "hidden",
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: 3, height: "100%" }}>
              {/* Card Title */}
              <Typography
                variant="h6"
                fontWeight={700}
                color="primary.main"
                gutterBottom
              >
                Opportunity Size Analysis
              </Typography>

              <Divider sx={{ my: 2 }} />

              {/* Average and Filtered Average in a row */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mt: 3,
                  mb: 3,
                }}
              >
                {/* Average */}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Average Opportunity Size
                  </Typography>
                  <Typography
                    variant="h4"
                    component="div"
                    fontWeight={700}
                    color="text.primary"
                  >
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(
                      filteredOpportunities.length > 0
                        ? totalRevenue / filteredOpportunities.length
                        : 0
                    )}
                  </Typography>
                </Box>

                {/* Filtered Average - only shown when allocation is active */}
                {isAllocated && (
                  <Box sx={{ flex: 1, textAlign: "right" }}>
                    <Typography
                      variant="body2"
                      color="secondary.main"
                      gutterBottom
                    >
                      Filtered Average
                    </Typography>
                    <Typography
                      variant="h4"
                      component="div"
                      color="secondary.main"
                      fontWeight={700}
                    >
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(
                        filteredOpportunities.length > 0
                          ? allocatedRevenue / filteredOpportunities.length
                          : 0
                      )}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Median and Filtered Median in a row */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 3,
                }}
              >
                {/* Regular Median */}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Median Opportunity Size
                  </Typography>
                  <Typography
                    variant="h4"
                    component="div"
                    fontWeight={700}
                    color={theme.palette.info.main}
                  >
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(
                      calculateMedianOpportunitySize(filteredOpportunities)
                    )}
                  </Typography>
                </Box>

                {/* Filtered Median - only shown when allocation is active */}
                {isAllocated && (
                  <Box sx={{ flex: 1, textAlign: "right" }}>
                    <Typography
                      variant="body2"
                      color={theme.palette.info.dark}
                      gutterBottom
                    >
                      Filtered Median
                    </Typography>
                    <Typography
                      variant="h4"
                      component="div"
                      color={theme.palette.info.dark}
                      fontWeight={700}
                    >
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(
                        calculateFilteredMedianOpportunitySize(
                          filteredOpportunities
                        )
                      )}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Comparison box - analysis of average vs median */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.info.main, 0.08),
                  mb: 3,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {calculateMedianOpportunitySize(filteredOpportunities) >
                  (filteredOpportunities.length > 0
                    ? totalRevenue / filteredOpportunities.length
                    : 0)
                    ? "Median higher than average suggests a few smaller opportunities pulling the average down."
                    : "Median lower than average suggests a few larger opportunities pulling the average up."}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mt: 3,
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  borderRadius: 2,
                  p: 1.5,
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={500}
                >
                  From {filteredOpportunities.length} opportunities
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: "100%",
              transition: "all 0.3s",
              "&:hover": {
                boxShadow: 6,
                transform: "translateY(-4px)",
              },
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: 3, height: "100%" }}>
              <Typography
                variant="h6"
                fontWeight={700}
                color="primary.main"
                gutterBottom
              >
                Pipeline by Stage
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mt: 2 }}>
                {pipelineByStatus.map((item, index) => (
                  <Box key={item.status} sx={{ mb: 2.5 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      {item.status}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        sx={{
                          mr: 1,
                          color: COLORS[index % COLORS.length],
                        }}
                      >
                        {new Intl.NumberFormat("fr-FR", {
                          style: "percent",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(
                          item.originalValue /
                            (isAllocated ? allocatedRevenue : totalRevenue) ||
                            0
                        )}
                      </Typography>
                      <Chip
                        label={`${item.count} opps`}
                        size="small"
                        sx={{
                          height: "20px",
                          fontSize: "0.7rem",
                          backgroundColor: alpha(
                            COLORS[index % COLORS.length],
                            0.12
                          ),
                          color: COLORS[index % COLORS.length],
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box sx={{ flex: 1, mr: 1 }}>
                      <Box
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          bgcolor: alpha(COLORS[index % COLORS.length], 0.15),
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            height: "100%",
                            width: `${
                              (item.originalValue /
                                (isAllocated ? allocatedRevenue : totalRevenue)) *
                                100 || 0
                            }%`,
                            bgcolor: COLORS[index % COLORS.length],
                            borderRadius: 5,
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(item.originalValue)}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="primary.main"
                      sx={{ mt: 0.5, ml: 1 }}
                    >
                      (I&O: {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(item.calculatedValue)})
                    </Typography>
                  </Box>
                </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts Row */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              height: 400,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <div>
              <Typography variant="h6" gutterBottom fontWeight={600}>
  Pipeline by Status
</Typography>
                <Typography variant="body2" color="text.secondary">
                  Click on chart segments to filter opportunities
                </Typography>
              </div>
              {/* No conditional chips here */}
            </Box>
            <ResponsiveContainer width="100%" height="85%">
            <BarChart
  data={stackedServiceLineData}
  layout="vertical"
  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
  onClick={handleChartClick}
>
  <CartesianGrid
    strokeDasharray="3 3"
    horizontal={true}
    vertical={false}
  />
  <XAxis
    type="number"
    tickFormatter={(value) =>
      new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        notation: "compact",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    }
    axisLine={false}
    tickLine={false}
  />
  <YAxis
    type="category"
    dataKey="name"
    width={150}
    axisLine={false}
    tickLine={false}
    tick={{ fontSize: 12 }}
  />
  <Tooltip content={<StatusChartTooltip />} />
  <Legend />
  <Bar
    dataKey="early"
    name="Early Pipeline"
    stackId="a"
    fill={theme.palette.primary.light}
    radius={[0, 0, 0, 0]}
  />
  <Bar
    dataKey="mid"
    name="Mid Pipeline"
    stackId="a"
    fill={theme.palette.primary.main}
    radius={[0, 0, 0, 0]}
  />
  <Bar
    dataKey="late"
    name="Late Pipeline"
    stackId="a"
    fill={theme.palette.primary.dark}
    radius={[0, 4, 4, 0]}
  />
</BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              height: 400,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <div>
              <Typography variant="h6" gutterBottom fontWeight={600}>
  Pipeline by Service Line
</Typography>
                <Typography variant="body2" color="text.secondary">
                  Distribution of revenue across service lines
                </Typography>
              </div>
              {/* No conditional chips here */}
            </Box>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart
                data={pipelineByServiceLine}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                onClick={handleChartClick}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  type="number"
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      notation: "compact",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(value)
                  }
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="originalValue" name="Revenue" radius={[0, 4, 4, 0]}>
                  {pipelineByServiceLine.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    formatter={(value) => `${value} opps`}
                    style={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        {/* Opportunity List - With increased vertical space and 25 rows by default */}
        <Grid item xs={12}>
          <Box>
          <OpportunityList
  data={filteredOpportunities}
  title={`Pipeline Opportunities`}
  selectedOpportunities={selectedOpportunities}
  onSelectionChange={onSelection}
  resetFilterCallback={
    isAllocated || filteredOpportunities.length !== data.length
      ? () => setFilteredOpportunities(data)
      : null
  }
  isFiltered={
    isAllocated || filteredOpportunities.length !== data.length
  }
  showNetRevenue={showNetRevenue} // Add this line
/>
          </Box>
        </Grid>
      </Grid>
    </Fade>
  );
};

export default PipelineTab;
