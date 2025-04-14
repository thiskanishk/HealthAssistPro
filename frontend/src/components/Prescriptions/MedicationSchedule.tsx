import React from 'react';
import {
    Box,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Chip,
    Divider,
    Button,
    Grid
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Notifications as NotificationsIcon
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { getMedicationSchedule, markMedicationTaken } from '../../services/api/medications';

interface MedicationDose {
    id: string;
    medicationName: string;
    dosage: string;
    scheduledTime: string;
    taken: boolean;
    notes?: string;
}

export const MedicationSchedule: React.FC<{ patientId: string }> = ({ patientId }) => {
    const { enqueueSnackbar } = useSnackbar();

    const { data: schedule, isLoading } = useQuery(
        ['medicationSchedule', patientId],
        () => getMedicationSchedule(patientId)
    );

    const markTakenMutation = useMutation(markMedicationTaken, {
        onSuccess: () => {
            enqueueSnackbar('Medication marked as taken', { variant: 'success' });
        }
    });

    const groupByTime = (doses: MedicationDose[]) => {
        return doses?.reduce((acc, dose) => {
            const time = new Date(dose.scheduledTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });
            if (!acc[time]) {
                acc[time] = [];
            }
            acc[time].push(dose);
            return acc;
        }, {} as Record<string, MedicationDose[]>);
    };

    const groupedSchedule = groupByTime(schedule || []);

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Today's Medication Schedule
            </Typography>

            <Grid container spacing={3}>
                {Object.entries(groupedSchedule || {}).map(([time, doses]) => (
                    <Grid item xs={12} md={6} key={time}>
                        <Paper elevation={3} sx={{ p: 2 }}>
                            <Typography variant="h6" color="primary" gutterBottom>
                                {time}
                            </Typography>
                            <List>
                                {doses.map((dose) => (
                                    <React.Fragment key={dose.id}>
                                        <ListItem>
                                            <ListItemText
                                                primary={dose.medicationName}
                                                secondary={
                                                    <>
                                                        <Typography
                                                            component="span"
                                                            variant="body2"
                                                            color="text.primary"
                                                        >
                                                            {dose.dosage}
                                                        </Typography>
                                                        {dose.notes && (
                                                            <Typography
                                                                component="span"
                                                                variant="body2"
                                                                color="text.secondary"
                                                            >
                                                                {` — ${dose.notes}`}
                                                            </Typography>
                                                        )}
                                                    </>
                                                }
                                            />
                                            <ListItemSecondaryAction>
                                                <IconButton
                                                    edge="end"
                                                    onClick={() => markTakenMutation.mutate(dose.id)}
                                                    disabled={dose.taken}
                                                    color={dose.taken ? 'success' : 'default'}
                                                >
                                                    {dose.taken ? <CheckCircleIcon /> : <CancelIcon />}
                                                </IconButton>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                        <Divider />
                                    </React.Fragment>
                                ))}
                            </List>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            <Box mt={3} display="flex" justifyContent="center">
                <Button
                    variant="contained"
                    startIcon={<NotificationsIcon />}
                    onClick={() => {
                        enqueueSnackbar('Medication reminders enabled', { variant: 'success' });
                    }}
                >
                    Enable Reminders
                </Button>
            </Box>
        </Box>
    );
}; 