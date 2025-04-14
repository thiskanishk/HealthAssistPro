import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';

interface GroupDialogState {
  open: boolean;
  mode: 'create' | 'edit';
  name: string;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sound: 'default' | 'alert' | 'reminder' | 'success' | 'error';
  editingGroup?: string;
}

const NotificationGroups: React.FC = () => {
  const { preferences, loading, error, createGroup, updateGroup, deleteGroup } = useNotificationPreferences();
  const [dialogState, setDialogState] = useState<GroupDialogState>({
    open: false,
    mode: 'create',
    name: '',
    enabled: true,
    priority: 'medium',
    sound: 'default'
  });

  const handleOpenCreateDialog = () => {
    setDialogState({
      open: true,
      mode: 'create',
      name: '',
      enabled: true,
      priority: 'medium',
      sound: 'default'
    });
  };

  const handleOpenEditDialog = (group: typeof preferences.groups[0]) => {
    setDialogState({
      open: true,
      mode: 'edit',
      name: group.name,
      enabled: group.enabled,
      priority: group.priority,
      sound: group.sound,
      editingGroup: group.name
    });
  };

  const handleCloseDialog = () => {
    setDialogState(prev => ({ ...prev, open: false }));
  };

  const handleSubmit = async () => {
    const { mode, name, enabled, priority, sound, editingGroup } = dialogState;
    
    try {
      if (mode === 'create') {
        await createGroup({ name, enabled, priority, sound });
      } else {
        await updateGroup(editingGroup!, { name, enabled, priority, sound });
      }
      handleCloseDialog();
    } catch (err) {
      console.error('Failed to save group:', err);
    }
  };

  const handleDeleteGroup = async (groupName: string) => {
    try {
      await deleteGroup(groupName);
    } catch (err) {
      console.error('Failed to delete group:', err);
    }
  };

  if (!preferences) {
    return null;
  }

  return (
    <Box>
      <Paper elevation={2}>
        <Box p={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Notification Groups
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
            >
              Create Group
            </Button>
          </Box>

          <List>
            {preferences.groups.map((group) => (
              <ListItem
                key={group.name}
                divider
                secondaryAction={
                  <Box>
                    <IconButton
                      edge="end"
                      aria-label="edit"
                      onClick={() => handleOpenEditDialog(group)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteGroup(group.name)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText
                  primary={group.name}
                  secondary={`Priority: ${group.priority}, Sound: ${group.sound}`}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={group.enabled}
                      onChange={(event) => {
                        updateGroup(group.name, {
                          enabled: event.target.checked
                        });
                      }}
                      color="primary"
                    />
                  }
                  label="Enabled"
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Paper>

      <Dialog open={dialogState.open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogState.mode === 'create' ? 'Create Notification Group' : 'Edit Notification Group'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Group Name"
                value={dialogState.name}
                onChange={(e) => setDialogState(prev => ({ ...prev, name: e.target.value }))}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={dialogState.enabled}
                    onChange={(e) => setDialogState(prev => ({ ...prev, enabled: e.target.checked }))}
                    color="primary"
                  />
                }
                label="Enabled"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={dialogState.priority}
                  onChange={(e) => setDialogState(prev => ({ ...prev, priority: e.target.value as typeof dialogState.priority }))}
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Sound</InputLabel>
                <Select
                  value={dialogState.sound}
                  onChange={(e) => setDialogState(prev => ({ ...prev, sound: e.target.value as typeof dialogState.sound }))}
                  label="Sound"
                >
                  <MenuItem value="default">Default</MenuItem>
                  <MenuItem value="alert">Alert</MenuItem>
                  <MenuItem value="reminder">Reminder</MenuItem>
                  <MenuItem value="success">Success</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={!dialogState.name.trim()}
          >
            {dialogState.mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationGroups; 