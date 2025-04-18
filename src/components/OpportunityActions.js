// OpportunityActions.js
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction,
  Divider,
  Chip,
  alpha,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

// Define priority options with colors
const PRIORITIES = [
  { value: 'high', label: 'High', color: 'error' },
  { value: 'medium', label: 'Medium', color: 'warning' },
  { value: 'low', label: 'Low', color: 'info' }
];

// Default due date - 2 weeks from now
const getDefaultDueDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().split('T')[0];
};

/**
 * Component for managing actions for an opportunity
 */
const OpportunityActions = ({ opportunityId, opportunityName, opportunityDetails }) => {
  const theme = useTheme();
  const [actions, setActions] = useState([]);
  const [newAction, setNewAction] = useState({
    description: '',
    owner: '',
    dueDate: getDefaultDueDate(),
    priority: 'medium',
    status: 'open'
  });
  const [editingAction, setEditingAction] = useState(null);
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Load actions from localStorage on mount
  useEffect(() => {
    const savedActions = localStorage.getItem(`opportunity_actions_${opportunityId}`);
    if (savedActions) {
      try {
        setActions(JSON.parse(savedActions));
      } catch (e) {
        console.error('Error loading saved actions', e);
      }
    }
  }, [opportunityId]);

  // Save actions to localStorage when they change
  useEffect(() => {
    if (actions.length > 0) {
      localStorage.setItem(`opportunity_actions_${opportunityId}`, JSON.stringify(actions));
    }
  }, [actions, opportunityId]);

  const handleAddAction = () => {
    if (!newAction.description || !newAction.owner) return;
    
    const actionToAdd = {
      ...newAction,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      opportunityId,
      opportunityName,
      // Add opportunity details for export
      opportunityEM: opportunityDetails?.EM || '',
      opportunityEP: opportunityDetails?.EP || '',
    };
    
    setActions([...actions, actionToAdd]);
    setNewAction({
      description: '',
      owner: '',
      dueDate: getDefaultDueDate(),
      priority: 'medium',
      status: 'open'
    });
    setIsAddingAction(false);
  };

  const handleUpdateAction = () => {
    if (!editingAction || !editingAction.description || !editingAction.owner) return;
    
    setActions(actions.map(action => 
      action.id === editingAction.id ? editingAction : action
    ));
    setEditingAction(null);
  };

  const handleDeleteAction = (actionId) => {
    setActions(actions.filter(action => action.id !== actionId));
    if (editingAction && editingAction.id === actionId) {
      setEditingAction(null);
    }
  };

  const handleEditAction = (action) => {
    setEditingAction({ ...action });
    setIsAddingAction(false);
  };

  const handleToggleStatus = (actionId) => {
    setActions(actions.map(action => 
      action.id === actionId 
        ? { ...action, status: action.status === 'open' ? 'completed' : 'open' } 
        : action
    ));
  };

  const generateMinutes = () => {
    const allActions = getAllOpportunityActions();
    const groupedByOpportunity = groupActionsByOpportunity(allActions);
    
    let minutes = `# Pipeline Review Action Items\nDate: ${new Date().toLocaleDateString()}\n\n`;
    
    Object.entries(groupedByOpportunity).forEach(([oppName, oppActions]) => {
      // Use the first action to get the opportunity details
      const opportunityDetails = oppActions.length > 0 ? oppActions[0] : null;
      
      minutes += `## ${oppName}\n\n`;
      
      // Add opportunity ID, EM and EP information if available
      if (opportunityDetails) {
        minutes += `**Opportunity ID**: ${opportunityDetails.opportunityId || 'N/A'}\n`;
        minutes += `**Engagement Manager**: ${opportunityDetails.opportunityEM || 'N/A'}\n`;
        minutes += `**Engagement Partner**: ${opportunityDetails.opportunityEP || 'N/A'}\n\n`;
      }
      
      oppActions.forEach(action => {
        const priorityText = PRIORITIES.find(p => p.value === action.priority)?.label || action.priority;
        minutes += `* **${action.description}**\n`;
        minutes += `  * Owner: ${action.owner}\n`;
        minutes += `  * Due Date: ${formatDate(action.dueDate)}\n`;
        minutes += `  * Priority: ${priorityText}\n`;
        minutes += `  * Status: ${action.status === 'completed' ? '✅ Completed' : '⏳ Open'}\n\n`;
      });
    });
    
    return minutes;
  };

  const getAllOpportunityActions = () => {
    const allActions = [];
    
    // Iterate through localStorage to find all opportunity actions
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('opportunity_actions_')) {
        try {
          const opportunityActions = JSON.parse(localStorage.getItem(key));
          allActions.push(...opportunityActions);
        } catch (e) {
          console.error(`Error parsing actions for key ${key}`, e);
        }
      }
    }
    
    return allActions;
  };

  const groupActionsByOpportunity = (actions) => {
    return actions.reduce((acc, action) => {
      const oppName = action.opportunityName || `Opportunity ${action.opportunityId}`;
      if (!acc[oppName]) {
        acc[oppName] = [];
      }
      acc[oppName].push(action);
      return acc;
    }, {});
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch (e) {
      return dateStr;
    }
  };

  const downloadMinutes = () => {
    const minutes = generateMinutes();
    const element = document.createElement('a');
    const file = new Blob([minutes], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `pipeline_review_minutes_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    setIsExportDialogOpen(false);
  };

  const getStatusIcon = (status) => {
    return status === 'completed' 
      ? <CheckCircleOutlineIcon fontSize="small" color="success" />
      : <RadioButtonUncheckedIcon fontSize="small" color="action" />;
  };

  return (
    <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.7)}` }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2,
        backgroundColor: alpha(theme.palette.primary.main, 0.04),
        borderRadius: '8px 8px 0 0',
        p: 2
      }}>
        <Typography 
          variant="subtitle2" 
          color="primary.dark" 
          fontWeight={700} 
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <AssignmentIcon fontSize="small" sx={{ mr: 1 }} />
          Action Items ({actions.length})
        </Typography>
        
        <Box>
          {actions.length > 0 && (
            <Button 
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => setIsExportDialogOpen(true)}
              sx={{ mr: 1 }}
            >
              Export
            </Button>
          )}
          <Button 
            size="small" 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => {
              setIsAddingAction(true);
              setEditingAction(null);
            }}
            color="primary"
          >
            Add Action
          </Button>
        </Box>
      </Box>

      {/* Action input form - for adding or editing */}
      {(isAddingAction || editingAction) && (
        <Paper elevation={1} sx={{ 
          p: 3, 
          mb: 2, 
          borderRadius: 2, 
          bgcolor: alpha(theme.palette.background.paper, 0.9),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`
        }}>
          <Typography variant="subtitle2" gutterBottom fontWeight={600} color="primary.main">
            {editingAction ? 'Edit Action Item' : 'New Action Item'}
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Description"
              fullWidth
              variant="outlined"
              value={editingAction ? editingAction.description : newAction.description}
              onChange={(e) => editingAction 
                ? setEditingAction({...editingAction, description: e.target.value})
                : setNewAction({...newAction, description: e.target.value})
              }
              placeholder="Describe the action to be taken..."
              size="small"
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Owner"
                variant="outlined"
                value={editingAction ? editingAction.owner : newAction.owner}
                onChange={(e) => editingAction 
                  ? setEditingAction({...editingAction, owner: e.target.value})
                  : setNewAction({...newAction, owner: e.target.value})
                }
                placeholder="Who is responsible for this action?"
                size="small"
                sx={{ flex: 1 }}
              />
              
              <TextField
                label="Due Date"
                type="date"
                variant="outlined"
                value={editingAction ? editingAction.dueDate : newAction.dueDate}
                onChange={(e) => editingAction 
                  ? setEditingAction({...editingAction, dueDate: e.target.value})
                  : setNewAction({...newAction, dueDate: e.target.value})
                }
                size="small"
                sx={{ width: '160px' }}
                InputLabelProps={{ shrink: true }}
              />
              
              <FormControl size="small" sx={{ width: '140px' }}>
                <InputLabel id="priority-label">Priority</InputLabel>
                <Select
                  labelId="priority-label"
                  label="Priority"
                  value={editingAction ? editingAction.priority : newAction.priority}
                  onChange={(e) => editingAction 
                    ? setEditingAction({...editingAction, priority: e.target.value})
                    : setNewAction({...newAction, priority: e.target.value})
                  }
                >
                  {PRIORITIES.map(priority => (
                    <MenuItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
              <Button 
                variant="outlined"
                onClick={() => {
                  setIsAddingAction(false);
                  setEditingAction(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={editingAction ? handleUpdateAction : handleAddAction}
              >
                {editingAction ? 'Update' : 'Save'}
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Actions list */}
      {actions.length > 0 ? (
        <Paper elevation={1} sx={{ 
          borderRadius: 2,
          overflow: 'hidden', 
          boxShadow: `0 2px 8px ${alpha(theme.palette.divider, 0.4)}`
        }}>
          <List disablePadding>
            {actions.map((action, index) => (
              <React.Fragment key={action.id}>
                {index > 0 && <Divider component="li" />}
                <ListItem 
                  alignItems="flex-start"
                  sx={{ 
                    py: 1.5, 
                    px: 2,
                    opacity: action.status === 'completed' ? 0.75 : 1,
                    textDecoration: action.status === 'completed' ? 'line-through' : 'none',
                    background: action.status === 'completed' 
                      ? alpha(theme.palette.success.light, 0.05) 
                      : index % 2 === 0 ? alpha(theme.palette.background.default, 0.3) : 'transparent',
                    transition: 'background-color 0.2s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.05)
                    }
                  }}
                  onClick={() => handleToggleStatus(action.id)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mr: 1.5, pt: 0.5 }}>
                    {getStatusIcon(action.status)}
                  </Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
                        <Typography 
                          variant="body2" 
                          fontWeight={600}
                          sx={{ mr: 1, maxWidth: '70%', wordBreak: 'break-word' }}
                        >
                          {action.description}
                        </Typography>
                        <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          <Chip
                            label={action.status === 'completed' ? 'Completed' : 'Open'}
                            size="small"
                            color={action.status === 'completed' ? 'success' : 'default'}
                            variant="outlined"
                            sx={{ 
                              height: '22px', 
                              fontSize: '0.7rem',
                              borderRadius: '4px',
                              '& .MuiChip-label': { px: 1 } 
                            }}
                          />
                          {action.priority && (
                            <Chip
                              label={PRIORITIES.find(p => p.value === action.priority)?.label || action.priority}
                              size="small"
                              color={PRIORITIES.find(p => p.value === action.priority)?.color || 'default'}
                              variant="outlined"
                              sx={{ 
                                height: '22px', 
                                fontSize: '0.7rem',
                                borderRadius: '4px',
                                '& .MuiChip-label': { px: 1 } 
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    }
                    secondary={
                      <React.Fragment>
                        <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          Owner: <b>{action.owner}</b> | Due: <b>{formatDate(action.dueDate)}</b>
                        </Typography>
                      </React.Fragment>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      aria-label="edit" 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditAction(action);
                      }}
                      sx={{ mr: 0.5 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      edge="end" 
                      aria-label="delete" 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAction(action.id);
                      }}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      ) : (
        <Paper 
          elevation={1}
          sx={{ 
            p: 3, 
            textAlign: 'center', 
            bgcolor: alpha(theme.palette.background.paper, 0.5),
            border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
            borderRadius: 2
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No actions for this opportunity yet
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Click "Add Action" to create an action item
          </Typography>
        </Paper>
      )}

      {/* Export Dialog */}
      <Dialog
        open={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        aria-labelledby="export-dialog-title"
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
          }
        }}
      >
        <DialogTitle id="export-dialog-title" sx={{ pb: 1 }}>
          Export Actions
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Do you want to export just the actions for this opportunity, or all actions from all opportunities?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setIsExportDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={downloadMinutes} 
            color="primary" 
            variant="contained" 
            startIcon={<DownloadIcon />}
          >
            Export All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OpportunityActions;
