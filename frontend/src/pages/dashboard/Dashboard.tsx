import React from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
} from '@mui/material';
import {
  People,
  LocalHospital,
  TrendingUp,
  Notifications,
} from '@mui/icons-material';
import { RootState } from '../../store';

const Dashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  const summaryCards = [
    {
      title: 'Total Patients',
      value: '150',
      icon: <People sx={{ fontSize: 40, color: 'primary.main' }} />,
    },
    {
      title: 'Diagnoses Today',
      value: '12',
      icon: <LocalHospital sx={{ fontSize: 40, color: 'success.main' }} />,
    },
    {
      title: 'Success Rate',
      value: '94%',
      icon: <TrendingUp sx={{ fontSize: 40, color: 'info.main' }} />,
    },
    {
      title: 'Pending Reviews',
      value: '5',
      icon: <Notifications sx={{ fontSize: 40, color: 'warning.main' }} />,
    },
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'diagnosis',
      patient: 'John Doe',
      action: 'New diagnosis created',
      time: '2 hours ago',
    },
    {
      id: 2,
      type: 'patient',
      patient: 'Jane Smith',
      action: 'Updated patient profile',
      time: '4 hours ago',
    },
    {
      id: 3,
      type: 'review',
      patient: 'Mike Johnson',
      action: 'Diagnosis reviewed',
      time: '5 hours ago',
    },
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ pt: 3, pb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.firstName}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's what's happening with your patients today.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {summaryCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="h4">{card.value}</Typography>
                  </Box>
                  {card.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List>
              {recentActivity.map((activity) => (
                <ListItem key={activity.id}>
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor:
                          activity.type === 'diagnosis'
                            ? 'primary.main'
                            : activity.type === 'patient'
                            ? 'success.main'
                            : 'warning.main',
                      }}
                    >
                      {activity.type === 'diagnosis' ? (
                        <LocalHospital />
                      ) : activity.type === 'patient' ? (
                        <People />
                      ) : (
                        <Notifications />
                      )}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={activity.patient}
                    secondary={`${activity.action} - ${activity.time}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard; 