import * as React from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Divider,
} from '@mui/material';
import {
  VideocamOutlined,
  MicOutlined,
  NetworkCheck,
  CheckCircleOutline,
  ErrorOutline,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface SystemCheck {
  type: 'camera' | 'microphone' | 'network';
  status: 'checking' | 'success' | 'error';
  message: string;
}

interface AppointmentDetails {
  doctorName: string;
  startTime: string;
  estimatedWaitTime?: number;
}

const TelemedicineWaitingRoom: React.FC = () => {
  const [systemChecks, setSystemChecks] = React.useState<SystemCheck[]>([
    { type: 'camera', status: 'checking', message: 'Checking camera access...' },
    { type: 'microphone', status: 'checking', message: 'Checking microphone access...' },
    { type: 'network', status: 'checking', message: 'Checking network connection...' },
  ]);
  const [appointment, setAppointment] = React.useState<AppointmentDetails | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const navigate = useNavigate();
  const { user } = useAuth();

  React.useEffect(() => {
    const checkDevices = async () => {
      try {
        // Check camera
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        updateSystemCheck('camera', hasCamera ? 'success' : 'error', 
          hasCamera ? 'Camera is ready' : 'No camera detected');

        // Check microphone
        const hasMicrophone = devices.some(device => device.kind === 'audioinput');
        updateSystemCheck('microphone', hasMicrophone ? 'success' : 'error',
          hasMicrophone ? 'Microphone is ready' : 'No microphone detected');

        // Check network
        const networkSpeed = await checkNetworkSpeed();
        const hasGoodConnection = networkSpeed > 1; // 1 Mbps minimum
        updateSystemCheck('network', hasGoodConnection ? 'success' : 'error',
          hasGoodConnection ? 'Network connection is stable' : 'Poor network connection');

      } catch (err) {
        console.error('Error checking devices:', err);
        setError('Failed to check system requirements. Please ensure you have granted necessary permissions.');
      }
    };

    const fetchAppointmentDetails = async () => {
      try {
        const response = await fetch(`/api/telemedicine/current-appointment/${user.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch appointment details');
        }
        const data = await response.json();
        setAppointment(data);
      } catch (err) {
        console.error('Error fetching appointment:', err);
        setError('Failed to load appointment details');
      }
    };

    checkDevices();
    fetchAppointmentDetails();
  }, [user.id]);

  const updateSystemCheck = (type: SystemCheck['type'], status: SystemCheck['status'], message: string) => {
    setSystemChecks(prev => prev.map(check => 
      check.type === type ? { ...check, status, message } : check
    ));
  };

  const checkNetworkSpeed = async (): Promise<number> => {
    // Simplified network speed test
    const startTime = performance.now();
    try {
      await fetch('/api/network-test', { cache: 'no-cache' });
      const endTime = performance.now();
      const duration = endTime - startTime;
      return 10000 / duration; // Rough estimate of Mbps
    } catch {
      return 0;
    }
  };

  const getSystemCheckIcon = (status: SystemCheck['status']) => {
    switch (status) {
      case 'checking':
        return <CircularProgress size={20} />;
      case 'success':
        return <CheckCircleOutline color="success" />;
      case 'error':
        return <ErrorOutline color="error" />;
    }
  };

  const getSystemCheckComponent = (type: SystemCheck['type']) => {
    switch (type) {
      case 'camera':
        return <VideocamOutlined />;
      case 'microphone':
        return <MicOutlined />;
      case 'network':
        return <NetworkCheck />;
    }
  };

  const allChecksSuccessful = systemChecks.every(check => check.status === 'success');

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Waiting Room
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {appointment && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Appointment Details
            </Typography>
            <Typography>
              Doctor: {appointment.doctorName}
            </Typography>
            <Typography>
              Start Time: {new Date(appointment.startTime).toLocaleTimeString()}
            </Typography>
            {appointment.estimatedWaitTime && (
              <Typography>
                Estimated Wait Time: {appointment.estimatedWaitTime} minutes
              </Typography>
            )}
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          System Check
        </Typography>

        <List>
          {systemChecks.map((check) => (
            <ListItem key={check.type}>
              <ListItemIcon>
                {getSystemCheckComponent(check.type)}
              </ListItemIcon>
              <ListItemText 
                primary={check.type.charAt(0).toUpperCase() + check.type.slice(1)}
                secondary={check.message}
              />
              <ListItemIcon>
                {getSystemCheckIcon(check.status)}
              </ListItemIcon>
            </ListItem>
          ))}
        </List>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/telemedicine/schedule')}
          >
            Back to Schedule
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!allChecksSuccessful || !appointment}
            onClick={() => navigate(`/telemedicine/session/${appointment?._id}`)}
          >
            Join Consultation
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default TelemedicineWaitingRoom; 