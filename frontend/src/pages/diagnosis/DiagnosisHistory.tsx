import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';

interface Diagnosis {
  id: string;
  patientName: string;
  date: string;
  symptoms: string;
  aiDiagnosis: string;
  confidence: number;
  status: 'pending' | 'confirmed' | 'rejected';
}

const mockDiagnoses: Diagnosis[] = [
  {
    id: '1',
    patientName: 'John Doe',
    date: '2023-05-15',
    symptoms: 'Fever, headache, fatigue',
    aiDiagnosis: 'Common cold',
    confidence: 0.89,
    status: 'confirmed',
  },
  {
    id: '2',
    patientName: 'Jane Smith',
    date: '2023-05-14',
    symptoms: 'Chest pain, shortness of breath',
    aiDiagnosis: 'Anxiety attack',
    confidence: 0.75,
    status: 'pending',
  },
  // Add more mock data as needed
];

const DiagnosisHistory: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>(mockDiagnoses);

  useEffect(() => {
    // In a real application, fetch diagnoses from the API
    // For now, we're using mock data
  }, []);

  const filteredDiagnoses = diagnoses.filter(
    (diagnosis) =>
      diagnosis.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      diagnosis.aiDiagnosis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: Diagnosis['status']) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.7) return 'warning';
    return 'error';
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ pt: 3, pb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Diagnosis History
        </Typography>

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <TextField
              fullWidth
              placeholder="Search by patient name or diagnosis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </CardContent>
        </Card>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Symptoms</TableCell>
                <TableCell>AI Diagnosis</TableCell>
                <TableCell>Confidence</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDiagnoses.map((diagnosis) => (
                <TableRow key={diagnosis.id}>
                  <TableCell>{diagnosis.date}</TableCell>
                  <TableCell>{diagnosis.patientName}</TableCell>
                  <TableCell>{diagnosis.symptoms}</TableCell>
                  <TableCell>{diagnosis.aiDiagnosis}</TableCell>
                  <TableCell>
                    <Chip
                      label={`${(diagnosis.confidence * 100).toFixed(0)}%`}
                      color={getConfidenceColor(diagnosis.confidence)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={diagnosis.status}
                      color={getStatusColor(diagnosis.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={() => navigate(`/diagnosis/${diagnosis.id}`)}
                      size="small"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
};

export default DiagnosisHistory; 