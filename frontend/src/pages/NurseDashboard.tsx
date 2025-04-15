
import React, { useState, useEffect } from "react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
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
  MonitorHeart as MonitorHeartIcon,
  Assignment as AssignmentIcon,
  CalendarToday as CalendarTodayIcon,
  MedicalInformation as MedicalInformationIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

interface Patient {
  id: string;
  name: string;
  roomNumber: string;
  vitalsStatus: "pending" | "completed" | "overdue";
  nextCheck: string;
}

interface Stats {
  patientsInCare: number;
  pendingVitals: number;
  scheduledChecks: number;
  criticalCases: number;
}

const NurseDashboard: React.FC = () => {
  const theme = useTheme();
  const [stats, setStats] = useState<Stats>({
    patientsInCare: 0,
    pendingVitals: 0,
    scheduledChecks: 0,
    criticalCases: 0,
  });
  const [currentPatients, setCurrentPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated data - replace with actual API calls
    setTimeout(() => {
      setStats({
        patientsInCare: 12,
        pendingVitals: 4,
        scheduledChecks: 8,
        criticalCases: 2,
      });
      setCurrentPatients([
        { id: "1", name: "John Doe", roomNumber: "201A", vitalsStatus: "completed", nextCheck: "2:30 PM" },
        { id: "2", name: "Jane Smith", roomNumber: "105B", vitalsStatus: "pending", nextCheck: "3:15 PM" },
        { id: "3", name: "Mike Johnson", roomNumber: "302C", vitalsStatus: "overdue", nextCheck: "1:00 PM" },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getVitalsStatusColor = (status: Patient["vitalsStatus"]) => {
    switch (status) {
      case "overdue":
        return theme.palette.error.main;
      case "pending":
        return theme.palette.warning.main;
      default:
        return theme.palette.success.main;
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
              Nurse Dashboard
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
                Patients In Care
              </Typography>
              <Typography variant="h3">{stats.patientsInCare}</Typography>
              <PersonAddIcon color="primary" />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Vitals
              </Typography>
              <Typography variant="h3" color="warning.main">
                {stats.pendingVitals}
              </Typography>
              <MonitorHeartIcon color="warning" />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Scheduled Checks
              </Typography>
              <Typography variant="h3" color="primary">
                {stats.scheduledChecks}
              </Typography>
              <CalendarTodayIcon color="primary" />
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
              <MedicalInformationIcon color="error" />
            </CardContent>
          </Card>
        </Grid>

        {/* Current Patients */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2}>
            <Box p={2}>
              <Typography variant="h6" gutterBottom>
                Current Patients
              </Typography>
              <List>
                {currentPatients.map((patient) => (
                  <ListItem key={patient.id} divider>
                    <Avatar sx={{ mr: 2, bgcolor: getVitalsStatusColor(patient.vitalsStatus) }}>
                      {patient.name.charAt(0)}
                    </Avatar>
                    <ListItemText
                      primary={patient.name}
                      secondary={`Room ${patient.roomNumber} - Next Check: ${patient.nextCheck}`}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={patient.vitalsStatus}
                        color={patient.vitalsStatus === "completed" ? "success" : "warning"}
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
                    New Patient Intake
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    startIcon={<MonitorHeartIcon />}
                  >
                    Record Vitals
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    color="primary"
                    fullWidth
                    startIcon={<CalendarTodayIcon />}
                  >
                    Schedule Checks
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    fullWidth
                    startIcon={<AssignmentIcon />}
                  >
                    View Reports
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

export default NurseDashboard;
