import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  CircularProgress,
  Alert,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Button,
  IconButton
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';

const NotificationPreferences: React.FC = () => {
  const {
    preferences,
    loading,
    error,
    updatePreferences,
    updateQuietHours,
    updateCategory,
    createGroup,
    updateGroup,
    deleteGroup
  } = useNotificationPreferences();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!preferences) {
    return null;
  }

  const handleGlobalToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    updatePreferences({ enabled: event.target.checked });
  };

  const handleEmailToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    updatePreferences({
      emailNotifications: {
        ...preferences.emailNotifications,
        enabled: event.target.checked
      }
    });
  };

  const handleEmailFrequencyChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    updatePreferences({
      emailNotifications: {
        ...preferences.emailNotifications,
        frequency: event.target.value as 'immediate' | 'hourly' | 'daily' | 'weekly'
      }
    });
  };

  const handlePushNotificationsToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    updatePreferences({
      pushNotifications: {
        ...preferences.pushNotifications,
        enabled: event.target.checked
      }
    });
  };

  const handleQuietHoursToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateQuietHours({
      ...preferences.quietHours,
      enabled: event.target.checked
    });
  };

  return (
    <Box p={3}>
      <Paper elevation={2}>
        <Box p={3}>
          <Typography variant="h5" gutterBottom>
            Notification Preferences
          </Typography>

          {/* Global Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={preferences.enabled}
                onChange={handleGlobalToggle}
                color="primary"
              />
            }
            label="Enable All Notifications"
          />

          <Divider sx={{ my: 3 }} />

          {/* Email Notifications */}
          <Typography variant="h6" gutterBottom>
            Email Notifications
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.emailNotifications.enabled}
                    onChange={handleEmailToggle}
                    color="primary"
                    disabled={!preferences.enabled}
                  />
                }
                label="Enable Email Notifications"
              />
            </Grid>
            <Grid item xs>
              <FormControl fullWidth disabled={!preferences.enabled || !preferences.emailNotifications.enabled}>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={preferences.emailNotifications.frequency}
                  onChange={handleEmailFrequencyChange}
                  label="Frequency"
                >
                  <MenuItem value="immediate">Immediate</MenuItem>
                  <MenuItem value="hourly">Hourly Digest</MenuItem>
                  <MenuItem value="daily">Daily Digest</MenuItem>
                  <MenuItem value="weekly">Weekly Digest</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Push Notifications */}
          <Typography variant="h6" gutterBottom>
            Push Notifications
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.pushNotifications.enabled}
                onChange={handlePushNotificationsToggle}
                color="primary"
                disabled={!preferences.enabled}
              />
            }
            label="Enable Push Notifications"
          />

          <Divider sx={{ my: 3 }} />

          {/* Quiet Hours */}
          <Typography variant="h6" gutterBottom>
            Quiet Hours
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.quietHours.enabled}
                    onChange={handleQuietHoursToggle}
                    color="primary"
                    disabled={!preferences.enabled}
                  />
                }
                label="Enable Quiet Hours"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TimePicker
                label="Start Time"
                value={preferences.quietHours.start}
                onChange={(newValue) => {
                  if (newValue) {
                    updateQuietHours({
                      ...preferences.quietHours,
                      start: newValue
                    });
                  }
                }}
                disabled={!preferences.enabled || !preferences.quietHours.enabled}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TimePicker
                label="End Time"
                value={preferences.quietHours.end}
                onChange={(newValue) => {
                  if (newValue) {
                    updateQuietHours({
                      ...preferences.quietHours,
                      end: newValue
                    });
                  }
                }}
                disabled={!preferences.enabled || !preferences.quietHours.enabled}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.quietHours.allowUrgent}
                    onChange={(event) => {
                      updateQuietHours({
                        ...preferences.quietHours,
                        allowUrgent: event.target.checked
                      });
                    }}
                    color="primary"
                    disabled={!preferences.enabled || !preferences.quietHours.enabled}
                  />
                }
                label="Allow Urgent Notifications During Quiet Hours"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Categories */}
          <Typography variant="h6" gutterBottom>
            Categories
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(preferences.categories).map(([category, settings]) => (
              <Grid item xs={12} key={category}>
                <Paper elevation={1} sx={{ p: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.enabled}
                            onChange={(event) => {
                              updateCategory(
                                category,
                                event.target.checked,
                                settings.priority
                              );
                            }}
                            color="primary"
                            disabled={!preferences.enabled}
                          />
                        }
                        label={category.charAt(0).toUpperCase() + category.slice(1)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={8}>
                      <FormControl fullWidth disabled={!preferences.enabled || !settings.enabled}>
                        <InputLabel>Priority</InputLabel>
                        <Select
                          value={settings.priority}
                          onChange={(event) => {
                            updateCategory(
                              category,
                              settings.enabled,
                              event.target.value as 'low' | 'medium' | 'high' | 'urgent'
                            );
                          }}
                          label="Priority"
                        >
                          <MenuItem value="low">Low</MenuItem>
                          <MenuItem value="medium">Medium</MenuItem>
                          <MenuItem value="high">High</MenuItem>
                          <MenuItem value="urgent">Urgent</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

export default NotificationPreferences; 