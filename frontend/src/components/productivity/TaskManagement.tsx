import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Tooltip,
  LinearProgress,
  InputAdornment,
  Grid,
  ListItemButton,
  ListItemIcon as MuiListItemIcon,
  ListItemText as MuiListItemText,
  FormControlLabel,
  Switch,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Flag as FlagIcon,
  Sort as SortIcon,
  FilterList as FilterIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface Patient {
  id: string;
  name: string;
  roomNumber?: string;
  ward?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  status: 'todo' | 'in_progress' | 'completed';
  assignedTo?: string;
  tags: string[];
  progress: number;
  createdAt: string;
  updatedAt: string;
  category: 'patient_care' | 'admin' | 'lab' | 'medication' | 'consultation' | 'other';
  patientId?: string;
  patientName?: string;
  urgencyLevel: 'routine' | 'urgent' | 'emergency';
  estimatedDuration: number; // in minutes
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time?: string;
    daysOfWeek?: number[];
  };
  dependencies?: string[]; // IDs of tasks that must be completed first
  completionNotes?: string;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;
}

interface TaskTemplate {
  id: string;
  name: string;
  category: Task['category'];
  description: string;
  estimatedDuration: number;
  priority: Task['priority'];
  checklist: Array<{
    id: string;
    text: string;
    required: boolean;
  }>;
}

const TaskManagement: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('dueDate');
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [checklistItems, setChecklistItems] = useState<Array<{ id: string; text: string; completed: boolean }>>([]);

  useEffect(() => {
    fetchTasks();
    fetchTemplates();
    fetchPatients();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      const data = await response.json();
      setTasks(data.tasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/task-templates');
      const data = await response.json();
      setTemplates(data.templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients');
      const data = await response.json();
      setPatients(data.patients);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    }
  };

  const handleCreateTask = async (taskData: Partial<Task>) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      const data = await response.json();
      setTasks([...tasks, data.task]);
      setOpenDialog(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await response.json();
      setTasks(tasks.map(task => task.id === taskId ? { ...task, ...updates } : task));
      setEditingTask(null);
      setOpenDialog(false);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(tasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setTasks(items);
  };

  const handleTemplateSelect = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    setChecklistItems(template.checklist.map(item => ({
      id: item.id,
      text: item.text,
      completed: false
    })));
    setOpenDialog(true);
  };

  const filteredTasks = tasks
    .filter(task => {
      if (filter === 'all') return true;
      return task.status === filter;
    })
    .filter(task =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'progress':
          return b.progress - a.progress;
        default:
          return 0;
      }
    });

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Tasks</Typography>
        <Box display="flex" gap={2}>
          <TextField
            size="small"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  🔍
                </InputAdornment>
              )
            }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Filter</InputLabel>
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              label="Filter"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="todo">To Do</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              label="Sort By"
            >
              <MenuItem value="dueDate">Due Date</MenuItem>
              <MenuItem value="priority">Priority</MenuItem>
              <MenuItem value="progress">Progress</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setShowTemplates(true)}
          >
            Use Template
          </Button>
        </Box>
      </Box>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="tasks">
          {(provided) => (
            <List {...provided.droppableProps} ref={provided.innerRef}>
              {filteredTasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(provided) => (
                    <Paper
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      sx={{ mb: 2 }}
                    >
                      <ListItem>
                        <ListItemIcon>
                          <AssignmentIcon color={
                            task.status === 'completed' ? 'success' :
                            task.status === 'in_progress' ? 'info' : 'action'
                          } />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              {task.title}
                              <Chip
                                size="small"
                                label={task.priority}
                                color={
                                  task.priority === 'high' ? 'error' :
                                  task.priority === 'medium' ? 'warning' : 'info'
                                }
                              />
                              {task.tags.map(tag => (
                                <Chip
                                  key={tag}
                                  size="small"
                                  label={tag}
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {task.description}
                              </Typography>
                              <Box display="flex" alignItems="center" gap={2} mt={1}>
                                <Tooltip title="Due Date">
                                  <Box display="flex" alignItems="center" gap={0.5}>
                                    <ScheduleIcon fontSize="small" />
                                    <Typography variant="caption">
                                      {new Date(task.dueDate).toLocaleDateString()}
                                    </Typography>
                                  </Box>
                                </Tooltip>
                                {task.assignedTo && (
                                  <Tooltip title="Assigned To">
                                    <Chip
                                      size="small"
                                      label={task.assignedTo}
                                      variant="outlined"
                                    />
                                  </Tooltip>
                                )}
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={task.progress}
                                sx={{ mt: 1 }}
                              />
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => {
                              setEditingTask(task);
                              setOpenDialog(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </Paper>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </List>
          )}
        </Droppable>
      </DragDropContext>

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => {
          setEditingTask(null);
          setOpenDialog(true);
        }}
      >
        <AddIcon />
      </Fab>

      <Dialog
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Task Templates</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {templates.map(template => (
              <Grid item xs={12} sm={6} key={template.id}>
                <Paper
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <Typography variant="h6">{template.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {template.description}
                  </Typography>
                  <Box display="flex" gap={1} mt={1}>
                    <Chip
                      size="small"
                      label={template.category}
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={`${template.estimatedDuration} min`}
                      color="secondary"
                      variant="outlined"
                    />
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplates(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setEditingTask(null);
          setSelectedTemplate(null);
          setChecklistItems([]);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingTask ? 'Edit Task' : selectedTemplate ? `New Task from Template: ${selectedTemplate.name}` : 'Create New Task'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Title"
              fullWidth
              defaultValue={editingTask?.title}
              required
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              defaultValue={editingTask?.description}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    label="Priority"
                    defaultValue={editingTask?.priority || 'medium'}
                  >
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Due Date"
                  type="date"
                  fullWidth
                  defaultValue={editingTask?.dueDate?.split('T')[0]}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            <TextField
              label="Assigned To"
              fullWidth
              defaultValue={editingTask?.assignedTo}
            />
            <TextField
              label="Tags (comma separated)"
              fullWidth
              defaultValue={editingTask?.tags.join(', ')}
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                defaultValue={editingTask?.category || selectedTemplate?.category || 'patient_care'}
              >
                <MenuItem value="patient_care">Patient Care</MenuItem>
                <MenuItem value="admin">Administrative</MenuItem>
                <MenuItem value="lab">Laboratory</MenuItem>
                <MenuItem value="medication">Medication</MenuItem>
                <MenuItem value="consultation">Consultation</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Urgency Level</InputLabel>
              <Select
                label="Urgency Level"
                defaultValue={editingTask?.urgencyLevel || 'routine'}
              >
                <MenuItem value="routine">Routine</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
                <MenuItem value="emergency">Emergency</MenuItem>
              </Select>
            </FormControl>
            <Autocomplete
              options={patients}
              getOptionLabel={(patient) => `${patient.name} ${patient.roomNumber ? `(Room ${patient.roomNumber})` : ''}`}
              renderInput={(params) => <TextField {...params} label="Link to Patient" />}
              defaultValue={patients.find(p => p.id === editingTask?.patientId) || null}
            />
            <TextField
              label="Estimated Duration (minutes)"
              type="number"
              defaultValue={editingTask?.estimatedDuration || selectedTemplate?.estimatedDuration || 30}
              inputProps={{ min: 5, step: 5 }}
            />
            <FormControl fullWidth>
              <FormControlLabel
                control={<Switch />}
                label="Recurring Task"
              />
            </FormControl>
            {checklistItems.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>Checklist</Typography>
                <List>
                  {checklistItems.map((item) => (
                    <ListItem key={item.id} disablePadding>
                      <ListItemButton onClick={() => {
                        setChecklistItems(items =>
                          items.map(i =>
                            i.id === item.id ? { ...i, completed: !i.completed } : i
                          )
                        );
                      }}>
                        <MuiListItemIcon>
                          <Checkbox
                            edge="start"
                            checked={item.completed}
                            tabIndex={-1}
                            disableRipple
                          />
                        </MuiListItemIcon>
                        <MuiListItemText primary={item.text} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
            <TextField
              label="Completion Notes"
              multiline
              rows={3}
              defaultValue={editingTask?.completionNotes}
            />
            <Button
              variant="outlined"
              component="label"
              startIcon={<AttachFileIcon />}
            >
              Add Attachments
              <input
                type="file"
                hidden
                multiple
                onChange={(e) => {
                  // Handle file uploads
                }}
              />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDialog(false);
            setEditingTask(null);
            setSelectedTemplate(null);
            setChecklistItems([]);
          }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              // Gather form data including new fields
              const taskData = {
                checklistItems: checklistItems,
              };
              if (editingTask) {
                handleUpdateTask(editingTask.id, taskData);
              } else {
                handleCreateTask(taskData);
              }
            }}
          >
            {editingTask ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskManagement; 