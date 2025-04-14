import React, { useState } from 'react';
import {
    Box,
    Paper,
    Grid,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Chip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
    Add as AddIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
    getPrescriptions,
    createPrescription,
    updatePrescription,
    deletePrescription
} from '../../services/api/prescriptions';

interface Prescription {
    id: string;
    medication: string;
    dosage: string;
    frequency: string;
    startDate: string;
    endDate: string;
    status: 'active' | 'completed' | 'cancelled';
    notes: string;
}

export const PrescriptionManager: React.FC<{ patientId: string }> = ({ patientId }) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
    const { enqueueSnackbar } = useSnackbar();
    const queryClient = useQueryClient();

    const { data: prescriptions, isLoading } = useQuery(
        ['prescriptions', patientId],
        () => getPrescriptions(patientId)
    );

    const createMutation = useMutation(createPrescription, {
        onSuccess: () => {
            queryClient.invalidateQueries(['prescriptions', patientId]);
            enqueueSnackbar('Prescription created successfully', { variant: 'success' });
            handleCloseDialog();
        }
    });

    const updateMutation = useMutation(updatePrescription, {
        onSuccess: () => {
            queryClient.invalidateQueries(['prescriptions', patientId]);
            enqueueSnackbar('Prescription updated successfully', { variant: 'success' });
            handleCloseDialog();
        }
    });

    const deleteMutation = useMutation(deletePrescription, {
        onSuccess: () => {
            queryClient.invalidateQueries(['prescriptions', patientId]);
            enqueueSnackbar('Prescription deleted successfully', { variant: 'success' });
        }
    });

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingPrescription(null);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const prescriptionData = {
            medication: formData.get('medication') as string,
            dosage: formData.get('dosage') as string,
            frequency: formData.get('frequency') as string,
            startDate: formData.get('startDate') as string,
            endDate: formData.get('endDate') as string,
            notes: formData.get('notes') as string,
            patientId
        };

        if (editingPrescription) {
            updateMutation.mutate({
                id: editingPrescription.id,
                ...prescriptionData
            });
        } else {
            createMutation.mutate(prescriptionData);
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5">Prescriptions</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setIsDialogOpen(true)}
                >
                    New Prescription
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Medication</TableCell>
                            <TableCell>Dosage</TableCell>
                            <TableCell>Frequency</TableCell>
                            <TableCell>Duration</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {prescriptions?.map((prescription) => (
                            <TableRow key={prescription.id}>
                                <TableCell>{prescription.medication}</TableCell>
                                <TableCell>{prescription.dosage}</TableCell>
                                <TableCell>{prescription.frequency}</TableCell>
                                <TableCell>
                                    {new Date(prescription.startDate).toLocaleDateString()} -
                                    {new Date(prescription.endDate).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={prescription.status}
                                        color={
                                            prescription.status === 'active'
                                                ? 'success'
                                                : prescription.status === 'completed'
                                                ? 'default'
                                                : 'error'
                                        }
                                    />
                                </TableCell>
                                <TableCell>
                                    <IconButton
                                        onClick={() => {
                                            setEditingPrescription(prescription);
                                            setIsDialogOpen(true);
                                        }}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        onClick={() => {
                                            if (window.confirm('Are you sure you want to delete this prescription?')) {
                                                deleteMutation.mutate(prescription.id);
                                            }
                                        }}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <form onSubmit={handleSubmit}>
                    <DialogTitle>
                        {editingPrescription ? 'Edit Prescription' : 'New Prescription'}
                    </DialogTitle>
                    <DialogContent>
                        <Grid container spacing={3} sx={{ mt: 1 }}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    name="medication"
                                    label="Medication"
                                    defaultValue={editingPrescription?.medication}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    name="dosage"
                                    label="Dosage"
                                    defaultValue={editingPrescription?.dosage}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    name="frequency"
                                    label="Frequency"
                                    defaultValue={editingPrescription?.frequency}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    name="startDate"
                                    label="Start Date"
                                    type="date"
                                    defaultValue={editingPrescription?.startDate}
                                    InputLabelProps={{ shrink: true }}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    name="endDate"
                                    label="End Date"
                                    type="date"
                                    defaultValue={editingPrescription?.endDate}
                                    InputLabelProps={{ shrink: true }}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    name="notes"
                                    label="Notes"
                                    multiline
                                    rows={4}
                                    defaultValue={editingPrescription?.notes}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Cancel</Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={createMutation.isLoading || updateMutation.isLoading}
                        >
                            {editingPrescription ? 'Update' : 'Create'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
}; 