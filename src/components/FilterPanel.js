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
  TextField,
  Autocomplete,
} from "@mui/material";
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
    accounts: [],
  });

  const theme = useTheme();

  // Initialize filter options when data is loaded
  useEffect(() => {
    if (data.length > 0) {
      setFilterOptions({
        manager: getUniqueValues(data, "Manager"),
        partner: getUniqueValues(data, "Partner"),
        accounts: getUniqueValues(data, "Account"),
      });
    }
  }, [data]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    onFilterChange({ [name]: value });
  };

  const handleAccountChange = (event, newValue) => {
    onFilterChange({ accounts: newValue || [] });
  };

  const handleClearFilters = () => {
    onFilterChange({
      accounts: [],
      manager: [],
      partner: [],
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.accounts && filters.accounts.length > 0) count++;
    if (filters.manager && filters.manager.length > 0) count++;
    if (filters.partner && filters.partner.length > 0) count++;
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

        {/* Fixed-width container for the Clear All button */}
        <Box sx={{ minWidth: "90px", textAlign: "right" }}>
          {activeFilterCount > 0 ? (
            <Button
              variant="text"
              color="primary"
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
            >
              Clear All
            </Button>
          ) : (
            /* Placeholder to maintain spacing when button is not visible */
            <Box sx={{ visibility: "hidden", width: "90px", height: "32px" }} />
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Account Filter */}
        <Grid item xs={12}>
          <Autocomplete
            multiple
            id="account-filter"
            options={filterOptions.accounts || []}
            value={filters.accounts || []}
            onChange={handleAccountChange}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  key={option}
                  label={option}
                  {...getTagProps({ index })}
                  size="small"
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Accounts"
                variant="outlined"
                placeholder="Select accounts"
                fullWidth
              />
            )}
            filterSelectedOptions
          />
        </Grid>

        {/* Manager Filter */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel id="manager-label">Manager</InputLabel>
            <Select
              labelId="manager-label"
              id="manager"
              multiple
              name="manager"
              value={filters.manager || []}
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
            >
              {filterOptions.manager.map((option) => (
                <MenuItem key={option} value={option}>
                  <Checkbox
                    checked={(filters.manager || []).indexOf(option) > -1}
                  />
                  <ListItemText primary={option} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Partner Filter */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel id="partner-label">Partner</InputLabel>
            <Select
              labelId="partner-label"
              id="partner"
              multiple
              name="partner"
              value={filters.partner || []}
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
            >
              {filterOptions.partner.map((option) => (
                <MenuItem key={option} value={option}>
                  <Checkbox
                    checked={(filters.partner || []).indexOf(option) > -1}
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
