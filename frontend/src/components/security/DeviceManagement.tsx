import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondary,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip
} from '@mui/material';
import {
  DevicesOutlined,
  DeleteOutline,
  VerifiedUser,
  Warning,
  LocationOn
} from '@mui/icons-material';

interface Device {
  deviceId: string;
  name: string;
  type: string;
  browser: {
    name: string;
    version: string;
  };
  os: {
    name: string;
    version: string;
  };
  ipAddress: string;
  location: {
    country: string;
    region: string;
    city: string;
    timezone: string;
  };
  trusted: boolean;
  trustExpires?: Date;
  firstSeen: Date;
  lastUsed: Date;
  isCurrent: boolean;
}

interface DeviceManagementProps {
  userId: string;
}

const DeviceManagement: React.FC<DeviceManagementProps> = ({ userId }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fetch user's devices
  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/security/devices/${userId}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message);

      setDevices(data.devices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [userId]);

  // Trust a device
  const trustDevice = async (deviceId: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/security/devices/${deviceId}/trust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message);

      fetchDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trust device');
    }
  };

  // Remove a device
  const removeDevice = async (deviceId: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/security/devices/${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message);

      setShowConfirmDialog(false);
      fetchDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove device');
    }
  };

  const formatLastUsed = (date: Date) => {
    const now = new Date();
    const lastUsed = new Date(date);
    const diffTime = Math.abs(now.getTime() - lastUsed.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return lastUsed.toLocaleDateString();
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <DevicesOutlined color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Device Management</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {devices.map((device) => (
              <ListItem
                key={device.deviceId}
                divider
                secondaryAction={
                  <Box>
                    {!device.isCurrent && (
                      <>
                        {!device.trusted && (
                          <Tooltip title="Trust this device">
                            <IconButton
                              onClick={() => trustDevice(device.deviceId)}
                              color="primary"
                            >
                              <VerifiedUser />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Remove device">
                          <IconButton
                            onClick={() => {
                              setSelectedDevice(device);
                              setShowConfirmDialog(true);
                            }}
                            color="error"
                          >
                            <DeleteOutline />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                }
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      {device.name}
                      {device.isCurrent && (
                        <Chip size="small" label="Current Device" color="primary" />
                      )}
                      {device.trusted && (
                        <Chip size="small" label="Trusted" color="success" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {device.browser.name} {device.browser.version} on{' '}
                        {device.os.name} {device.os.version}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {device.location.city}, {device.location.country}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Last used: {formatLastUsed(device.lastUsed)}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}

        <Dialog
          open={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
        >
          <DialogTitle>Remove Device?</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to remove this device? You'll need to
              re-authenticate if you use this device again.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
            <Button
              onClick={() => selectedDevice && removeDevice(selectedDevice.deviceId)}
              color="error"
              variant="contained"
            >
              Remove
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default DeviceManagement; 