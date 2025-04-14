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
  Badge,
  Menu,
  MenuItem,
  Divider,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Notifications,
  NotificationsActive,
  Schedule,
  Person,
  Assignment,
  Check,
  Delete,
  Settings,
  Add
} from '@mui/icons-material';

interface Notification {
  id: string;
  type: 'task' | 'visit' | 'reminder' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string;
  relatedId?: string;
}

interface NotificationPreferences {
  taskReminders: boolean;
  visitReminders: boolean;
  systemNotifications: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  reminderLeadTime: number;
}

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    taskReminders: true,
    visitReminders: true,
    systemNotifications: true,
    emailNotifications: true,
    pushNotifications: true,
    reminderLeadTime: 15
  });

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      setNotifications(data.notifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Set up WebSocket connection for real-time notifications
    const ws = new WebSocket('ws://your-backend-url/notifications');
    
    ws.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      setNotifications(prev => [notification, ...prev]);
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' });
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, { method: 'DELETE' });
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const savePreferences = async () => {
    try {
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });
      setShowSettings(false);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const addReminder = async (data: any) => {
    try {
      await fetch('/api/notifications/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      setShowAddReminder(false);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to add reminder:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <IconButton color="inherit" onClick={handleNotificationClick}>
        <Badge badgeContent={unreadCount} color="error">
          {unreadCount > 0 ? <NotificationsActive /> : <Notifications />}
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          style: {
            maxHeight: 400,
            width: 360
          }
        }}
      >
        <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Notifications</Typography>
          <Box>
            <IconButton size="small" onClick={() => setShowAddReminder(true)}>
              <Add />
            </IconButton>
            <IconButton size="small" onClick={() => setShowSettings(true)}>
              <Settings />
            </IconButton>
          </Box>
        </Box>
        <Divider />
        
        <List>
          {notifications.length === 0 ? (
            <ListItem>
              <ListItemText primary="No notifications" />
            </ListItem>
          ) : (
            notifications.map((notification) => (
              <ListItem
                key={notification.id}
                sx={{
                  bgcolor: notification.read ? 'inherit' : 'action.hover'
                }}
              >
                <ListItemIcon>
                  {notification.type === 'task' && <Assignment color="primary" />}
                  {notification.type === 'visit' && <Person color="secondary" />}
                  {notification.type === 'reminder' && <Schedule color="warning" />}
                  {notification.type === 'system' && <NotificationsActive color="info" />}
                </ListItemIcon>
                <ListItemText
                  primary={notification.title}
                  secondary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="caption">
                        {new Date(notification.timestamp).toLocaleString()}
                      </Typography>
                      <Chip
                        size="small"
                        label={notification.priority}
                        color={
                          notification.priority === 'high'
                            ? 'error'
                            : notification.priority === 'medium'
                            ? 'warning'
                            : 'info'
                        }
                      />
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  {!notification.read && (
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <Check />
                    </IconButton>
                  )}
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => deleteNotification(notification.id)}
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))
          )}
        </List>
      </Menu>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)}>
        <DialogTitle>Notification Settings</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.taskReminders}
                  onChange={(e) =>
                    setPreferences({ ...preferences, taskReminders: e.target.checked })
                  }
                />
              }
              label="Task Reminders"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.visitReminders}
                  onChange={(e) =>
                    setPreferences({ ...preferences, visitReminders: e.target.checked })
                  }
                />
              }
              label="Visit Reminders"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.systemNotifications}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      systemNotifications: e.target.checked
                    })
                  }
                />
              }
              label="System Notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.emailNotifications}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      emailNotifications: e.target.checked
                    })
                  }
                />
              }
              label="Email Notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.pushNotifications}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      pushNotifications: e.target.checked
                    })
                  }
                />
              }
              label="Push Notifications"
            />
            <FormControl fullWidth>
              <InputLabel>Reminder Lead Time</InputLabel>
              <Select
                value={preferences.reminderLeadTime}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    reminderLeadTime: Number(e.target.value)
                  })
                }
                label="Reminder Lead Time"
              >
                <MenuItem value={5}>5 minutes</MenuItem>
                <MenuItem value={15}>15 minutes</MenuItem>
                <MenuItem value={30}>30 minutes</MenuItem>
                <MenuItem value={60}>1 hour</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Cancel</Button>
          <Button onClick={savePreferences} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Reminder Dialog */}
      <Dialog open={showAddReminder} onClose={() => setShowAddReminder(false)}>
        <DialogTitle>Add Reminder</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Title"
              fullWidth
              required
            />
            <TextField
              label="Message"
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="Date & Time"
              type="datetime-local"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                label="Priority"
                defaultValue="medium"
              >
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddReminder(false)}>Cancel</Button>
          <Button onClick={() => addReminder({})} variant="contained">
            Add Reminder
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NotificationCenter; 