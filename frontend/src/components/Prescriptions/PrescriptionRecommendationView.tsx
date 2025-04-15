import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Divider,
  IconButton,
  Grid,
  Paper,
  Tooltip,
  Alert,
  Collapse,
  CircularProgress,
  useTheme,
  Rating,
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
  CheckCircleOutline,
  ErrorOutline,
  WarningAmber,
  Info,
  ThumbUp,
  ThumbDown,
  Send,
  ExpandMore,
  ExpandLess,
  Help,
  FilterList,
  SyncAlt,
  AddCircleOutline,
  Edit,
  Close
} from '@mui/icons-material';

// Define types
interface DrugInteractionRisk {
  interactingDrug: string;
  severity: 'high' | 'moderate' | 'low';
  description: string;
}

interface PrescriptionSuggestion {
  medicationName: string;
  genericName?: string;
  brandNames?: string[];
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  warnings: string[];
  contraindications: string[];
  sideEffects: string[];
  alternatives: string[];
  interactionRisks: DrugInteractionRisk[];
  status: 'recommended' | 'alternative' | 'use_with_caution' | 'not_recommended';
  efficacyInfo?: {
    efficacyScore: number;
    evidenceLevel: 'high' | 'moderate' | 'low' | 'insufficient';
    recommendationStrength: 'strong' | 'moderate' | 'conditional' | 'against';
  };
  safetyAlerts?: {
    type: string;
    severity: string;
    message: string;
  }[];
  dosageAnalysis?: {
    isAppropriate: boolean;
    message?: string;
  };
  compatibility?: {
    patientFactors: Array<{
      factor: string;
      isCompatible: boolean;
      notes: string;
    }>;
    diseaseFactors: Array<{
      condition: string;
      isCompatible: boolean;
      notes: string;
    }>;
  };
}

// Prop type definition
interface PrescriptionRecommendationViewProps {
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientWeight?: number;
  diagnosis?: string;
  symptoms?: string[];
  loading?: boolean;
  error?: string;
  recommendations?: PrescriptionSuggestion[];
  onPrescribe: (medication: PrescriptionSuggestion, notes?: string) => void;
  onRequestAlternatives: (medication: PrescriptionSuggestion) => void;
  onFeedback: (medicationName: string, isPositive: boolean, feedback: string) => void;
}

export const PrescriptionRecommendationView: React.FC<PrescriptionRecommendationViewProps> = ({
  patientId,
  patientName,
  patientAge,
  patientWeight,
  diagnosis,
  symptoms,
  loading = false,
  error = '',
  recommendations = [],
  onPrescribe,
  onRequestAlternatives,
  onFeedback
}) => {
  const theme = useTheme();
  const [expandedMedication, setExpandedMedication] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [feedbackDialog, setFeedbackDialog] = useState<{ open: boolean; medication: string; isPositive: boolean }>({
    open: false,
    medication: '',
    isPositive: true
  });
  const [feedbackText, setFeedbackText] = useState('');
  const [prescribeDialog, setPrescribeDialog] = useState<{ open: boolean; medication: PrescriptionSuggestion | null }>({
    open: false,
    medication: null
  });
  const [prescriptionNotes, setPrescriptionNotes] = useState('');

  const toggleExpand = (medicationName: string) => {
    setExpandedMedication(expandedMedication === medicationName ? null : medicationName);
  };

  const handlePrescribe = (medication: PrescriptionSuggestion) => {
    setPrescribeDialog({
      open: true,
      medication
    });
  };

  const handlePrescribeConfirm = () => {
    if (prescribeDialog.medication) {
      onPrescribe(prescribeDialog.medication, prescriptionNotes);
      setPrescribeDialog({
        open: false,
        medication: null
      });
      setPrescriptionNotes('');
    }
  };

  const handleFeedbackOpen = (medicationName: string, isPositive: boolean) => {
    setFeedbackDialog({
      open: true,
      medication: medicationName,
      isPositive
    });
  };

  const handleFeedbackSubmit = () => {
    onFeedback(feedbackDialog.medication, feedbackDialog.isPositive, feedbackText);
    setFeedbackDialog({
      open: false,
      medication: '',
      isPositive: true
    });
    setFeedbackText('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'recommended':
        return theme.palette.success;
      case 'alternative':
        return theme.palette.info;
      case 'use_with_caution':
        return theme.palette.warning;
      case 'not_recommended':
        return theme.palette.error;
      default:
        return theme.palette.primary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'recommended':
        return <CheckCircleOutline />;
      case 'alternative':
        return <Info />;
      case 'use_with_caution':
        return <WarningAmber />;
      case 'not_recommended':
        return <ErrorOutline />;
      default:
        return <Info />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'recommended':
        return 'Recommended';
      case 'alternative':
        return 'Alternative';
      case 'use_with_caution':
        return 'Use with caution';
      case 'not_recommended':
        return 'Not recommended';
      default:
        return status;
    }
  };

  const filteredRecommendations = filterStatus
    ? recommendations.filter(rec => rec.status === filterStatus)
    : recommendations;

  return (
    <Box>
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: 2,
          background: `linear-gradient(45deg, ${theme.palette.primary.main}15, ${theme.palette.primary.light}10)`,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 1 }}>
              AI-Generated Prescription Recommendations
            </Typography>
            <Typography variant="body1" color="text.secondary">
              For patient: {patientName} {patientAge ? `(${patientAge} years)` : ''} 
              {patientWeight ? `, ${patientWeight} kg` : ''}
            </Typography>
            {diagnosis && (
              <Typography variant="body1" sx={{ mt: 1 }}>
                <strong>Diagnosis:</strong> {diagnosis}
              </Typography>
            )}
            {symptoms && symptoms.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                <Typography variant="body2" sx={{ mr: 1 }}>
                  <strong>Symptoms:</strong>
                </Typography>
                {symptoms.map((symptom, idx) => (
                  <Chip 
                    key={idx} 
                    label={symptom} 
                    size="small" 
                    sx={{ 
                      bgcolor: `${theme.palette.primary.main}20`,
                      color: theme.palette.primary.main
                    }} 
                  />
                ))}
              </Box>
            )}
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControl sx={{ minWidth: 200, mr: 1 }}>
                <InputLabel id="filter-status-label">Filter by status</InputLabel>
                <Select
                  labelId="filter-status-label"
                  value={filterStatus || ''}
                  label="Filter by status"
                  onChange={(e) => setFilterStatus(e.target.value as string || null)}
                  size="small"
                  startAdornment={<FilterList fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />}
                >
                  <MenuItem value="">All recommendations</MenuItem>
                  <MenuItem value="recommended">Recommended</MenuItem>
                  <MenuItem value="alternative">Alternative</MenuItem>
                  <MenuItem value="use_with_caution">Use with caution</MenuItem>
                  <MenuItem value="not_recommended">Not recommended</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {error && !loading && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && filteredRecommendations.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No recommendations available. Try adjusting your filter or updating the patient information.
          </Typography>
        </Paper>
      )}

      <Grid container spacing={3}>
        {filteredRecommendations.map((medication) => (
          <Grid item xs={12} key={medication.medicationName}>
            <Card 
              elevation={0} 
              sx={{ 
                borderRadius: 2,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.07)',
                position: 'relative',
                overflow: 'visible',
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)',
                }
              }}
            >
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: 16, 
                  right: 16, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1
                }}
              >
                <Tooltip title={getStatusText(medication.status)}>
                  <Chip 
                    icon={getStatusIcon(medication.status)} 
                    label={getStatusText(medication.status)}
                    size="small"
                    sx={{ 
                      bgcolor: `${getStatusColor(medication.status).main}15`,
                      color: getStatusColor(medication.status).main,
                      fontWeight: 500,
                      borderRadius: '12px'
                    }}
                  />
                </Tooltip>
              </Box>

              <CardContent sx={{ pt: 3, pb: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {medication.medicationName}
                      {medication.genericName && 
                        <Typography 
                          component="span" 
                          variant="body2" 
                          sx={{ ml: 1, color: 'text.secondary', fontWeight: 'normal' }}
                        >
                          ({medication.genericName})
                        </Typography>
                      }
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, mt: 0.5, color: 'text.secondary' }}>
                      <Typography variant="body2">
                        <strong>Dosage:</strong> {medication.dosage}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Frequency:</strong> {medication.frequency}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Duration:</strong> {medication.duration}
                      </Typography>
                    </Box>

                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Instructions:</strong> {medication.instructions}
                    </Typography>

                    {medication.interactionRisks.length > 0 && (
                      <Box sx={{ mt: 1, mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                          <WarningAmber fontSize="small" sx={{ mr: 0.5, color: theme.palette.warning.main }} />
                          Potential Interactions:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                          {medication.interactionRisks.slice(0, 3).map((risk, idx) => (
                            <Tooltip 
                              key={idx} 
                              title={
                                <React.Fragment>
                                  <Typography variant="body2"><strong>{risk.interactingDrug}</strong></Typography>
                                  <Typography variant="body2">{risk.description}</Typography>
                                </React.Fragment>
                              }
                            >
                              <Chip 
                                label={risk.interactingDrug}
                                size="small"
                                sx={{ 
                                  bgcolor: risk.severity === 'high' 
                                    ? `${theme.palette.error.main}15` 
                                    : risk.severity === 'moderate'
                                    ? `${theme.palette.warning.main}15`
                                    : `${theme.palette.info.main}15`,
                                  color: risk.severity === 'high' 
                                    ? theme.palette.error.main 
                                    : risk.severity === 'moderate'
                                    ? theme.palette.warning.main
                                    : theme.palette.info.main,
                                }}
                              />
                            </Tooltip>
                          ))}
                          {medication.interactionRisks.length > 3 && (
                            <Chip 
                              label={`+${medication.interactionRisks.length - 3} more`} 
                              size="small" 
                              onClick={() => toggleExpand(medication.medicationName)}
                              sx={{ 
                                bgcolor: `${theme.palette.secondary.main}15`,
                                color: theme.palette.secondary.main 
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    )}
                  </Grid>

                  <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Box>
                      {medication.efficacyInfo && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            Efficacy for this condition:
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <Rating 
                              value={medication.efficacyInfo.efficacyScore / 20} 
                              precision={0.5} 
                              readOnly 
                              size="small"
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                              {medication.efficacyInfo.evidenceLevel} evidence
                            </Typography>
                          </Box>
                        </Box>
                      )}

                      {medication.compatibility && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            Patient Compatibility:
                          </Typography>
                          {medication.compatibility.patientFactors.map((factor, idx) => (
                            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                              {factor.isCompatible ? (
                                <CheckCircleOutline fontSize="small" sx={{ color: theme.palette.success.main, mr: 0.5 }} />
                              ) : (
                                <WarningAmber fontSize="small" sx={{ color: theme.palette.warning.main, mr: 0.5 }} />
                              )}
                              <Typography variant="body2" color="text.secondary">
                                {factor.factor}: {factor.notes}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', mt: { xs: 2, md: 0 } }}>
                      {medication.status !== 'not_recommended' && (
                        <Button 
                          variant="contained" 
                          color="primary"
                          onClick={() => handlePrescribe(medication)}
                          sx={{ mb: 1 }}
                        >
                          Prescribe
                        </Button>
                      )}
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          color="primary"
                          size="small"
                          fullWidth
                          onClick={() => onRequestAlternatives(medication)}
                          startIcon={<SyncAlt />}
                        >
                          Alternatives
                        </Button>
                        <Button
                          variant="outlined"
                          color="inherit"
                          size="small"
                          onClick={() => toggleExpand(medication.medicationName)}
                          fullWidth
                          endIcon={expandedMedication === medication.medicationName ? <ExpandLess /> : <ExpandMore />}
                        >
                          Details
                        </Button>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>

                <Collapse in={expandedMedication === medication.medicationName}>
                  <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          Warnings
                        </Typography>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {medication.warnings.map((warning, idx) => (
                            <li key={idx}>
                              <Typography variant="body2">{warning}</Typography>
                            </li>
                          ))}
                        </ul>

                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
                          Side Effects
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {medication.sideEffects.map((effect, idx) => (
                            <Chip 
                              key={idx} 
                              label={effect} 
                              size="small" 
                              sx={{ 
                                bgcolor: `${theme.palette.grey[200]}`,
                                color: theme.palette.text.primary
                              }}
                            />
                          ))}
                        </Box>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          Contraindications
                        </Typography>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {medication.contraindications.map((contraindication, idx) => (
                            <li key={idx}>
                              <Typography variant="body2">{contraindication}</Typography>
                            </li>
                          ))}
                        </ul>

                        {medication.interactionRisks.length > 0 && (
                          <>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
                              Detailed Interaction Risks
                            </Typography>
                            {medication.interactionRisks.map((risk, idx) => (
                              <Box 
                                key={idx} 
                                sx={{ 
                                  mb: 1, 
                                  p: 1, 
                                  borderRadius: 1, 
                                  bgcolor: risk.severity === 'high' 
                                    ? `${theme.palette.error.main}10` 
                                    : risk.severity === 'moderate'
                                    ? `${theme.palette.warning.main}10`
                                    : `${theme.palette.info.main}10`,
                                }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {risk.interactingDrug}
                                  <Chip 
                                    label={risk.severity} 
                                    size="small" 
                                    sx={{ 
                                      ml: 1,
                                      bgcolor: risk.severity === 'high' 
                                        ? theme.palette.error.main 
                                        : risk.severity === 'moderate'
                                        ? theme.palette.warning.main
                                        : theme.palette.info.main,
                                      color: '#fff'
                                    }} 
                                  />
                                </Typography>
                                <Typography variant="body2">{risk.description}</Typography>
                              </Box>
                            ))}
                          </>
                        )}
                      </Grid>

                      <Grid item xs={12}>
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            gap: 2, 
                            mt: 2, 
                            pt: 2,
                            borderTop: `1px solid ${theme.palette.divider}` 
                          }}
                        >
                          <Button
                            variant="outlined"
                            color="primary"
                            size="small"
                            startIcon={<ThumbUp />}
                            onClick={() => handleFeedbackOpen(medication.medicationName, true)}
                          >
                            Helpful
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<ThumbDown />}
                            onClick={() => handleFeedbackOpen(medication.medicationName, false)}
                          >
                            Not Helpful
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Feedback Dialog */}
      <Dialog
        open={feedbackDialog.open}
        onClose={() => setFeedbackDialog({ ...feedbackDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {feedbackDialog.isPositive ? 'What was helpful?' : 'What could be improved?'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Your feedback"
            fullWidth
            multiline
            rows={4}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialog({ ...feedbackDialog, open: false })}>
            Cancel
          </Button>
          <Button 
            onClick={handleFeedbackSubmit} 
            variant="contained" 
            startIcon={<Send />}
            disabled={!feedbackText.trim()}
          >
            Submit Feedback
          </Button>
        </DialogActions>
      </Dialog>

      {/* Prescribe Dialog */}
      <Dialog
        open={prescribeDialog.open}
        onClose={() => setPrescribeDialog({ open: false, medication: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Prescribe {prescribeDialog.medication?.medicationName}
        </DialogTitle>
        <DialogContent>
          {prescribeDialog.medication && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Dosage:</strong> {prescribeDialog.medication.dosage}{', '}
                <strong>Frequency:</strong> {prescribeDialog.medication.frequency}{', '}
                <strong>Duration:</strong> {prescribeDialog.medication.duration}
              </Typography>
              
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Instructions:</strong> {prescribeDialog.medication.instructions}
              </Typography>
              
              <TextField
                margin="dense"
                label="Additional notes for prescription"
                fullWidth
                multiline
                rows={3}
                value={prescriptionNotes}
                onChange={(e) => setPrescriptionNotes(e.target.value)}
                variant="outlined"
                placeholder="Add any additional instructions or notes for the patient..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrescribeDialog({ open: false, medication: null })}>
            Cancel
          </Button>
          <Button 
            onClick={handlePrescribeConfirm} 
            variant="contained" 
            color="primary"
          >
            Confirm Prescription
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PrescriptionRecommendationView; 