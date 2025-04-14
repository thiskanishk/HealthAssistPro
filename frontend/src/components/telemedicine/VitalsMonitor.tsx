import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Grid,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Favorite,
  DeviceThermometer,
  Opacity,
  Air,
  Warning,
} from '@mui/icons-material';
import { useTelemedicine } from '../../hooks/useTelemedicine';

interface VitalsMonitorProps {
  sessionId: string;
  patientId: string;
}

interface VitalSigns {
  temperature: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  heartRate: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  timestamp: Date;
}

const VitalsMonitor: React.FC<VitalsMonitorProps> = ({ sessionId, patientId }) => {
  const [vitals, setVitals] = useState<VitalSigns | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { updateVitals } = useTelemedicine();

  useEffect(() => {
    const fetchVitals = async () => {
      try {
        // Simulated vitals data - in a real app, this would come from medical devices
        const mockVitals: VitalSigns = {
          temperature: 37.2,
          bloodPressure: {
            systolic: 120,
            diastolic: 80,
          },
          heartRate: 75,
          respiratoryRate: 16,
          oxygenSaturation: 98,
          timestamp: new Date(),
        };
        
        setVitals(mockVitals);
        await updateVitals(sessionId, mockVitals);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching vitals:', error);
        setError('Failed to fetch vital signs');
        setLoading(false);
      }
    };

    const interval = setInterval(fetchVitals, 30000); // Update every 30 seconds
    fetchVitals();

    return () => clearInterval(interval);
  }, [sessionId, patientId]);

  const isVitalNormal = (
    vital: string,
    value: number
  ): { normal: boolean; message: string } => {
    const ranges = {
      temperature: { min: 36.5, max: 37.5, message: 'Normal range: 36.5-37.5°C' },
      systolic: { min: 90, max: 140, message: 'Normal range: 90-140 mmHg' },
      diastolic: { min: 60, max: 90, message: 'Normal range: 60-90 mmHg' },
      heartRate: { min: 60, max: 100, message: 'Normal range: 60-100 bpm' },
      respiratoryRate: { min: 12, max: 20, message: 'Normal range: 12-20 breaths/min' },
      oxygenSaturation: { min: 95, max: 100, message: 'Normal range: 95-100%' },
    };

    const range = ranges[vital as keyof typeof ranges];
    if (!range) return { normal: true, message: '' };

    return {
      normal: value >= range.min && value <= range.max,
      message: range.message,
    };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!vitals) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <Typography>No vital signs data available</Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Patient Vitals
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Box display="flex" alignItems="center">
            <DeviceThermometer color="primary" />
            <Typography variant="body1" ml={1}>
              Temperature:
            </Typography>
            <Tooltip title={isVitalNormal('temperature', vitals.temperature).message}>
              <Typography
                variant="body1"
                ml={1}
                color={
                  isVitalNormal('temperature', vitals.temperature).normal
                    ? 'textPrimary'
                    : 'error'
                }
              >
                {vitals.temperature}°C
              </Typography>
            </Tooltip>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box display="flex" alignItems="center">
            <Opacity color="primary" />
            <Typography variant="body1" ml={1}>
              Blood Pressure:
            </Typography>
            <Tooltip
              title={`Systolic: ${
                isVitalNormal('systolic', vitals.bloodPressure.systolic).message
              }\nDiastolic: ${
                isVitalNormal('diastolic', vitals.bloodPressure.diastolic).message
              }`}
            >
              <Typography
                variant="body1"
                ml={1}
                color={
                  isVitalNormal('systolic', vitals.bloodPressure.systolic).normal &&
                  isVitalNormal('diastolic', vitals.bloodPressure.diastolic).normal
                    ? 'textPrimary'
                    : 'error'
                }
              >
                {vitals.bloodPressure.systolic}/{vitals.bloodPressure.diastolic} mmHg
              </Typography>
            </Tooltip>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box display="flex" alignItems="center">
            <Favorite color="primary" />
            <Typography variant="body1" ml={1}>
              Heart Rate:
            </Typography>
            <Tooltip title={isVitalNormal('heartRate', vitals.heartRate).message}>
              <Typography
                variant="body1"
                ml={1}
                color={
                  isVitalNormal('heartRate', vitals.heartRate).normal
                    ? 'textPrimary'
                    : 'error'
                }
              >
                {vitals.heartRate} bpm
              </Typography>
            </Tooltip>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box display="flex" alignItems="center">
            <Air color="primary" />
            <Typography variant="body1" ml={1}>
              Respiratory Rate:
            </Typography>
            <Tooltip
              title={isVitalNormal('respiratoryRate', vitals.respiratoryRate).message}
            >
              <Typography
                variant="body1"
                ml={1}
                color={
                  isVitalNormal('respiratoryRate', vitals.respiratoryRate).normal
                    ? 'textPrimary'
                    : 'error'
                }
              >
                {vitals.respiratoryRate} breaths/min
              </Typography>
            </Tooltip>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box display="flex" alignItems="center">
            <Air color="primary" />
            <Typography variant="body1" ml={1}>
              Oxygen Saturation:
            </Typography>
            <Tooltip
              title={isVitalNormal('oxygenSaturation', vitals.oxygenSaturation).message}
            >
              <Typography
                variant="body1"
                ml={1}
                color={
                  isVitalNormal('oxygenSaturation', vitals.oxygenSaturation).normal
                    ? 'textPrimary'
                    : 'error'
                }
              >
                {vitals.oxygenSaturation}%
              </Typography>
            </Tooltip>
          </Box>
        </Grid>
      </Grid>
      <Box mt={2}>
        <Typography variant="caption" color="textSecondary">
          Last updated: {new Date(vitals.timestamp).toLocaleTimeString()}
        </Typography>
      </Box>
    </Paper>
  );
};

export default VitalsMonitor; 