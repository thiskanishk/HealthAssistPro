import React, { useState } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    Grid,
    Autocomplete,
    Chip,
    CircularProgress
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation } from '@tanstack/react-query';
import { createDiagnosis } from '../../services/api/diagnosis';
import { commonSymptoms } from '../../data/medical';
import { useSnackbar } from 'notistack';

const schema = yup.object().shape({
    symptoms: yup.array().min(1, 'At least one symptom is required'),
    diagnosis: yup.string().required('Diagnosis is required'),
    notes: yup.string(),
    severity: yup.string().required('Severity is required'),
    treatment: yup.string().required('Treatment plan is required')
});

interface DiagnosisFormProps {
    patientId: string;
    onSuccess: () => void;
}

export const DiagnosisForm: React.FC<DiagnosisFormProps> = ({ patientId, onSuccess }) => {
    const { enqueueSnackbar } = useSnackbar();
    const { control, handleSubmit, formState: { errors } } = useForm({
        resolver: yupResolver(schema)
    });

    const diagnosisMutation = useMutation({
        mutationFn: createDiagnosis,
        onSuccess: () => {
            enqueueSnackbar('Diagnosis created successfully', { variant: 'success' });
            onSuccess();
        },
        onError: (error) => {
            enqueueSnackbar('Error creating diagnosis', { variant: 'error' });
        }
    });

    const onSubmit = (data: any) => {
        diagnosisMutation.mutate({
            ...data,
            patientId
        });
    };

    return (
        <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                New Diagnosis
            </Typography>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Controller
                            name="symptoms"
                            control={control}
                            defaultValue={[]}
                            render={({ field }) => (
                                <Autocomplete
                                    multiple
                                    options={commonSymptoms}
                                    onChange={(_, value) => field.onChange(value)}
                                    renderTags={(value, getTagProps) =>
                                        value.map((option, index) => (
                                            <Chip
                                                label={option}
                                                {...getTagProps({ index })}
                                            />
                                        ))
                                    }
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Symptoms"
                                            error={!!errors.symptoms}
                                            helperText={errors.symptoms?.message}
                                        />
                                    )}
                                />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Controller
                            name="diagnosis"
                            control={control}
                            defaultValue=""
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    label="Diagnosis"
                                    error={!!errors.diagnosis}
                                    helperText={errors.diagnosis?.message}
                                />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Controller
                            name="treatment"
                            control={control}
                            defaultValue=""
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    multiline
                                    rows={4}
                                    label="Treatment Plan"
                                    error={!!errors.treatment}
                                    helperText={errors.treatment?.message}
                                />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={diagnosisMutation.isLoading}
                            startIcon={diagnosisMutation.isLoading ? <CircularProgress size={20} /> : null}
                        >
                            Create Diagnosis
                        </Button>
                    </Grid>
                </Grid>
            </form>
        </Paper>
    );
}; 