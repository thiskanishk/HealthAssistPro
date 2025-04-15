import React, { useState, useEffect } from 'react';
import {
    Grid,
    Paper,
    Typography,
    Box,
    Card,
    CardContent,
    Chip,
    Button,
    CircularProgress,
    Divider,
    Avatar,
    IconButton,
    useTheme
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
// import { getPatientSummary } from '../../services/api/patient';
// import { MedicalChart } from '../Charts/MedicalChart';
// import { UpcomingAppointments } from '../Appointments/UpcomingAppointments';
// import { RecentDiagnoses } from '../Diagnosis/RecentDiagnoses';
// import { MedicationReminders } from '../Medications/MedicationReminders';
import {
    Dashboard as DashboardIcon,
    MedicalServices,
    Notifications,
    Medication,
    Assessment,
    NoteAdd,
    Timeline,
    Videocam,
    TrendingUp,
    ArrowForward,
    AddCircleOutline
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
// import HealthMetricsChart from '../Visualizations/HealthMetricsChart';
import { format } from 'date-fns';
// Import the actual types from the project
import { Appointment, Medication as MedicationType } from '../../types';

// Define interfaces for our component data
interface PatientDashboardProps {
    patientId: string;
}

interface DashboardAppointment {
    id: string;
    doctorName: string;
    specialization: string;
    date: Date;
    time: string;
    status: 'upcoming' | 'completed' | 'cancelled';
}

interface DashboardMedication {
    id: string;
    name: string;
    dosage: string;
    schedule: string;
    nextDose: Date;
}

interface HealthIndicator {
    name: string;
    value: number;
    unit: string;
    status: 'normal' | 'warning' | 'critical';
    trend: 'up' | 'down' | 'stable';
}

interface Notification {
    id: number;
    type: 'medication' | 'appointment' | 'lab';
    message: string;
    time: string;
}

interface DiagnosisSummary {
    id: number;
    condition: string;
    date: string;
    severity: string;
    treatingPhysician: string;
}

// Mock function for getPatientSummary
const getPatientSummary = async (id: string) => {
    return { patientId: id, name: 'Test Patient' };
};

// Mock component for HealthMetricsChart
const HealthMetricsChart: React.FC<{ patientId: string, timeRange: string }> = ({ patientId, timeRange }) => {
    return (
        <div>Health Metrics Chart Placeholder for patient {patientId} over {timeRange}</div>
    );
};

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ patientId }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
    const [medications, setMedications] = useState<DashboardMedication[]>([]);
    const [healthIndicators, setHealthIndicators] = useState<HealthIndicator[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [recentDiagnoses, setRecentDiagnoses] = useState<DiagnosisSummary[]>([]);

    const { data, isLoading } = useQuery({
        queryKey: ['patientSummary', patientId],
        queryFn: () => getPatientSummary(patientId)
    });

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                // These would be real API calls in production
                // For now, using mock data
                
                // Simulate API calls
                setTimeout(() => {
                    setAppointments([
                        {
                            id: '1',
                            doctorName: 'Dr. Sarah Johnson',
                            specialization: 'Cardiology',
                            date: new Date(2023, 6, 15),
                            time: '10:00 AM',
                            status: 'upcoming'
                        },
                        {
                            id: '2',
                            doctorName: 'Dr. Michael Chen',
                            specialization: 'General Practitioner',
                            date: new Date(2023, 6, 20),
                            time: '2:30 PM',
                            status: 'upcoming'
                        }
                    ]);
                    
                    setMedications([
                        {
                            id: '1',
                            name: 'Lisinopril',
                            dosage: '10mg',
                            schedule: 'Once daily',
                            nextDose: new Date(Date.now() + 1000 * 60 * 60 * 2) // 2 hours from now
                        },
                        {
                            id: '2',
                            name: 'Metformin',
                            dosage: '500mg',
                            schedule: 'Twice daily',
                            nextDose: new Date(Date.now() + 1000 * 60 * 30) // 30 minutes from now
                        },
                        {
                            id: '3',
                            name: 'Atorvastatin',
                            dosage: '20mg',
                            schedule: 'Once daily at bedtime',
                            nextDose: new Date(Date.now() + 1000 * 60 * 60 * 8) // 8 hours from now
                        }
                    ]);
                    
                    setHealthIndicators([
                        {
                            name: 'Blood Pressure',
                            value: 122,
                            unit: 'mmHg',
                            status: 'normal',
                            trend: 'stable'
                        },
                        {
                            name: 'Heart Rate',
                            value: 72,
                            unit: 'bpm',
                            status: 'normal',
                            trend: 'down'
                        },
                        {
                            name: 'Blood Glucose',
                            value: 110,
                            unit: 'mg/dL',
                            status: 'warning',
                            trend: 'up'
                        },
                        {
                            name: 'Oxygen Saturation',
                            value: 98,
                            unit: '%',
                            status: 'normal',
                            trend: 'stable'
                        }
                    ]);
                    
                    setNotifications([
                        {
                            id: 1,
                            type: 'medication',
                            message: 'Time to take Metformin (500mg)',
                            time: '10 minutes ago'
                        },
                        {
                            id: 2,
                            type: 'appointment',
                            message: 'Appointment with Dr. Johnson confirmed for tomorrow',
                            time: '2 hours ago'
                        },
                        {
                            id: 3,
                            type: 'lab',
                            message: 'Your lab results are ready to view',
                            time: 'Yesterday'
                        }
                    ]);
                    
                    setRecentDiagnoses([
                        {
                            id: 1,
                            condition: 'Hypertension',
                            date: '2023-06-01',
                            severity: 'Moderate',
                            treatingPhysician: 'Dr. Sarah Johnson'
                        },
                        {
                            id: 2,
                            condition: 'Type 2 Diabetes',
                            date: '2023-05-15',
                            severity: 'Mild',
                            treatingPhysician: 'Dr. Michael Chen'
                        }
                    ]);
                    
                    setLoading(false);
                }, 1000);
                
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
                setLoading(false);
            }
        };
        
        fetchDashboardData();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'normal':
                return theme.palette.success.main;
            case 'warning':
                return theme.palette.warning.main;
            case 'critical':
                return theme.palette.error.main;
            case 'upcoming':
                return theme.palette.primary.main;
            case 'completed':
                return theme.palette.success.main;
            case 'cancelled':
                return theme.palette.error.main;
            default:
                return theme.palette.primary.main;
        }
    };

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'up':
                return <TrendingUp style={{ color: theme.palette.success.main }} />;
            case 'down':
                return <TrendingUp style={{ color: theme.palette.error.main, transform: 'rotate(180deg)' }} />;
            case 'stable':
            default:
                return <ArrowForward style={{ color: theme.palette.info.main }} />;
        }
    };

    const formatTimeRemaining = (date: Date) => {
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        
        if (diff < 0) return 'Overdue';
        
        const minutes = Math.floor(diff / (1000 * 60));
        if (minutes < 60) return `${minutes} min`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hr`;
        
        const days = Math.floor(hours / 24);
        return `${days} days`;
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ flexGrow: 1, p: 3 }}>
            {/* Welcome Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                        Welcome back, {user?.firstName || 'Patient'}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        {format(new Date(), 'EEEE, MMMM d, yyyy')}
                    </Typography>
                </Box>
                <Box>
                    <Button 
                        variant="contained" 
                        startIcon={<AddCircleOutline />}
                        onClick={() => navigate('/diagnosis/new')}
                        sx={{ mr: 2 }}
                    >
                        New Symptom Check
                    </Button>
                    <Button 
                        variant="outlined"
                        onClick={() => navigate('/telemedicine/schedule')}
                    >
                        Schedule Appointment
                    </Button>
                </Box>
            </Box>
            
            <Grid container spacing={3}>
                {/* Health Indicators */}
                <Grid item xs={12} md={8}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                            <Assessment sx={{ mr: 1 }} />
                            Health Indicators
                        </Typography>
                        <Grid container spacing={2}>
                            {healthIndicators.map((indicator) => (
                                <Grid item xs={12} sm={6} md={3} key={indicator.name}>
                                    <Card sx={{ height: '100%', position: 'relative', boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <Typography color="text.secondary" gutterBottom>
                                                    {indicator.name}
                                                </Typography>
                                                {getTrendIcon(indicator.trend)}
                                            </Box>
                                            <Box sx={{ mt: 1 }}>
                                                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                                                    {indicator.value}
                                                    <Typography component="span" variant="body2" sx={{ ml: 0.5 }}>
                                                        {indicator.unit}
                                                    </Typography>
                                                </Typography>
                                                <Chip 
                                                    label={indicator.status} 
                                                    size="small"
                                                    sx={{ 
                                                        bgcolor: `${getStatusColor(indicator.status)}30`,
                                                        color: getStatusColor(indicator.status),
                                                        mt: 1
                                                    }} 
                                                />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Paper>
                </Grid>
                
                {/* Notifications */}
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, height: '100%', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                                <Notifications sx={{ mr: 1 }} />
                                Notifications
                            </Typography>
                            <Button size="small">View All</Button>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        {notifications.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                                No new notifications
                            </Typography>
                        ) : (
                            notifications.map((notification) => (
                                <Box key={notification.id} sx={{ mb: 2, p: 1, '&:hover': { bgcolor: 'action.hover', borderRadius: 1 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                        <Avatar 
                                            sx={{ 
                                                width: 32, 
                                                height: 32, 
                                                mr: 1,
                                                bgcolor: notification.type === 'medication' 
                                                    ? theme.palette.primary.main
                                                    : notification.type === 'appointment'
                                                    ? theme.palette.success.main
                                                    : theme.palette.info.main
                                            }}
                                        >
                                            {notification.type === 'medication' && <Medication sx={{ fontSize: 16 }} />}
                                            {notification.type === 'appointment' && <MedicalServices sx={{ fontSize: 16 }} />}
                                            {notification.type === 'lab' && <NoteAdd sx={{ fontSize: 16 }} />}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body2">{notification.message}</Typography>
                                            <Typography variant="caption" color="text.secondary">{notification.time}</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            ))
                        )}
                    </Paper>
                </Grid>
                
                {/* Upcoming Medications */}
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, height: '100%', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                                <Medication sx={{ mr: 1 }} />
                                Medications
                            </Typography>
                            <Button size="small" onClick={() => navigate('/medications')}>View All</Button>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        {medications.map((medication) => (
                            <Box 
                                key={medication.id} 
                                sx={{ 
                                    mb: 2, 
                                    p: 1.5, 
                                    borderRadius: 1,
                                    border: `1px solid ${theme.palette.divider}`,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                        {medication.name} ({medication.dosage})
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {medication.schedule}
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Chip 
                                        label={formatTimeRemaining(medication.nextDose)}
                                        size="small"
                                        color={
                                            new Date() > medication.nextDose ? 'error' :
                                            formatTimeRemaining(medication.nextDose).includes('min') ? 'warning' : 'primary'
                                        }
                                        sx={{ fontWeight: 500 }}
                                    />
                                </Box>
                            </Box>
                        ))}
                        <Button 
                            fullWidth 
                            variant="outlined" 
                            sx={{ mt: 1 }}
                            onClick={() => navigate('/medications/schedule')}
                        >
                            Medication Schedule
                        </Button>
                    </Paper>
                </Grid>
                
                {/* Upcoming Appointments */}
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, height: '100%', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                                <Videocam sx={{ mr: 1 }} />
                                Upcoming Appointments
                            </Typography>
                            <Button size="small" onClick={() => navigate('/appointments')}>View All</Button>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        {appointments.length === 0 ? (
                            <Box sx={{ py: 4, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    No upcoming appointments
                                </Typography>
                                <Button 
                                    variant="contained" 
                                    size="small" 
                                    sx={{ mt: 1 }}
                                    onClick={() => navigate('/telemedicine/schedule')}
                                >
                                    Schedule Now
                                </Button>
                            </Box>
                        ) : (
                            <>
                                {appointments.map((appointment) => (
                                    <Box 
                                        key={appointment.id} 
                                        sx={{ 
                                            mb: 2, 
                                            p: 1.5, 
                                            borderRadius: 1,
                                            border: `1px solid ${theme.palette.divider}`,
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                {appointment.doctorName}
                                            </Typography>
                                            <Chip 
                                                label={appointment.status} 
                                                size="small"
                                                sx={{ 
                                                    bgcolor: `${getStatusColor(appointment.status)}30`,
                                                    color: getStatusColor(appointment.status),
                                                }} 
                                            />
                                        </Box>
                                        <Typography variant="body2" color="text.secondary">
                                            {appointment.specialization}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                            <Typography variant="body2">
                                                {format(appointment.date, 'MMM d, yyyy')} • {appointment.time}
                                            </Typography>
                                        </Box>
                                    </Box>
                                ))}
                                <Button 
                                    fullWidth 
                                    variant="outlined" 
                                    sx={{ mt: 1 }}
                                    onClick={() => navigate('/telemedicine/waiting-room')}
                                >
                                    Enter Waiting Room
                                </Button>
                            </>
                        )}
                    </Paper>
                </Grid>
                
                {/* Recent Diagnoses */}
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, height: '100%', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                                <Timeline sx={{ mr: 1 }} />
                                Recent Diagnoses
                            </Typography>
                            <Button size="small" onClick={() => navigate('/medical-history')}>View All</Button>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        {recentDiagnoses.map((diagnosis) => (
                            <Box 
                                key={diagnosis.id} 
                                sx={{ 
                                    mb: 2, 
                                    p: 1.5,
                                    borderRadius: 1,
                                    border: `1px solid ${theme.palette.divider}`,
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                        {diagnosis.condition}
                                    </Typography>
                                    <Chip 
                                        label={diagnosis.severity} 
                                        size="small"
                                        sx={{ 
                                            bgcolor: theme.palette.info.light,
                                            color: theme.palette.info.contrastText,
                                        }}
                                    />
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                    {diagnosis.date} • {diagnosis.treatingPhysician}
                                </Typography>
                            </Box>
                        ))}
                        <Button 
                            fullWidth 
                            variant="outlined" 
                            sx={{ mt: 1 }}
                            onClick={() => navigate('/diagnosis/history')}
                        >
                            Diagnosis History
                        </Button>
                    </Paper>
                </Grid>
                
                {/* Health Metrics Chart */}
                <Grid item xs={12}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Health Metrics Trends</Typography>
                        <Box sx={{ height: 300 }}>
                            <HealthMetricsChart patientId={user?.id || ''} timeRange="30d" />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default PatientDashboard; 