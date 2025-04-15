
import React, { useState, useEffect } from "react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Avatar,
  CircularProgress,
} from "@mui/material";
import {
  PersonAdd as PersonAddIcon,
  Refresh as RefreshIcon,
  LocalHospital as LocalHospitalIcon,
  Assessment as AssessmentIcon,
  Notifications as NotificationsIcon,
  CalendarToday as CalendarTodayIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

interface Patient {
  id: string;
  name: string;
  age: number;
  condition: string;
  status: "stable" | "critical" | "improving";
  nextAppointment?: string;
}

interface Stats {
  totalPatients: number;
  criticalCases: number;
  appointmentsToday: number;
  pendingReports: number;
}

const DoctorDashboard: React.FC = () => {
  const theme = useTheme();
  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    criticalCases: 0,
    appointmentsToday: 0,
    pendingReports: 0,
  });
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated data - replace with actual API calls
    setTimeout(() => {
      setStats({
        totalPatients: 156,
        criticalCases: 3,
        appointmentsToday: 8,
        pendingReports: 5,
      });
      setRecentPatients([
        { id: "1", name: "John Doe", age: 45, condition: "Hypertension", status: "stable" },
        { id: "2", name: "Jane Smith", age: 32, condition: "Diabetes", status: "improving" },
        { id: "3", name: "Mike Johnson", age: 58, condition: "Cardiac Arrest", status: "critical" },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status: Patient["status"]) => {
    switch (status) {
      case "critical":
        return theme.palette.error.main;
      case "improving":
        return theme.palette.success.main;
      default:
        return theme.palette.info.main;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h4" component="h1">
              Doctor Dashboard
            </Typography>
            <IconButton color="primary" onClick={() => window.location.reload()}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Grid>

        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Patients
              </Typography>
              <Typography variant="h3">{stats.totalPatients}</Typography>
              <PersonAddIcon color="primary" />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Critical Cases
              </Typography>
              <Typography variant="h3" color="error">
                {stats.criticalCases}
              </Typography>
              <LocalHospitalIcon color="error" />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Today's Appointments
              </Typography>
              <Typography variant="h3" color="primary">
                {stats.appointmentsToday}
              </Typography>
              <CalendarTodayIcon color="primary" />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Reports
              </Typography>
              <Typography variant="h3" color="warning">
                {stats.pendingReports}
              </Typography>
              <AssessmentIcon color="warning" />
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Patients */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2}>
            <Box p={2}>
              <Typography variant="h6" gutterBottom>
                Recent Patients
              </Typography>
              <List>
                {recentPatients.map((patient) => (
                  <ListItem key={patient.id} divider>
                    <Avatar sx={{ mr: 2, bgcolor: getStatusColor(patient.status) }}>
                      {patient.name.charAt(0)}
                    </Avatar>
                    <ListItemText
                      primary={patient.name}
                      secondary={`${patient.age} years - ${patient.condition}`}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={patient.status}
                        color={patient.status === "critical" ? "error" : "primary"}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              <Box mt={2} display="flex" justifyContent="flex-end">
                <Button variant="outlined" color="primary">
                  View All Patients
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2}>
            <Box p={2}>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    startIcon={<PersonAddIcon />}
                  >
                    New Patient
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    startIcon={<NotificationsIcon />}
                  >
                    View Notifications
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    color="primary"
                    fullWidth
                    startIcon={<LocalHospitalIcon />}
                  >
                    Run AI Diagnosis
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    fullWidth
                    startIcon={<AssessmentIcon />}
                  >
                    Generate Reports
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DoctorDashboard;
