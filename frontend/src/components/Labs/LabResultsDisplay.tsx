import React, { useState } from 'react';
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
    Chip,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    Grid
} from '@mui/material';
import {
    TrendingUp,
    TrendingDown,
    Warning,
    Timeline,
    Info
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Line } from 'react-chartjs-2';
import { getLabResults } from '../../services/api/labs';

interface LabResult {
    id: string;
    testName: string;
    value: number;
    unit: string;
    referenceRange: {
        min: number;
        max: number;
    };
    date: string;
    status: 'normal' | 'high' | 'low' | 'critical';
    trend?: 'increasing' | 'decreasing' | 'stable';
}

export const LabResultsDisplay: React.FC<{ patientId: string }> = ({ patientId }) => {
    const [selectedTest, setSelectedTest] = useState<string | null>(null);
    const [showTrendDialog, setShowTrendDialog] = useState(false);

    const { data: labResults, isLoading } = useQuery(
        ['labResults', patientId],
        () => getLabResults(patientId)
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'normal':
                return 'success';
            case 'high':
            case 'low':
                return 'warning';
            case 'critical':
                return 'error';
            default:
                return 'default';
        }
    };

    const getTrendIcon = (trend?: string) => {
        switch (trend) {
            case 'increasing':
                return <TrendingUp color="error" />;
            case 'decreasing':
                return <TrendingDown color="primary" />;
            default:
                return null;
        }
    };

    const renderTrendChart = (testName: string) => {
        const testHistory = labResults?.history?.[testName] || [];
        
        const data = {
            labels: testHistory.map(result => 
                format(new Date(result.date), 'MMM d')
            ),
            datasets: [{
                label: testName,
                data: testHistory.map(result => result.value),
                fill: false,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        };

        return <Line data={data} />;
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Lab Results
            </Typography>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Test Name</TableCell>
                            <TableCell align="right">Value</TableCell>
                            <TableCell align="right">Reference Range</TableCell>
                            <TableCell align="center">Status</TableCell>
                            <TableCell align="center">Trend</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {labResults?.recent.map((result: LabResult) => (
                            <TableRow key={result.id}>
                                <TableCell>{result.testName}</TableCell>
                                <TableCell align="right">
                                    {result.value} {result.unit}
                                </TableCell>
                                <TableCell align="right">
                                    {result.referenceRange.min} - {result.referenceRange.max} {result.unit}
                                </TableCell>
                                <TableCell align="center">
                                    <Chip
                                        label={result.status}
                                        color={getStatusColor(result.status)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    {getTrendIcon(result.trend)}
                                </TableCell>
                                <TableCell>
                                    {format(new Date(result.date), 'PPP')}
                                </TableCell>
                                <TableCell>
                                    <IconButton
                                        onClick={() => {
                                            setSelectedTest(result.testName);
                                            setShowTrendDialog(true);
                                        }}
                                    >
                                        <Timeline />
                                    </IconButton>
                                    <IconButton>
                                        <Info />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog
                open={showTrendDialog}
                onClose={() => setShowTrendDialog(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {selectedTest} - Historical Trend
                </DialogTitle>
                <DialogContent>
                    <Box height={400}>
                        {selectedTest && renderTrendChart(selectedTest)}
                    </Box>
                </DialogContent>
            </Dialog>
        </Box>
    );
}; 