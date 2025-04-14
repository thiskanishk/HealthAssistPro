/**
 * TelemedicineHistory Component
 * 
 * Displays a history of past telemedicine consultations with:
 * - Consultation details
 * - Session recordings (if available)
 * - Doctor's notes
 * - Prescriptions and follow-up recommendations
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Collapse,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  Download,
  Visibility,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';

interface ConsultationHistory {
  _id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  dateTime: string;
  duration: number;
  type: string;
  status: string;
  symptoms: string[];
  diagnosis: string;
  prescription?: string;
  followUpDate?: string;
  notes: string;
  recordingUrl?: string;
}

interface RowProps {
  consultation: ConsultationHistory;
  onViewRecording: (url: string) => void;
}

const ConsultationRow: React.FC<RowProps> = ({ consultation, onViewRecording }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell>{format(new Date(consultation.dateTime), 'PPpp')}</TableCell>
        <TableCell>{consultation.doctorName}</TableCell>
        <TableCell>{consultation.type}</TableCell>
        <TableCell>
          <Chip
            label={consultation.status}
            color={consultation.status === 'completed' ? 'success' : 'default'}
          />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Consultation Details
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Symptoms:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {consultation.symptoms.map((symptom, index) => (
                    <Chip key={index} label={symptom} size="small" />
                  ))}
                </Box>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Diagnosis:
                </Typography>
                <Typography variant="body2">{consultation.diagnosis}</Typography>
              </Box>
              {consultation.prescription && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Prescription:
                  </Typography>
                  <Typography variant="body2">{consultation.prescription}</Typography>
                  <Button
                    startIcon={<Download />}
                    size="small"
                    sx={{ mt: 1 }}
                    onClick={() => {
                      // Handle prescription download
                    }}
                  >
                    Download Prescription
                  </Button>
                </Box>
              )}
              {consultation.followUpDate && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Follow-up Date:
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(consultation.followUpDate), 'PPpp')}
                  </Typography>
                </Box>
              )}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Doctor's Notes:
                </Typography>
                <Typography variant="body2">{consultation.notes}</Typography>
              </Box>
              {consultation.recordingUrl && (
                <Button
                  startIcon={<Visibility />}
                  variant="outlined"
                  size="small"
                  onClick={() => onViewRecording(consultation.recordingUrl!)}
                >
                  View Recording
                </Button>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const TelemedicineHistory: React.FC = () => {
  const [consultations, setConsultations] = useState<ConsultationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordingDialogOpen, setRecordingDialogOpen] = useState(false);
  const [selectedRecordingUrl, setSelectedRecordingUrl] = useState<string>('');

  const { user } = useAuth();

  useEffect(() => {
    const fetchConsultationHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/telemedicine/history/${user.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch consultation history');
        }

        const data = await response.json();
        setConsultations(data);
      } catch (err) {
        setError('Failed to load consultation history. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchConsultationHistory();
  }, [user.id]);

  const handleViewRecording = (url: string) => {
    setSelectedRecordingUrl(url);
    setRecordingDialogOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Consultation History
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table aria-label="consultation history">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Date & Time</TableCell>
              <TableCell>Doctor</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {consultations.map((consultation) => (
              <ConsultationRow
                key={consultation._id}
                consultation={consultation}
                onViewRecording={handleViewRecording}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={recordingDialogOpen}
        onClose={() => setRecordingDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Consultation Recording</DialogTitle>
        <DialogContent>
          <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
            <iframe
              src={selectedRecordingUrl}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              allow="camera; microphone; fullscreen"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecordingDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TelemedicineHistory; 