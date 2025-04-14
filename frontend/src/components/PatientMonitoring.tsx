import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Button
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { usePatientMonitoring } from '../hooks/usePatientMonitoring';
import { AIInsightCard } from './AIInsightCard';

export const PatientMonitoring: React.FC<{
  patientId: string;
}> = ({ patientId }) => {
  const {
    vitals,
    trends,
    insights,
    alerts,
    loading,
    error,
    refreshData
  } = usePatientMonitoring(patientId);

  const renderVitalChart = (vitalData: any[], dataKey: string, unit: string) => (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={vitalData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis unit={unit} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke="#8884d8"
          activeDot={{ r: 8 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <Paper elevation={3} sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" gutterBottom>
        AI-Enhanced Patient Monitoring
      </Typography>

      {loading ? (
        <LinearProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Vital Signs Trends
                </Typography>
                {renderVitalChart(vitals.heartRate, 'value', 'bpm')}
                {renderVitalChart(vitals.bloodPressure, 'systolic', 'mmHg')}
                {renderVitalChart(vitals.temperature, 'value', '°C')}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {alerts.map((alert, index) => (
                <Alert
                  key={index}
                  severity={alert.severity}
                  action={
                    <Button color="inherit" size="small">
                      Details
                    </Button>
                  }
                >
                  {alert.message}
                </Alert>
              ))}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <AIInsightCard insights={insights} />
          </Grid>
        </Grid>
      )}
    </Paper>
  );
}; 