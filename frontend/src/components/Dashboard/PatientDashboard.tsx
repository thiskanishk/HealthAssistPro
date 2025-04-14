import React from 'react';
import {
    Grid,
    Paper,
    Typography,
    Box,
    Card,
    CardContent,
    Chip,
    Button,
    CircularProgress
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getPatientSummary } from '../../services/api/patient';
import { MedicalChart } from '../Charts/MedicalChart';
import { UpcomingAppointments } from '../Appointments/UpcomingAppointments';
import { RecentDiagnoses } from '../Diagnosis/RecentDiagnoses';
import { MedicationReminders } from '../Medications/MedicationReminders';

interface PatientDashboardProps {
    patientId: string;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ patientId }) => {
    const { data, isLoading } = useQuery(['patientSummary', patientId], () =>
        getPatientSummary(patientId)
    );

    if (isLoading) {
        return <CircularProgress />;
    }

    return (
        <Box sx={{ flexGrow: 1, p: 3 }}>
            <Grid container spacing={3}>
                {/* Health Summary Card */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Health Summary
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Card>
                                    <CardContent>
                                        <Typography color="textSecondary" gutterBottom>
                                            Blood Pressure
                                        </Typography>
                                        <Typography variant="h5">
                                            {data?.vitals?.bloodPressure || 'N/A'}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6}>
                                <Card>
                                    <CardContent>
                                        <Typography color="textSecondary" gutterBottom>
                                            Heart Rate
                                        </Typography>
                                        <Typography variant="h5">
                                            {data?.vitals?.heartRate || 'N/A'} BPM
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                {/* Medical History Chart */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Health Trends
                        </Typography>
                        <MedicalChart data={data?.healthTrends} />
                    </Paper>
                </Grid>

                {/* Upcoming Appointments */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Upcoming Appointments
                        </Typography>
                        <UpcomingAppointments patientId={patientId} />
                    </Paper>
                </Grid>

                {/* Recent Diagnoses */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Recent Diagnoses
                        </Typography>
                        <RecentDiagnoses patientId={patientId} />
                    </Paper>
                </Grid>

                {/* Medication Reminders */}
                <Grid item xs={12}>
                    <Paper elevation={3} sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Medication Schedule
                        </Typography>
                        <MedicationReminders patientId={patientId} />
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}; 