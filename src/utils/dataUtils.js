import * as XLSX from "xlsx";

/**
 * Processes an uploaded Excel file
 * @param {ArrayBuffer} fileData - The Excel file data as ArrayBuffer
 * @returns {Promise<Array>} Processed data as an array of objects
 */
export const processExcelData = async (fileData) => {
  try {
    if (!fileData) {
      throw new Error("No file data provided");
    }

    // Parse the Excel file
    const workbook = XLSX.read(fileData, {
      type: "array",
      cellDates: true, // Parse dates correctly
      cellNF: true, // Number formatting
      cellStyles: true, // Colors and formatting
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("Excel file does not contain any sheets");
    }

    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    if (!worksheet) {
      throw new Error("Could not access the worksheet");
    }

    // Convert to JSON with headers
    const data = XLSX.utils.sheet_to_json(worksheet, {
      raw: false, // Format numbers
      dateNF: "yyyy-mm-dd", // Date format
    });

    if (!data || data.length === 0) {
      throw new Error("No data found in the Excel file");
    }

    // Check if the file has the expected structure
    const requiredColumns = ["Opportunity ID", "Status", "Gross Revenue"];
    const missingColumns = requiredColumns.filter(
      (col) => !data[0].hasOwnProperty(col)
    );

    if (missingColumns.length > 0) {
      throw new Error(
        `Excel file is missing required columns: ${missingColumns.join(", ")}`
      );
    }

    // Process and clean the data
    return data.map((row) => {
      // Convert status to number for easier filtering
      if (row.Status && typeof row.Status === "string") {
        row.Status = parseInt(row.Status, 10);
      }

      // Convert revenue to numbers
      if (row["Gross Revenue"] && typeof row["Gross Revenue"] === "string") {
        row["Gross Revenue"] = parseFloat(
          row["Gross Revenue"].replace(/,/g, "")
        );
      }
      if (row["Net Revenue"] && typeof row["Net Revenue"] === "string") {
        row["Net Revenue"] = parseFloat(row["Net Revenue"].replace(/,/g, ""));
      }

      // Convert CM1% to number if it exists
      if (row["CM1%"] && typeof row["CM1%"] === "string") {
        row["CM1%"] = parseFloat(row["CM1%"].replace(/%/g, ""));
      }

      // Ensure service offering percentages are numbers
      if (
        row["Service Offering 1 %"] &&
        typeof row["Service Offering 1 %"] === "string"
      ) {
        row["Service Offering 1 %"] = parseFloat(row["Service Offering 1 %"]);
      }
      if (
        row["Service Offering 2 %"] &&
        typeof row["Service Offering 2 %"] === "string"
      ) {
        row["Service Offering 2 %"] = parseFloat(row["Service Offering 2 %"]);
      }
      if (
        row["Service Offering 3 %"] &&
        typeof row["Service Offering 3 %"] === "string"
      ) {
        row["Service Offering 3 %"] = parseFloat(row["Service Offering 3 %"]);
      }

      return row;
    });
  } catch (error) {
    console.error("Error processing Excel data:", error);
    throw error;
  }
};

/**
 * Gets unique values from a specified column in the data
 * @param {Array} data - The data array
 * @param {string} column - The column name to extract unique values from
 * @returns {Array} Array of unique values
 */
export const getUniqueValues = (data, column) => {
  const values = data
    .map((item) => item[column])
    .filter((value) => value !== undefined && value !== null && value !== "");
  return [...new Set(values)];
};

/**
 * Groups data by a specified column
 * @param {Array} data - The data array
 * @param {string} groupByColumn - The column to group by
 * @returns {Object} Object with groups as keys and arrays as values
 */
export const groupDataBy = (data, groupByColumn) => {
  return data.reduce((acc, item) => {
    const key = item[groupByColumn];
    if (!key) return acc;

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
};

/**
 * Calculates sum of a numeric column in data
 * @param {Array} data - The data array
 * @param {string} column - The column to sum
 * @returns {number} Sum of the column values
 */
export const sumBy = (data, column) => {
  return data.reduce((sum, item) => {
    const value = item[column];
    return sum + (typeof value === "number" ? value : 0);
  }, 0);
};


/**
 * Calculates revenue with segment and service line logic
 * @param {Object} item - The opportunity item
 * @param {boolean} useNetRevenue - Whether to use net revenue instead of gross
 * @returns {number} Calculated revenue
 */
export const calculateRevenueWithSegmentLogic = (item, showNetRevenue = false) => {
  // Check if segment code is AUTO, CLR, or IEM
  const specialSegmentCodes = ["AUTO", "CLR", "IEM"];
  const isSpecialSegmentCode = specialSegmentCodes.includes(
    item["Sub Segment Code"]
  );

  // If special segment code, return full revenue based on toggle
  if (isSpecialSegmentCode) {
    return showNetRevenue ? (item["Net Revenue"] || 0) : (item["Gross Revenue"] || 0);
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

  // Get the base revenue value based on toggle
  const baseRevenue = showNetRevenue ? (item["Net Revenue"] || 0) : (item["Gross Revenue"] || 0);

  // Calculate total allocated revenue for Operations
  const operationsAllocation = serviceLines.reduce((total, service) => {
    if (service.line === "Operations") {
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

/**
 * Groups data by month and year and calculates sum for a specified column
 * @param {Array} data - The data array
 * @param {string} dateColumn - The column containing dates
 * @param {string} valueColumn - The column to sum
 * @returns {Array} Array of { month, year, value } objects
 */
export const getMonthlyYearlyTotals = (data, dateColumn, valueColumn) => {
  const monthlyYearlyData = {};
  const useNetRevenue = valueColumn === 'Net Revenue';

  data.forEach((item) => {
    if (!item[dateColumn]) return;

    const date = new Date(item[dateColumn]);
    const month = date.getMonth();
    const year = date.getFullYear();
    const monthYear = `${month}-${year}`;

    if (!monthlyYearlyData[monthYear]) {
      monthlyYearlyData[monthYear] = {
        month,
        year,
        monthName: new Date(year, month, 1).toLocaleString("default", {
          month: "short",
        }),
        total: 0,
        count: 0,
        opportunities: [],
      };
    }

    // Determine the actual value based on valueColumn
    let actualValue;
    if (valueColumn === 'Calculated I&O') {
      // Use the revenue calculation method with appropriate parameter
      actualValue = calculateRevenueWithSegmentLogic(item, useNetRevenue);
    } else {
      // Use the direct column value
      actualValue = item[valueColumn] || 0;
    }

    monthlyYearlyData[monthYear].total += actualValue;
    monthlyYearlyData[monthYear].count += 1;
    monthlyYearlyData[monthYear].opportunities.push(item);
  });

  // Convert to array
  return Object.values(monthlyYearlyData);
};
/**
 * Formats monthly yearly data for year-over-year comparison charts
 * @param {Array} monthlyYearlyData - Data from getMonthlyYearlyTotals
 * @returns {Array} Formatted data for YoY chart
 */
export const formatYearOverYearData = (monthlyYearlyData) => {
  // Group by month
  const byMonth = {};

  // Get unique years
  const years = [...new Set(monthlyYearlyData.map((item) => item.year))].sort();

  // Group by month
  monthlyYearlyData.forEach((item) => {
    if (!byMonth[item.month]) {
      byMonth[item.month] = {
        month: item.month,
        monthName: item.monthName,
      };

      // Initialize years with zero values
      years.forEach((year) => {
        byMonth[item.month][`${year}`] = 0;
        byMonth[item.month][`${year}Count`] = 0;
        byMonth[item.month][`${year}Opps`] = [];
      });
    }

    // Add values for the specific year
    byMonth[item.month][`${item.year}`] = item.total;
    byMonth[item.month][`${item.year}Count`] = item.count;
    byMonth[item.month][`${item.year}Opps`] = item.opportunities;
  });

  // Convert to array and sort by month
  return Object.values(byMonth).sort((a, b) => a.month - b.month);
};

/**
 * Finds new opportunities based on creation date
 * @param {Array} data - The data array
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Array} Filtered opportunities
 */
export const getNewOpportunities = (data, startDate, endDate) => {
  return data.filter((item) => {
    if (!item["Creation Date"]) return false;

    const creationDate = new Date(item["Creation Date"]);
    return creationDate >= startDate && creationDate <= endDate;
  });
};

/**
 * Finds new wins based on winning date
 * @param {Array} data - The data array
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Array} Filtered opportunities
 */
export const getNewWins = (data, startDate, endDate) => {
  return data.filter((item) => {
    if (!item["Winning Date"] || item["Winning Date"] === "-") return false;

    const winDate = new Date(item["Winning Date"]);
    return winDate >= startDate && winDate <= endDate;
  });
};

/**
 * Finds new losses based on lost date
 * @param {Array} data - The data array
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Array} Filtered opportunities
 */
export const getNewLosses = (data, startDate, endDate) => {
  console.log("Getting Lost Opportunities:");
  console.log("Total data length:", data.length);
  console.log("Date Range:", startDate, endDate);

  const lostOpportunities = data.filter((item) => {
    // Log each item's details
    console.log("Checking opportunity:", {
      opportunityId: item["Opportunity ID"],
      status: item["Status"],
      lostDate: item["Lost Date"],
    });

    // Check if the opportunity is lost (status 15)
    if (item["Status"] !== 15) {
      console.log("Not a lost opportunity (status not 15)");
      return false;
    }

    // Check if lost date exists and is a valid date
    if (!item["Lost Date"] || item["Lost Date"] === "-") {
      console.log("No valid lost date");
      return false;
    }

    const lostDate = new Date(item["Lost Date"]);

    // Check if lost date is within the specified range
    const isInRange = lostDate >= startDate && lostDate <= endDate;

    console.log("Is in date range:", isInRange);

    return isInRange;
  });

  console.log("Lost opportunities found:", lostOpportunities.length);
  return lostOpportunities;
};
