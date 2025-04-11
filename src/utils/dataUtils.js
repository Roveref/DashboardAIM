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
 * Groups data by month and year and calculates sum for a specified column
 * @param {Array} data - The data array
 * @param {string} dateColumn - The column containing dates
 * @param {string} valueColumn - The column to sum
 * @returns {Array} Array of { month, year, value } objects
 */
export const getMonthlyYearlyTotals = (data, dateColumn, valueColumn) => {
  const monthlyYearlyData = {};

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

    const value = item[valueColumn];
    // If we're using allocated revenue, use that. Otherwise use the original value
    const actualValue =
      item["Is Allocated"] && item["Allocated " + valueColumn]
        ? item["Allocated " + valueColumn]
        : typeof value === "number"
        ? value
        : 0;

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

/**
 * Processes an uploaded Excel file with staffing data
 * @param {ArrayBuffer} fileData - The Excel file data as ArrayBuffer
 * @returns {Object} Processed staffing data with employees, periods, and calculated utilization rates
 */
export const processStaffingData = async (fileData) => {
  try {
    if (!fileData) {
      throw new Error("No staffing file data provided");
    }

    // Parse the Excel file
    const workbook = XLSX.read(fileData, {
      type: "array",
      cellDates: true, // Parse dates correctly
      cellNF: true, // Number formatting
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("Excel file does not contain any sheets");
    }

    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to JSON with headers
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false, // Format numbers
      dateNF: "yyyy-mm-dd", // Date format
    });

    if (!rawData || rawData.length === 0) {
      throw new Error("No data found in the staffing Excel file");
    }

    // Process the data to extract employees, periods, and calculate utilization
    // First, determine the column headers (periods)
    const firstRow = rawData[0];
    // The first column should be the employee name or ID, so we skip it
    const periodColumns = Object.keys(firstRow).filter(
      (key) => key !== "__EMPTY" && !key.startsWith("__EMPTY")
    );

    // Extract periods (column headers after employee info)
    const periods = periodColumns.map((column) => ({
      id: column,
      label: column, // We can format this if needed
    }));

    // Process employee data
    // We expect pairs of rows - one for chargeable hours and one for total hours
    const employees = [];
    const utilizationData = [];
    const segmentData = {}; // Store data by segment for filtering

    // First check if we have specialized row pattern with "Ch" (for chargeable) and "Total"
    let isSpecialFormat = false;
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i];
      const firstCol = row.__EMPTY;
      if (firstCol === "Ch" || firstCol === "Total") {
        isSpecialFormat = true;
        break;
      }
    }

    // First pass: identify if we have columns for employee details
    let nomColumnIdx = -1;
    let equipeColumnIdx = -1;
    let roleColumnIdx = -1;
    let segmentColumnIdx = -1;
    const headerRow = rawData[0];

    // Check for employee data columns
    Object.keys(headerRow).forEach((key) => {
      if (key.startsWith("__EMPTY_")) {
        const headerValue = headerRow[key];
        if (headerValue && typeof headerValue === "string") {
          const headerLower = headerValue.toLowerCase();
          if (headerLower === "nom" || headerLower.includes("nom")) {
            nomColumnIdx = parseInt(key.replace("__EMPTY_", ""));
          } else if (
            headerLower === "equipe" ||
            headerLower.includes("equipe")
          ) {
            equipeColumnIdx = parseInt(key.replace("__EMPTY_", ""));
          } else if (headerLower === "role" || headerLower.includes("role")) {
            roleColumnIdx = parseInt(key.replace("__EMPTY_", ""));
          } else if (
            headerLower === "segment" ||
            headerLower.includes("segment") ||
            headerLower === "clr" ||
            headerLower.includes("clr")
          ) {
            segmentColumnIdx = parseInt(key.replace("__EMPTY_", ""));
          }
        }
      }
    });

    // Initialize CLR segment explicitly
    segmentData.CLR = {
      employees: [],
      utilizationData: [],
      // Will calculate team averages later
    };

    // For special format (Ch/Total), handle differently
    if (isSpecialFormat) {
      // Process in pairs - find all ch/total pairs
      const employeePairs = [];

      for (let i = 0; i < rawData.length - 1; i++) {
        const row1 = rawData[i];
        const row2 = rawData[i + 1];

        if (row1.__EMPTY === "Ch" && row2.__EMPTY === "Total") {
          employeePairs.push({
            chargeableRow: row1,
            totalRow: row2,
            // Try to get employee name from a nearby row if exists
            employeeName:
              i > 0
                ? rawData[i - 1].__EMPTY ||
                  `Employee ${employeePairs.length + 1}`
                : `Employee ${employeePairs.length + 1}`,
          });
          i++; // Skip the total row in next iteration
        }
      }

      // Now process each employee pair
      employeePairs.forEach((pair, index) => {
        const { chargeableRow, totalRow, employeeName } = pair;

        // Get employee segment if available
        let segment = "Unknown";
        if (segmentColumnIdx > 0) {
          // Try to get segment from a row above the chargeable row
          const possibleSegmentRow = index > 0 ? rawData[index * 2 - 1] : null;
          if (
            possibleSegmentRow &&
            possibleSegmentRow[`__EMPTY_${segmentColumnIdx}`]
          ) {
            segment = possibleSegmentRow[`__EMPTY_${segmentColumnIdx}`];
          }
        }

        // For CLR filtering - check if segment contains CLR
        const isCLR = segment.toString().toUpperCase().includes("CLR");

        const employee = {
          id: employeeName,
          name: employeeName,
          nom: employeeName,
          equipe: "N/A", // We don't have this info in this format
          role: "N/A", // We don't have this info in this format
          segment: segment,
          isCLR: isCLR,
        };

        employees.push(employee);

        // Calculate utilization rates for each period
        const employeeData = {
          employeeId: employeeName,
          nom: employeeName,
          equipe: "N/A",
          role: "N/A",
          segment,
          isCLR,
          periods: [],
        };

        periodColumns.forEach((period) => {
          const chargeableHours = parseFloat(chargeableRow[period]) || 0;
          const totalHours = parseFloat(totalRow[period]) || 0;
          const utilizationRate =
            totalHours > 0 ? (chargeableHours / totalHours) * 100 : 0;

          employeeData.periods.push({
            periodId: period,
            chargeableHours,
            totalHours,
            utilizationRate: parseFloat(utilizationRate.toFixed(2)),
          });
        });

        utilizationData.push(employeeData);

        // Store by segment for filtering
        if (!segmentData[segment]) {
          segmentData[segment] = {
            employees: [],
            utilizationData: [],
          };
        }

        segmentData[segment].employees.push(employee);
        segmentData[segment].utilizationData.push(employeeData);

        // Add to CLR segment if applicable
        if (isCLR) {
          segmentData.CLR.employees.push(employee);
          segmentData.CLR.utilizationData.push(employeeData);
        }
      });
    } else {
      // Standard format processing - pairs of consecutive rows
      for (let i = 0; i < rawData.length; i += 2) {
        if (i + 1 >= rawData.length) break; // Skip if we don't have a pair

        const chargeableRow = rawData[i];
        const totalRow = rawData[i + 1];

        // Get employee name/info from the relevant columns
        const employeeId = chargeableRow.__EMPTY || `Employee ${i / 2 + 1}`;

        // Get employee details from appropriate columns
        let nom = employeeId;
        let equipe = "N/A";
        let role = "N/A";
        let segment = "Unknown";

        if (nomColumnIdx > 0) {
          nom = chargeableRow[`__EMPTY_${nomColumnIdx}`] || employeeId;
        }

        if (equipeColumnIdx > 0) {
          equipe = chargeableRow[`__EMPTY_${equipeColumnIdx}`] || "N/A";
        }

        if (roleColumnIdx > 0) {
          role = chargeableRow[`__EMPTY_${roleColumnIdx}`] || "N/A";
        }

        if (segmentColumnIdx > 0) {
          segment = chargeableRow[`__EMPTY_${segmentColumnIdx}`] || "Unknown";
        }

        // Check if this is a row with employee data (should have numeric values in period columns)
        if (
          !periodColumns.some((col) => !isNaN(parseFloat(chargeableRow[col])))
        ) {
          continue; // Skip rows that don't have numeric data
        }

        // For CLR filtering - add data to CLR segment if segment contains CLR
        const isCLR = segment.toString().toUpperCase().includes("CLR");

        const employee = {
          id: employeeId,
          name: nom,
          nom: nom,
          equipe: equipe,
          role: role,
          segment: segment,
          isCLR: isCLR,
        };

        employees.push(employee);

        // Calculate utilization rates for each period
        const employeeData = {
          employeeId,
          nom,
          equipe,
          role,
          segment,
          isCLR,
          periods: [],
        };

        periodColumns.forEach((period) => {
          const chargeableHours = parseFloat(chargeableRow[period]) || 0;
          const totalHours = parseFloat(totalRow[period]) || 0;
          const utilizationRate =
            totalHours > 0 ? (chargeableHours / totalHours) * 100 : 0;

          employeeData.periods.push({
            periodId: period,
            chargeableHours,
            totalHours,
            utilizationRate: parseFloat(utilizationRate.toFixed(2)),
          });
        });

        utilizationData.push(employeeData);

        // Store by segment for filtering
        if (!segmentData[segment]) {
          segmentData[segment] = {
            employees: [],
            utilizationData: [],
          };
        }

        segmentData[segment].employees.push(employee);
        segmentData[segment].utilizationData.push(employeeData);

        // Add to CLR segment if applicable
        if (isCLR) {
          segmentData.CLR.employees.push(employee);
          segmentData.CLR.utilizationData.push(employeeData);
        }
      }
    }

    // Calculate team averages for each period - overall and by segment
    const calculateTeamAverages = (utilizationDataSet) => {
      return periods.map((period) => {
        const periodData = utilizationDataSet
          .map((emp) => emp.periods.find((p) => p.periodId === period.id))
          .filter((p) => p); // Filter out undefined values

        const totalChargeable = periodData.reduce(
          (sum, p) => sum + p.chargeableHours,
          0
        );
        const totalHours = periodData.reduce((sum, p) => sum + p.totalHours, 0);
        const avgUtilization =
          totalHours > 0 ? (totalChargeable / totalHours) * 100 : 0;

        return {
          periodId: period.id,
          totalChargeableHours: totalChargeable,
          totalAvailableHours: totalHours,
          averageUtilizationRate: parseFloat(avgUtilization.toFixed(2)),
        };
      });
    };

    // Calculate overall team averages
    const teamAverages = calculateTeamAverages(utilizationData);

    // Calculate segment-specific team averages
    Object.keys(segmentData).forEach((segment) => {
      segmentData[segment].teamAverages = calculateTeamAverages(
        segmentData[segment].utilizationData
      );
    });

    return {
      employees,
      periods,
      utilizationData,
      teamAverages,
      segmentData, // Include segment data for filtering
      rawData,
    };
  } catch (error) {
    console.error("Error processing staffing Excel data:", error);
    throw error;
  }
};
