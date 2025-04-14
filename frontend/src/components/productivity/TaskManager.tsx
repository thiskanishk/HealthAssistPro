import React, { useState } from 'react';
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
  Chip,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Tooltip
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  Flag,
  Schedule,
  CheckCircle,
  RadioButtonUnchecked
} from '@mui/icons-material';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: Date;
  completed: boolean;
  patientId?: string;
  patientName?: string;
  category: 'patient' | 'admin' | 'follow-up' | 'general';
}

const TaskManager: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Task['category'] | 'all'>('all');

  const handleAddTask = (task: Omit<Task, 'id'>) => {
    const newTask = {
      ...task,
      id: Math.random().toString(36).substr(2, 9)
    };
    setTasks([...tasks, newTask]);
    setOpenDialog(false);
    setEditingTask(null);
  };

  const handleEditTask = (task: Task) => {
    setTasks(tasks.map(t => t.id === task.id ? task : t));
    setOpenDialog(false);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const handleToggleComplete = (taskId: string) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ));
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
    }
  };

  const getCategoryIcon = (category: Task['category']) => {
    switch (category) {
      case 'patient': return <LocalHospital />;
      case 'admin': return <Assignment />;
      case 'follow-up': return <Schedule />;
      case 'general': return <Flag />;
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filter === 'all' || 
      (filter === 'completed' ? task.completed : !task.completed);
    const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
    return matchesStatus && matchesCategory;
  });

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Tasks</Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              label="Status"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as Task['category'] | 'all')}
              label="Category"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="patient">Patient Care</MenuItem>
              <MenuItem value="admin">Administrative</MenuItem>
              <MenuItem value="follow-up">Follow-up</MenuItem>
              <MenuItem value="general">General</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setEditingTask(null);
              setOpenDialog(true);
            }}
          >
            Add Task
          </Button>
        </Box>
      </Box>

      <List>
        {filteredTasks.map((task) => (
          <ListItem
            key={task.id}
            sx={{
              bgcolor: task.completed ? 'action.hover' : 'inherit',
              mb: 1,
              borderRadius: 1
            }}
          >
            <ListItemIcon>
              <IconButton onClick={() => handleToggleComplete(task.id)}>
                {task.completed ? <CheckCircle color="success" /> : <RadioButtonUnchecked />}
              </IconButton>
            </ListItemIcon>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography
                    variant="body1"
                    sx={{
                      textDecoration: task.completed ? 'line-through' : 'none'
                    }}
                  >
                    {task.title}
                  </Typography>
                  <Chip
                    size="small"
                    label={task.priority}
                    color={getPriorityColor(task.priority)}
                  />
                  {task.patientName && (
                    <Chip
                      size="small"
                      label={task.patientName}
                      variant="outlined"
                    />
                  )}
                </Box>
              }
              secondary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Schedule fontSize="small" />
                  <Typography variant="caption">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </Typography>
                  {getCategoryIcon(task.category)}
                  <Typography variant="caption">
                    {task.category}
                  </Typography>
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <Tooltip title="Edit">
                <IconButton
                  onClick={() => {
                    setEditingTask(task);
                    setOpenDialog(true);
                  }}
                >
                  <Edit />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton
                  onClick={() => handleDeleteTask(task.id)}
                  color="error"
                >
                  <Delete />
                </IconButton>
              </Tooltip>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <TaskDialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setEditingTask(null);
        }}
        onSave={editingTask ? handleEditTask : handleAddTask}
        task={editingTask}
      />
    </Paper>
  );
};

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  task?: Task | null;
}

const TaskDialog: React.FC<TaskDialogProps> = ({ open, onClose, onSave, task }) => {
  const [formData, setFormData] = useState<Partial<Task>>(
    task || {
      title: '',
      description: '',
      priority: 'medium',
      dueDate: new Date(),
      completed: false,
      category: 'general'
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Task);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{task ? 'Edit Task' : 'New Task'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
            />
            <FormControl>
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                label="Priority"
              >
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Task['category'] })}
                label="Category"
              >
                <MenuItem value="patient">Patient Care</MenuItem>
                <MenuItem value="admin">Administrative</MenuItem>
                <MenuItem value="follow-up">Follow-up</MenuItem>
                <MenuItem value="general">General</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Due Date"
              type="datetime-local"
              value={new Date(formData.dueDate || '').toISOString().slice(0, 16)}
              onChange={(e) => setFormData({ ...formData, dueDate: new Date(e.target.value) })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Patient Name (Optional)"
              value={formData.patientName || ''}
              onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TaskManager; 