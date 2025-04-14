import React, { useState } from 'react';
import {
    Box,
    Paper,
    Grid,
    TextField,
    Button,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    CircularProgress
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { getDoctors, scheduleAppointment } from '../../services/api/appointments';

interface Doctor {
    id: string;
    firstName: string;
    lastName: string;
    specialization: string;
    availableSlots: Date[];
}

export const AppointmentScheduler: React.FC = () => {
    const [selectedDoctor, setSelectedDoctor] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [reason, setReason] = useState('');
    const { enqueueSnackbar } = useSnackbar();

    const { data: doctors, isLoading: loadingDoctors } = useQuery<Doctor[]>(
        ['doctors'],
        getDoctors
    );

    const scheduleMutation = useMutation(scheduleAppointment, {
        onSuccess: () => {
            enqueueSnackbar('Appointment scheduled successfully!', { variant: 'success' });
            // Reset form
            setSelectedDoctor('');
            setSelectedDate(null);
            setReason('');
        },
        onError: (error: any) => {
            enqueueSnackbar(error.message || 'Failed to schedule appointment', { variant: 'error' });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDoctor || !selectedDate || !reason) {
            enqueueSnackbar('Please fill in all fields', { variant: 'warning' });
            return;
        }

        scheduleMutation.mutate({
            doctorId: selectedDoctor,
            dateTime: selectedDate,
            reason
        });
    };

    const selectedDoctorData = doctors?.find(d => d.id === selectedDoctor);

    return (
        <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
                Schedule Appointment
            </Typography>

            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Select Doctor</InputLabel>
                            <Select
                                value={selectedDoctor}
                                onChange={(e) => setSelectedDoctor(e.target.value)}
                                label="Select Doctor"
                            >
                                {loadingDoctors ? (
                                    <MenuItem disabled>Loading doctors...</MenuItem>
                                ) : (
                                    doctors?.map((doctor) => (
                                        <MenuItem key={doctor.id} value={doctor.id}>
                                            Dr. {doctor.firstName} {doctor.lastName} - {doctor.specialization}
                                        </MenuItem>
                                    ))
                                )}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <DateTimePicker
                            label="Select Date & Time"
                            value={selectedDate}
                            onChange={(newValue) => setSelectedDate(newValue)}
                            disablePast
                            shouldDisableTime={(time) => {
                                if (!selectedDoctorData) return false;
                                return !selectedDoctorData.availableSlots.some(
                                    slot => slot.getTime() === time.getTime()
                                );
                            }}
                            renderInput={(params) => <TextField {...params} fullWidth />}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Reason for Visit"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </Grid>

                    {selectedDoctorData && (
                        <Grid item xs={12}>
                            <Alert severity="info">
                                Dr. {selectedDoctorData.firstName} {selectedDoctorData.lastName} specializes in {selectedDoctorData.specialization}
                            </Alert>
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            fullWidth
                            disabled={scheduleMutation.isLoading}
                            startIcon={scheduleMutation.isLoading ? <CircularProgress size={20} /> : null}
                        >
                            Schedule Appointment
                        </Button>
                    </Grid>
                </Grid>
            </form>
        </Paper>
    );
}; 