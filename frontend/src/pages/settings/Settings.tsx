import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent
} from '@mui/material';
import {
  DarkMode,
  Notifications,
  Language,
  Security,
  Person,
  DataObject,
  HelpOutline
} from '@mui/icons-material';

// Define proper types for the settings
interface AppearanceSettings {
  darkMode: boolean;
  fontScale: string;
  highContrast: boolean;
}

interface NotificationSettings {
  emailAlerts: boolean;
  smsAlerts: boolean;
  browserNotifications: boolean;
}

interface PrivacySettings {
  sharingEnabled: boolean;
  analyticsConsent: boolean;
}

interface AppSettings {
  appearance: AppearanceSettings;
  notifications: NotificationSettings;
  language: string;
  privacy: PrivacySettings;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    appearance: {
      darkMode: false,
      fontScale: '100%',
      highContrast: false
    },
    notifications: {
      emailAlerts: true,
      smsAlerts: false,
      browserNotifications: true
    },
    language: 'en',
    privacy: {
      sharingEnabled: false,
      analyticsConsent: true
    }
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Define separate type-safe handlers for each settings section
  const handleAppearanceChange = (name: keyof AppearanceSettings) => 
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSettings({
        ...settings,
        appearance: {
          ...settings.appearance,
          [name]: event.target.checked
        }
      });
    };

  const handleNotificationsChange = (name: keyof NotificationSettings) => 
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSettings({
        ...settings,
        notifications: {
          ...settings.notifications,
          [name]: event.target.checked
        }
      });
    };

  const handlePrivacyChange = (name: keyof PrivacySettings) => 
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSettings({
        ...settings,
        privacy: {
          ...settings.privacy,
          [name]: event.target.checked
        }
      });
    };

  const handleLanguageChange = (event: SelectChangeEvent) => {
    setSettings({
      ...settings,
      language: event.target.value
    });
  };

  const handleSaveSettings = () => {
    // In a real app, you would save settings to the API here
    console.log('Saving settings:', settings);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  const handleResetSettings = () => {
    setSettings({
      appearance: {
        darkMode: false,
        fontScale: '100%',
        highContrast: false
      },
      notifications: {
        emailAlerts: true,
        smsAlerts: false,
        browserNotifications: true
      },
      language: 'en',
      privacy: {
        sharingEnabled: false,
        analyticsConsent: true
      }
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" component="h1">
          Settings
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={handleResetSettings}
            sx={{ mr: 2 }}
          >
            Reset to Default
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSaveSettings}
          >
            Save Changes
          </Button>
        </Box>
      </Box>

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Paper elevation={3} sx={{ mb: { xs: 3, md: 0 } }}>
            <List component="nav">
              <ListItem button>
                <ListItemIcon>
                  <DarkMode />
                </ListItemIcon>
                <ListItemText primary="Appearance" />
              </ListItem>
              <ListItem button>
                <ListItemIcon>
                  <Notifications />
                </ListItemIcon>
                <ListItemText primary="Notifications" />
              </ListItem>
              <ListItem button>
                <ListItemIcon>
                  <Language />
                </ListItemIcon>
                <ListItemText primary="Language" />
              </ListItem>
              <ListItem button>
                <ListItemIcon>
                  <Security />
                </ListItemIcon>
                <ListItemText primary="Privacy" />
              </ListItem>
              <ListItem button>
                <ListItemIcon>
                  <Person />
                </ListItemIcon>
                <ListItemText primary="Account" />
              </ListItem>
              <ListItem button>
                <ListItemIcon>
                  <DataObject />
                </ListItemIcon>
                <ListItemText primary="Developer" />
              </ListItem>
              <ListItem button>
                <ListItemIcon>
                  <HelpOutline />
                </ListItemIcon>
                <ListItemText primary="Help & Support" />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={9}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Appearance
            </Typography>
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.appearance.darkMode}
                    onChange={handleAppearanceChange('darkMode')}
                  />
                }
                label="Dark Mode"
              />
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Use dark theme to reduce eye strain in low light environments
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.appearance.highContrast}
                    onChange={handleAppearanceChange('highContrast')}
                  />
                }
                label="High Contrast"
              />
              <Typography variant="body2" color="textSecondary">
                Increase contrast for better readability
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" component="h2" gutterBottom>
              Notifications
            </Typography>
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.emailAlerts}
                    onChange={handleNotificationsChange('emailAlerts')}
                  />
                }
                label="Email Notifications"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.smsAlerts}
                    onChange={handleNotificationsChange('smsAlerts')}
                  />
                }
                label="SMS Alerts"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.browserNotifications}
                    onChange={handleNotificationsChange('browserNotifications')}
                  />
                }
                label="Browser Notifications"
              />
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" component="h2" gutterBottom>
              Language
            </Typography>
            <Box sx={{ mb: 3, maxWidth: 300 }}>
              <FormControl fullWidth>
                <InputLabel id="language-select-label">Language</InputLabel>
                <Select
                  labelId="language-select-label"
                  id="language-select"
                  value={settings.language}
                  label="Language"
                  onChange={handleLanguageChange}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Spanish</MenuItem>
                  <MenuItem value="fr">French</MenuItem>
                  <MenuItem value="de">German</MenuItem>
                  <MenuItem value="zh">Chinese</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" component="h2" gutterBottom>
              Privacy
            </Typography>
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.privacy.sharingEnabled}
                    onChange={handlePrivacyChange('sharingEnabled')}
                  />
                }
                label="Data Sharing"
              />
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Allow sharing of anonymized data for research purposes
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.privacy.analyticsConsent}
                    onChange={handlePrivacyChange('analyticsConsent')}
                  />
                }
                label="Analytics Consent"
              />
              <Typography variant="body2" color="textSecondary">
                Allow usage analytics to help improve the application
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings; 