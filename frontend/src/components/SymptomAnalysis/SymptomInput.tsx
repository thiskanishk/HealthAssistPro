import React, { useState } from 'react';
import {
    Box,
    TextField,
    Button,
    Chip,
    Autocomplete,
    Typography,
    Slider,
    Grid,
    Paper
} from '@mui/material';
import { commonSymptoms } from '../../data/medicalData';
import { SymptomAnalysisInput } from '../../types/medical';

interface Props {
    onSubmit: (data: SymptomAnalysisInput) => void;
}

export const SymptomInput: React.FC<Props> = ({ onSubmit }) => {
    const [symptoms, setSymptoms] = useState<string[]>([]);
    const [severity, setSeverity] = useState<number>(5);
    const [duration, setDuration] = useState<string>('');
    const [additionalNotes, setAdditionalNotes] = useState<string>('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData: SymptomAnalysisInput = {
            primarySymptoms: symptoms,
            severityLevel: severity,
            duration,
            additionalNotes,
            // Add other required fields...
        };
        onSubmit(formData);
    };

    return (
        <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
                Symptom Analysis
            </Typography>
            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Autocomplete
                            multiple
                            options={commonSymptoms}
                            value={symptoms}
                            onChange={(_, newValue) => setSymptoms(newValue)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Symptoms"
                                    placeholder="Enter symptoms"
                                />
                            )}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip
                                        label={option}
                                        {...getTagProps({ index })}
                                    />
                                ))
                            }
                        />
                    </Grid>
                    
                    <Grid item xs={12}>
                        <Typography gutterBottom>
                            Severity Level
                        </Typography>
                        <Slider
                            value
                            onChange={(_, newValue) => setSeverity(newValue as number)}
                            valueLabelDisplay="auto"
                        />
                    </Grid>
                    
                    <Grid item xs={12}>
                        <Typography gutterBottom>
                            Duration
                        </Typography>
                        <TextField
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            fullWidth
                        />
                    </Grid>
                    
                    <Grid item xs={12}>
                        <Typography gutterBottom>
                            Additional Notes
                        </Typography>
                        <TextField
                            value={additionalNotes}
                            onChange={(e) => setAdditionalNotes(e.target.value)}
                            fullWidth
                            multiline
                            rows={4}
                        />
                    </Grid>
                    
                    <Grid item xs={12}>
                        <Button type="submit" variant="contained" fullWidth>
                            Submit
                        </Button>
                    </Grid>
                </Grid>
            </form>
        </Paper>
    );
}; 