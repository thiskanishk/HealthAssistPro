import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Chip,
    List,
    ListItem,
    ListItemText,
    Alert,
    Divider,
    Grid
} from '@mui/material';
import { SymptomAnalysisOutput, Diagnosis } from '../../types/medical';

interface Props {
    analysis: SymptomAnalysisOutput;
}

export const AnalysisResults: React.FC<Props> = ({ analysis }) => {
    const getUrgencyColor = (level: string) => {
        switch (level) {
            case 'immediate': return 'error';
            case 'urgent': return 'warning';
            default: return 'info';
        }
    };

    const renderDiagnosis = (diagnosis: Diagnosis) => (
        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
                {diagnosis.condition}
                <Chip
                    label={`${(diagnosis.confidence * 100).toFixed(1)}%`}
                    color={diagnosis.confidence > 0.7 ? 'success' : 'warning'}
                    size="small"
                    sx={{ ml: 1 }}
                />
            </Typography>
            
            <Typography variant="body1" paragraph>
                {diagnosis.description}
            </Typography>

            <Typography variant="subtitle1" gutterBottom>
                Suggested Tests:
            </Typography>
            <List dense>
                {diagnosis.suggestedTests.map((test, index) => (
                    <ListItem key={index}>
                        <ListItemText primary={test} />
                    </ListItem>
                ))}
            </List>

            <Typography variant="subtitle1" gutterBottom>
                Suggested Medications:
            </Typography>
            <List dense>
                {diagnosis.suggestedMedications.map((med, index) => (
                    <ListItem key={index}>
                        <ListItemText primary={med} />
                    </ListItem>
                ))}
            </List>
        </Paper>
    );

    return (
        <Box sx={{ mt: 3 }}>
            <Alert severity={getUrgencyColor(analysis.urgencyLevel)} sx={{ mb: 2 }}>
                Urgency Level: {analysis.urgencyLevel.toUpperCase()}
            </Alert>

            {analysis.redFlags.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        Red Flags:
                    </Typography>
                    <List dense>
                        {analysis.redFlags.map((flag, index) => (
                            <ListItem key={index}>
                                <ListItemText primary={flag} />
                            </ListItem>
                        ))}
                    </List>
                </Alert>
            )}

            <Typography variant="h5" gutterBottom>
                Potential Diagnoses
            </Typography>
            {analysis.diagnoses.map((diagnosis, index) => (
                <Box key={index} sx={{ mb: 3 }}>
                    {renderDiagnosis(diagnosis)}
                </Box>
            ))}

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                        Recommended Tests
                    </Typography>
                    <List>
                        {analysis.recommendedTests.map((test, index) => (
                            <ListItem key={index}>
                                <ListItemText primary={test} />
                            </ListItem>
                        ))}
                    </List>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                        Lifestyle Recommendations
                    </Typography>
                    <List>
                        {analysis.lifestyleRecommendations.map((rec, index) => (
                            <ListItem key={index}>
                                <ListItemText primary={rec} />
                            </ListItem>
                        ))}
                    </List>
                </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }}>
                {analysis.disclaimer}
            </Alert>
        </Box>
    );
}; 