import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Avatar,
  Divider,
  Tabs,
  Tab,
  Alert
} from '@mui/material';
import {
  Person,
  Security,
  Notifications,
  History
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Profile: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Mock user data - in a real app, this would come from API or context
  const [user, setUser] = useState({
    name: 'Dr. Jane Smith',
    email: 'jane.smith@healthassist.pro',
    role: 'Doctor',
    specialization: 'Cardiology',
    phone: '+1 (555) 123-4567',
    bio: 'Board-certified cardiologist with over 10 years of experience in diagnosing and treating heart conditions.',
    profileImage: '', // URL to profile image
    preferences: {
      emailNotifications: true,
      smsNotifications: false,
      darkMode: false
    }
  });

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEditToggle = () => {
    setEditMode(!editMode);
    if (editMode) {
      // In a real app, you would save changes to the API here
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser({
      ...user,
      [name]: value
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Profile
      </Typography>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      <Paper elevation={3} sx={{ mb: 3 }}>
        <Box display="flex" p={3} alignItems="center">
          <Avatar
            sx={{ width: 100, height: 100, mr: 3 }}
            alt={user.name}
            src={user.profileImage || undefined}
          >
            {user.name.charAt(0)}
          </Avatar>
          <Box flexGrow={1}>
            <Typography variant="h5">{user.name}</Typography>
            <Typography variant="body1" color="textSecondary">
              {user.role} - {user.specialization}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {user.email}
            </Typography>
          </Box>
          <Button
            variant={editMode ? "contained" : "outlined"}
            color={editMode ? "primary" : "secondary"}
            onClick={handleEditToggle}
          >
            {editMode ? "Save Changes" : "Edit Profile"}
          </Button>
        </Box>
      </Paper>

      <Paper elevation={3}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="profile tabs"
          centered
        >
          <Tab icon={<Person />} label="Personal Info" />
          <Tab icon={<Security />} label="Security" />
          <Tab icon={<Notifications />} label="Notifications" />
          <Tab icon={<History />} label="Activity" />
        </Tabs>
        <Divider />

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name"
                name="name"
                value={user.name}
                onChange={handleInputChange}
                margin="normal"
                disabled={!editMode}
              />
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={user.email}
                onChange={handleInputChange}
                margin="normal"
                disabled={!editMode}
              />
              <TextField
                fullWidth
                label="Phone Number"
                name="phone"
                value={user.phone}
                onChange={handleInputChange}
                margin="normal"
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Role"
                name="role"
                value={user.role}
                onChange={handleInputChange}
                margin="normal"
                disabled
              />
              <TextField
                fullWidth
                label="Specialization"
                name="specialization"
                value={user.specialization}
                onChange={handleInputChange}
                margin="normal"
                disabled={!editMode}
              />
              <TextField
                fullWidth
                label="Bio"
                name="bio"
                value={user.bio}
                onChange={handleInputChange}
                margin="normal"
                multiline
                rows={4}
                disabled={!editMode}
              />
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>Change Password</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Current Password"
                type="password"
                margin="normal"
              />
              <TextField
                fullWidth
                label="New Password"
                type="password"
                margin="normal"
              />
              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                margin="normal"
              />
              <Button
                variant="contained"
                color="primary"
                sx={{ mt: 2 }}
              >
                Update Password
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>Notification Preferences</Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            Notification settings will be available in a future update.
          </Alert>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>Recent Activity</Typography>
          <Alert severity="info">
            Activity history will be available in a future update.
          </Alert>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default Profile; 