import React, { useEffect, useState } from "react";
import {
  Paper,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Button,
  Typography,
  Grid,
  useTheme,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import ClearIcon from "@mui/icons-material/Clear";

import { getUniqueValues } from "../utils/dataUtils";

// Select menu props
const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const FilterPanel = ({ data, filters, onFilterChange }) => {
  const [filterOptions, setFilterOptions] = useState({
    manager: [],
    partner: [],
  });

  const theme = useTheme();

  // Initialize filter options when data is loaded
  useEffect(() => {
    if (data.length > 0) {
      setFilterOptions({
        manager: getUniqueValues(data, "Manager"),
        partner: getUniqueValues(data, "Partner"),
      });
    }
  }, [data]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    onFilterChange({ [name]: value });
  };

  const handleDateChange = (index, date) => {
    const newDateRange = [...filters.dateRange];
    newDateRange[index] = date;
    onFilterChange({ dateRange: newDateRange });
  };

  const handleClearFilters = () => {
    onFilterChange({
      dateRange: [null, null],
      manager: [],
      partner: [],
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateRange[0] && filters.dateRange[1]) count++;
    if (filters.manager.length > 0) count++;
    if (filters.partner.length > 0) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Paper
      elevation={2}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        transition: "all 0.3s ease",
        border: "1px solid",
        borderColor: "divider",
        p: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          Filters
          {activeFilterCount > 0 && (
            <Chip
              label={activeFilterCount}
              size="small"
              color="primary"
              sx={{ ml: 1, fontWeight: 600 }}
            />
          )}
        </Typography>

        {activeFilterCount > 0 && (
          <Button
            variant="text"
            color="primary"
            size="small"
            startIcon={<ClearIcon />}
            onClick={handleClearFilters}
          >
            Clear All
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Date Range Filters */}
        <Grid item xs={12} md={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <DatePicker
                  label="From Date"
                  value={filters.dateRange[0]}
                  onChange={(date) => handleDateChange(0, date)}
                  slotProps={{
                    textField: {
                      size: "small",
                      fullWidth: true,
                      variant: "outlined",
                    },
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <DatePicker
                  label="To Date"
                  value={filters.dateRange[1]}
                  onChange={(date) => handleDateChange(1, date)}
                  slotProps={{
                    textField: {
                      size: "small",
                      fullWidth: true,
                      variant: "outlined",
                    },
                  }}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </Grid>

        <Grid item xs={12} md={3}>
          {/* Manager Filter */}
          <FormControl fullWidth>
            <InputLabel id="manager-label">Manager</InputLabel>
            <Select
              labelId="manager-label"
              id="manager"
              multiple
              name="manager"
              value={filters.manager}
              onChange={handleChange}
              input={<OutlinedInput label="Manager" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
              MenuProps={MenuProps}
              size="small"
            >
              {filterOptions.manager.map((option) => (
                <MenuItem key={option} value={option}>
                  <Checkbox
                    checked={filters.manager.indexOf(option) > -1}
                    size="small"
                    color="primary"
                  />
                  <ListItemText primary={option} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Partner Filter */}
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel id="partner-label">Partner</InputLabel>
            <Select
              labelId="partner-label"
              id="partner"
              multiple
              name="partner"
              value={filters.partner}
              onChange={handleChange}
              input={<OutlinedInput label="Partner" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
              MenuProps={MenuProps}
              size="small"
            >
              {filterOptions.partner.map((option) => (
                <MenuItem key={option} value={option}>
                  <Checkbox
                    checked={filters.partner.indexOf(option) > -1}
                    size="small"
                    color="primary"
                  />
                  <ListItemText primary={option} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default FilterPanel;
