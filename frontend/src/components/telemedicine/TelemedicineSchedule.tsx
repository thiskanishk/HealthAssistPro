/**
 * TelemedicineSchedule Component
 * 
 * Manages telemedicine appointments scheduling and viewing:
 * - Calendar view of available slots
 * - Appointment booking and cancellation
 * - Upcoming appointments list
 * - Integration with video consultation
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface Appointment {
  _id: string;
  patientId: string;
  doctorId: string;
  dateTime: string;
  duration: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  type: 'initial' | 'follow_up' | 'consultation';
  notes?: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

const TelemedicineSchedule: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [appointmentType, setAppointmentType] = useState<Appointment['type']>('initial');
  const [appointmentNotes, setAppointmentNotes] = useState('');

  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch appointments and available slots for the selected date
  useEffect(() => {
    const fetchScheduleData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [appointmentsResponse, slotsResponse] = await Promise.all([
          fetch(`/api/telemedicine/appointments?date=${format(selectedDate, 'yyyy-MM-dd')}&userId=${user.id}`),
          fetch(`/api/telemedicine/slots?date=${format(selectedDate, 'yyyy-MM-dd')}`)
        ]);

        if (!appointmentsResponse.ok || !slotsResponse.ok) {
          throw new Error('Failed to fetch schedule data');
        }

        const [appointmentsData, slotsData] = await Promise.all([
          appointmentsResponse.json(),
          slotsResponse.json()
        ]);

        setAppointments(appointmentsData);
        setAvailableSlots(slotsData);
      } catch (err) {
        setError('Failed to load schedule. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchScheduleData();
  }, [selectedDate, user.id]);

  // Handle appointment booking
  const handleBookAppointment = async () => {
    if (!selectedSlot) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/telemedicine/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: user.id,
          dateTime: selectedSlot.startTime,
          duration: 30, // Default duration in minutes
          type: appointmentType,
          notes: appointmentNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to book appointment');
      }

      const appointment = await response.json();
      setAppointments([...appointments, appointment]);
      setShowBookingDialog(false);
      setSelectedSlot(null);
      setAppointmentType('initial');
      setAppointmentNotes('');
    } catch (err) {
      setError('Failed to book appointment. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle appointment cancellation
  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/telemedicine/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'cancelled',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel appointment');
      }

      setAppointments(appointments.map(apt => 
        apt._id === appointmentId ? { ...apt, status: 'cancelled' } : apt
      ));
    } catch (err) {
      setError('Failed to cancel appointment. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Join video consultation
  const handleJoinSession = (appointmentId: string) => {
    navigate(`/telemedicine/session/${appointmentId}`);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Telemedicine Schedule
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateCalendar
                value={selectedDate}
                onChange={(newDate) => newDate && setSelectedDate(newDate)}
                loading={loading}
              />
            </LocalizationProvider>

            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Available Slots
              </Typography>
              {loading ? (
                <CircularProgress />
              ) : (
                <Grid container spacing={1}>
                  {availableSlots.map((slot) => (
                    <Grid item xs={6} sm={4} key={slot.startTime}>
                      <Button
                        variant="outlined"
                        fullWidth
                        disabled={!slot.available}
                        onClick={() => {
                          setSelectedSlot(slot);
                          setShowBookingDialog(true);
                        }}
                      >
                        {format(new Date(slot.startTime), 'HH:mm')}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Upcoming Appointments
            </Typography>
            {loading ? (
              <CircularProgress />
            ) : (
              appointments
                .filter(apt => apt.status !== 'cancelled')
                .map(appointment => (
                  <Box
                    key={appointment._id}
                    sx={{
                      mb: 2,
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="subtitle1">
                      {format(new Date(appointment.dateTime), 'PPpp')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Type: {appointment.type}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      {appointment.status === 'scheduled' && (
                        <>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleJoinSession(appointment._id)}
                            sx={{ mr: 1 }}
                          >
                            Join Session
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            onClick={() => handleCancelAppointment(appointment._id)}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </Box>
                  </Box>
                ))
            )}
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={showBookingDialog} onClose={() => setShowBookingDialog(false)}>
        <DialogTitle>Book Appointment</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Appointment Type"
            value={appointmentType}
            onChange={(e) => setAppointmentType(e.target.value as Appointment['type'])}
            margin="normal"
          >
            <option value="initial">Initial Consultation</option>
            <option value="follow_up">Follow-up</option>
            <option value="consultation">General Consultation</option>
          </TextField>
          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={4}
            value={appointmentNotes}
            onChange={(e) => setAppointmentNotes(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBookingDialog(false)}>Cancel</Button>
          <Button
            onClick={handleBookAppointment}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Book'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TelemedicineSchedule; 