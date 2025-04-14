import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  Dialog,
  CircularProgress
} from '@mui/material';
import {
  ExpandMore,
  Medication,
  Schedule,
  Warning,
  CheckCircle
} from '@mui/icons-material';
import { useTreatmentRecommendation } from '../hooks/useTreatmentRecommendation';

interface TreatmentPlan {
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    warnings: string[];
  }>;
  lifestyle: string[];
  followUp: string;
  precautions: string[];
  alternatives: string[];
}

export const TreatmentRecommendation: React.FC<{
  diagnosis: string;
  patientId: string;
}> = ({ diagnosis, patientId }) => {
  const [showDetails, setShowDetails] = useState(false);
  const { 
    treatmentPlan,
    loading,
    error,
    generatePlan,
    acceptPlan,
    requestAlternative
  } = useTreatmentRecommendation();

  const handleGeneratePlan = async () => {
    await generatePlan(diagnosis, patientId);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" gutterBottom>
        AI Treatment Recommendations
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : treatmentPlan ? (
        <>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" color="primary" gutterBottom>
              Primary Treatment Plan
            </Typography>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>Medications</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {treatmentPlan.medications.map((med, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Medication />
                      </ListItemIcon>
                      <ListItemText
                        primary={med.name}
                        secondary={`${med.dosage} - ${med.frequency}`}
                      />
                      {med.warnings.length > 0 && (
                        <Chip
                          icon={<Warning />}
                          label="Warnings"
                          color="warning"
                          onClick={() => setShowDetails(true)}
                        />
                      )}
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>Lifestyle Recommendations</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {treatmentPlan.lifestyle.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircle />
                      </ListItemIcon>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>Follow-up Plan</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography>{treatmentPlan.followUp}</Typography>
              </AccordionDetails>
            </Accordion>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => requestAlternative(diagnosis, patientId)}
            >
              Request Alternative
            </Button>
            <Button
              variant="contained"
              onClick={() => acceptPlan(treatmentPlan)}
            >
              Accept Plan
            </Button>
          </Box>
        </>
      ) : (
        <Button
          variant="contained"
          onClick={handleGeneratePlan}
          disabled={loading}
        >
          Generate Treatment Plan
        </Button>
      )}

      <Dialog open={showDetails} onClose={() => setShowDetails(false)}>
        {/* Detailed warnings and interactions dialog content */}
      </Dialog>
    </Paper>
  );
}; 