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
  Paper,
  Grid,
  Avatar,
  Card,
  CardContent,
  Tabs,
  Tab
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import BusinessIcon from '@mui/icons-material/Business';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import DescriptionIcon from '@mui/icons-material/Description';
import ChatIcon from '@mui/icons-material/Chat';
import InsertCommentIcon from '@mui/icons-material/InsertComment';
import PersonIcon from '@mui/icons-material/Person';
import SendIcon from '@mui/icons-material/Send';

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
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [newAction, setNewAction] = useState({
    description: '',
    owner: '',
    dueDate: getDefaultDueDate(),
    priority: 'medium',
    status: 'open'
  });
  const [editingAction, setEditingAction] = useState(null);
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Load actions and comments from localStorage on mount
  useEffect(() => {
    const savedActions = localStorage.getItem(`opportunity_actions_${opportunityId}`);
    if (savedActions) {
      try {
        setActions(JSON.parse(savedActions));
      } catch (e) {
        console.error('Error loading saved actions', e);
      }
    }
    
    const savedComments = localStorage.getItem(`opportunity_comments_${opportunityId}`);
    if (savedComments) {
      try {
        setComments(JSON.parse(savedComments));
      } catch (e) {
        console.error('Error loading saved comments', e);
      }
    }
  }, [opportunityId]);

  // Save actions and comments to localStorage when they change
  useEffect(() => {
    if (actions.length > 0) {
      localStorage.setItem(`opportunity_actions_${opportunityId}`, JSON.stringify(actions));
    }
  }, [actions, opportunityId]);
  
  useEffect(() => {
    if (comments.length > 0) {
      localStorage.setItem(`opportunity_comments_${opportunityId}`, JSON.stringify(comments));
    }
  }, [comments, opportunityId]);

  const handleAddAction = () => {
    if (!newAction.description || !newAction.owner) return;
    
    const actionToAdd = {
      ...newAction,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      opportunityId,
      opportunityName,
      // Add opportunity details for export
      opportunityEM: opportunityDetails?.EM || 'N/A',
      opportunityEP: opportunityDetails?.EP || 'N/A',
      opportunityManager: opportunityDetails?.Manager || 'N/A',
      opportunityPartner: opportunityDetails?.Partner || 'N/A',
      opportunityAccount: opportunityDetails?.Account || 'N/A',
      opportunityStatus: opportunityDetails?.Status || 'N/A',
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
  
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const commentToAdd = {
      id: Date.now().toString(),
      text: newComment,
      createdAt: new Date().toISOString(),
      author: 'User', // Default value, not collected from user input
    };
    
    setComments([...comments, commentToAdd]);
    setNewComment('');
    setIsAddingComment(false);
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
  
  const handleDeleteComment = (commentId) => {
    setComments(comments.filter(comment => comment.id !== commentId));
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

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Fetch all actions from localStorage
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

  // Group actions by opportunity
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
  
  // Fetch all comments from localStorage
  const getAllOpportunityComments = () => {
    const allComments = [];
    
    // Iterate through localStorage to find all opportunity comments
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('opportunity_comments_')) {
        try {
          const opportunityComments = JSON.parse(localStorage.getItem(key));
          // Add opportunity ID to each comment
          const oppId = key.replace('opportunity_comments_', '');
          const commentsWithOppId = opportunityComments.map(comment => ({
            ...comment,
            opportunityId: oppId
          }));
          allComments.push(...commentsWithOppId);
        } catch (e) {
          console.error(`Error parsing comments for key ${key}`, e);
        }
      }
    }
    
    return allComments;
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch (e) {
      return dateStr;
    }
  };
  
  const formatDateTime = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleString('fr-FR');
    } catch (e) {
      return dateStr;
    }
  };

  const generateMinutes = () => {
    const allActions = getAllOpportunityActions();
    const allComments = getAllOpportunityComments();
    
    // Group actions by client/account first, then by opportunity
    const groupedByClient = {};
    
    allActions.forEach(action => {
      const clientName = action.opportunityAccount || 'Unknown Client';
      
      if (!groupedByClient[clientName]) {
        groupedByClient[clientName] = {};
      }
      
      const oppName = action.opportunityName || `Opportunity ${action.opportunityId}`;
      
      if (!groupedByClient[clientName][oppName]) {
        groupedByClient[clientName][oppName] = {
          actions: [],
          comments: []
        };
      }
      
      groupedByClient[clientName][oppName].actions.push(action);
    });
    
    // Group comments by client/account and opportunity
    allComments.forEach(comment => {
      // Get the opportunity ID from the comment
      const oppId = comment.opportunityId;
      if (!oppId) return;
      
      // Find the matching opportunity in groupedByClient
      let found = false;
      
      Object.entries(groupedByClient).forEach(([clientName, opportunities]) => {
        Object.entries(opportunities).forEach(([oppName, data]) => {
          // Check if any action in this opportunity has the same ID
          if (data.actions.some(action => action.opportunityId === oppId)) {
            if (!data.comments) {
              data.comments = [];
            }
            data.comments.push(comment);
            found = true;
          }
        });
      });
      
      // If not found in existing structure, try to add it
      if (!found) {
        // Try to find the opportunity details to get the client name
        const oppDetails = allActions.find(action => action.opportunityId === oppId);
        const clientName = oppDetails?.opportunityAccount || 'Unknown Client';
        const oppName = oppDetails?.opportunityName || `Opportunity ${oppId}`;
        
        if (!groupedByClient[clientName]) {
          groupedByClient[clientName] = {};
        }
        
        if (!groupedByClient[clientName][oppName]) {
          groupedByClient[clientName][oppName] = {
            actions: [],
            comments: []
          };
        }
        
        groupedByClient[clientName][oppName].comments.push(comment);
      }
    });
    
    let minutes = `# Pipeline Review Action Items\nDate: ${new Date().toLocaleDateString()}\n\n`;
    
    // Iterate through clients
    Object.entries(groupedByClient).forEach(([clientName, opportunities]) => {
      minutes += `## Client: ${clientName}\n\n`;
      
      // Iterate through opportunities for this client
      Object.entries(opportunities).forEach(([oppName, data]) => {
        const oppActions = data.actions;
        const oppComments = data.comments || [];
        
        // Use the first action to get the opportunity details
        const opportunityDetails = oppActions.length > 0 ? oppActions[0] : null;
        
        minutes += `### ${oppName}\n\n`;
        
        // Add opportunity details including ID, EM, EP, Manager, Partner and Status
        if (opportunityDetails) {
          minutes += `**Opportunity ID**: ${opportunityDetails.opportunityId || 'N/A'}\n`;
          minutes += `**Status**: ${opportunityDetails.opportunityStatus || 'N/A'}\n`;
          minutes += `**Engagement Manager**: ${opportunityDetails.opportunityEM || 'N/A'}\n`;
          minutes += `**Engagement Partner**: ${opportunityDetails.opportunityEP || 'N/A'}\n`;
          minutes += `**Manager**: ${opportunityDetails.opportunityManager || 'N/A'}\n`;
          minutes += `**Partner**: ${opportunityDetails.opportunityPartner || 'N/A'}\n\n`;
        }
        
        // Add actions section if there are any
        if (oppActions.length > 0) {
          minutes += `#### Action Items:\n\n`;
          
          oppActions.forEach(action => {
            const priorityLabels = {
              'high': '🔴 High',
              'medium': '🟠 Medium',
              'low': '🟢 Low'
            };
            const priorityText = priorityLabels[action.priority] || action.priority;
            const statusIcon = action.status === 'completed' ? '✅' : '⏳';
            
            minutes += `- ${statusIcon} **${action.description}**\n`;
            minutes += `  - Owner: ${action.owner}\n`;
            minutes += `  - Due Date: ${formatDate(action.dueDate)}\n`;
            minutes += `  - Priority: ${priorityText}\n`;
            minutes += `\n`;
          });
        }
        
        // Add comments section if there are any
        if (oppComments.length > 0) {
          minutes += `#### Comments:\n\n`;
          
          oppComments.forEach(comment => {
            minutes += `- ${comment.author} (${formatDateTime(comment.createdAt)}):\n`;
            minutes += `  "${comment.text}"\n\n`;
          });
        }
      });
    });
    
    // Add general statistics
    minutes += `## Meeting Statistics\n\n`;
    minutes += `- Total Clients Reviewed: ${Object.keys(groupedByClient).length}\n`;
    minutes += `- Total Opportunities Reviewed: ${Object.keys(allActions.reduce((acc, action) => {
      acc[action.opportunityId] = true;
      return acc;
    }, {})).length}\n`;
    minutes += `- Total Action Items: ${allActions.length}\n`;
    minutes += `- Total Comments: ${allComments.length}\n`;
    
    const openActions = allActions.filter(a => a.status === 'open').length;
    const completedActions = allActions.filter(a => a.status === 'completed').length;
    
    minutes += `- Open Action Items: ${openActions}\n`;
    minutes += `- Completed Action Items: ${completedActions}\n`;
    
    // Add high priority actions summary
    const highPriorityActions = allActions.filter(a => a.priority === 'high' && a.status === 'open');
    if (highPriorityActions.length > 0) {
      minutes += `\n## High Priority Action Items Summary\n\n`;
      highPriorityActions.forEach(action => {
        minutes += `- **${action.description}** (Client: ${action.opportunityAccount}, ${action.opportunityName})\n`;
        minutes += `  - Owner: ${action.owner}, Due: ${formatDate(action.dueDate)}\n`;
      });
    }
    
    // Add footer
    minutes += `\n---\n`;
    minutes += `Minutes generated on ${new Date().toLocaleString('fr-FR')}\n`;
    
    return minutes;
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

  // Get initials for avatar
  const getInitials = (name) => {
    return name.split(' ')
      .filter(n => n)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.7)}` }}>
      {/* Tabs for Actions and Comments - Styled like the Total Opportunity Amount header */}
      <Box sx={{ 
        backgroundColor: 'rgb(242, 246, 252)',
        borderRadius: '8px',
        border: '1px solid rgb(230, 235, 244)',
        maxWidth: '95%',
        mx: 'auto',
        p: 2,
        mb: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {activeTab === 0 ? (
            <Typography 
              variant="subtitle1"
              fontWeight={600}
              color="primary.main" 
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setActiveTab(0)}
            >
              <AssignmentIcon fontSize="small" sx={{ mr: 1 }} />
              Actions ({actions.length})
            </Typography>
          ) : (
            <Typography 
              variant="subtitle1"
              fontWeight={500}
              color="text.secondary" 
              sx={{ display: 'flex', alignItems: 'center', mr: 4, cursor: 'pointer' }}
              onClick={() => setActiveTab(0)}
            >
              <AssignmentIcon fontSize="small" sx={{ mr: 1 }} />
              Actions ({actions.length})
            </Typography>
          )}
          
          {activeTab === 1 ? (
            <Typography 
              variant="subtitle1"
              fontWeight={600}
              color="primary.main" 
              sx={{ display: 'flex', alignItems: 'center', ml: 4, cursor: 'pointer' }}
              onClick={() => setActiveTab(1)}
            >
              <ChatIcon fontSize="small" sx={{ mr: 1 }} />
              Comments ({comments.length})
            </Typography>
          ) : (
            <Typography 
              variant="subtitle1"
              fontWeight={500}
              color="text.secondary" 
              sx={{ display: 'flex', alignItems: 'center', ml: 4, cursor: 'pointer' }}
              onClick={() => setActiveTab(1)}
            >
              <ChatIcon fontSize="small" sx={{ mr: 1 }} />
              Comments ({comments.length})
            </Typography>
          )}
        </Box>
        
        <Box>
          {activeTab === 0 && (
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
          )}
          
          {activeTab === 1 && (
            <Button 
              size="small" 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={() => setIsAddingComment(true)}
              color="primary"
            >
              Add Comment
            </Button>
          )}
        </Box>
      </Box>

      {/* Actions Tab Content */}
      {activeTab === 0 && (
        <Box sx={{ maxWidth: '95%', mx: 'auto' }}>
          {/* Action input form - for adding or editing */}
          {(isAddingAction || editingAction) && (
            <Paper elevation={2} sx={{ 
              p: 3, 
              mb: 2, 
              borderRadius: 2, 
              bgcolor: alpha(theme.palette.background.paper, 0.9),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              boxShadow: theme.shadows[3],
              transition: "all 0.3s",
              "&:hover": {
                boxShadow: theme.shadows[6],
                transform: "translateY(-2px)",
              }
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
            <Paper elevation={2} sx={{ 
              borderRadius: 2,
              overflow: 'hidden', 
              boxShadow: theme.shadows[3],
              transition: "all 0.3s",
              "&:hover": {
                boxShadow: theme.shadows[6],
                transform: "translateY(-2px)",
              }
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
                          </Box>
                        }
                        secondary={
                          <Grid container spacing={1}>
                            <Grid item xs={12}>
                              <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                Owner: <b>{action.owner}</b> | Due: <b>{formatDate(action.dueDate)}</b>
                              </Typography>
                            </Grid>
                            <Grid item xs={12}>
                              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
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
                            </Grid>
                          </Grid>
                        }
                      />
                      <ListItemSecondaryAction sx={{ top: '50%', transform: 'translateY(-50%)' }}>
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
              elevation={3}
              sx={{ 
                p: 3, 
                textAlign: 'center', 
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transition: "all 0.3s",
                "&:hover": {
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  transform: "translateY(-2px)",
                }
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
        </Box>
      )}

      {/* Comments Tab Content */}
      {activeTab === 1 && (
        <Box sx={{ maxWidth: '95%', mx: 'auto' }}>
          {/* Comment input form when adding a new comment */}
          {isAddingComment && (
            <Paper elevation={2} sx={{ 
              p: 3, 
              mb: 2, 
              borderRadius: 2, 
              bgcolor: alpha(theme.palette.background.paper, 0.9),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              boxShadow: theme.shadows[3],
              transition: "all 0.3s",
              "&:hover": {
                boxShadow: theme.shadows[6],
                transform: "translateY(-2px)",
              }
            }}>
              <Typography variant="subtitle2" gutterBottom fontWeight={600} color="primary.main">
                New Comment
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add your comment here..."
                  size="small"
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                  <Button 
                    variant="outlined"
                    onClick={() => setIsAddingComment(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SendIcon />}
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                  >
                    Add Comment
                  </Button>
                </Box>
              </Box>
            </Paper>
          )}

          {/* Comments List */}
          {comments.length > 0 ? (
            <Paper 
              elevation={2} 
              sx={{ 
                borderRadius: 2, 
                overflow: 'hidden',
                boxShadow: theme.shadows[3],
                transition: "all 0.3s",
                "&:hover": {
                  boxShadow: theme.shadows[6],
                  transform: "translateY(-2px)",
                }
              }}
            >
              <List disablePadding>
                {comments.map((comment, index) => (
                  <React.Fragment key={comment.id}>
                    {index > 0 && <Divider component="li" />}
                    <ListItem
                      alignItems="flex-start"
                      sx={{
                        py: 2,
                        px: 2,
                        background: index % 2 === 0 
                          ? alpha(theme.palette.background.default, 0.3) 
                          : 'transparent',
                        position: 'relative'
                      }}
                    >
                      <Box sx={{ display: 'flex', width: '100%' }}>
                        <Avatar 
                          sx={{ 
                            bgcolor: theme.palette.primary.main, 
                            width: 36, 
                            height: 36,
                            mr: 2 
                          }}
                        >
                          {getInitials(comment.author)}
                        </Avatar>
                        <Box sx={{ flex: 1, pr: 4 }}> {/* Added right padding to avoid text overlapping with delete button */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {comment.author}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mr: 4 }}> {/* Added margin to avoid overlap */}
                              {formatDateTime(comment.createdAt)}
                            </Typography>
                          </Box>
                          <Typography variant="body2">
                            {comment.text}
                          </Typography>
                        </Box>
                      </Box>

                      <IconButton 
                        aria-label="delete" 
                        size="small"
                        onClick={() => handleDeleteComment(comment.id)}
                        color="error"
                        sx={{ 
                          position: 'absolute', 
                          top: '12px', 
                          right: '12px' 
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          ) : (
            <Paper 
              elevation={comments.length === 0 ? 0 : 2}
              sx={{ 
                p: 3, 
                textAlign: 'center', 
                bgcolor: alpha(theme.palette.background.paper, 0.5),
                borderRadius: 2,
                border: comments.length === 0 ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                boxShadow: comments.length === 0 ? 'none' : theme.shadows[3],
                transition: "all 0.3s",
                "&:hover": {
                  boxShadow: comments.length === 0 ? 'none' : theme.shadows[4],
                  transform: comments.length === 0 ? 'none' : "translateY(-2px)",
                }
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No comments for this opportunity yet
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Add a comment to start the conversation
              </Typography>
            </Paper>
          )}
        </Box>
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
