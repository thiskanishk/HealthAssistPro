import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
} from '@mui/material';

interface TechnicalIssueDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (issue: string) => void;
}

const commonIssues = [
  'Audio not working',
  'Video not working',
  'Poor video quality',
  'Audio lag/delay',
  'Connection unstable',
  'Screen sharing issues',
  'Cannot hear other participant',
  'Cannot see other participant',
  'Browser compatibility issues',
];

const TechnicalIssueDialog: React.FC<TechnicalIssueDialogProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const [issueType, setIssueType] = useState('');
  const [customIssue, setCustomIssue] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    try {
      if (!issueType) {
        setError('Please select an issue type');
        return;
      }

      const issueDescription = issueType === 'other' 
        ? customIssue 
        : `${issueType}${description ? `: ${description}` : ''}`;

      onSubmit(issueDescription);
      handleClose();
    } catch (error) {
      console.error('Error submitting technical issue:', error);
      setError('Failed to submit technical issue');
    }
  };

  const handleClose = () => {
    setIssueType('');
    setCustomIssue('');
    setDescription('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Report Technical Issue</DialogTitle>
      <DialogContent>
        {error && (
          <Box mb={2}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}
        <Box mb={2}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Please provide details about the technical issue you're experiencing.
            This will help us diagnose and resolve the problem quickly.
          </Typography>
        </Box>
        <FormControl fullWidth margin="normal">
          <InputLabel>Issue Type</InputLabel>
          <Select
            value={issueType}
            onChange={e => setIssueType(e.target.value)}
            label="Issue Type"
          >
            {commonIssues.map(issue => (
              <MenuItem key={issue} value={issue}>
                {issue}
              </MenuItem>
            ))}
            <MenuItem value="other">Other (specify)</MenuItem>
          </Select>
        </FormControl>

        {issueType === 'other' && (
          <TextField
            fullWidth
            label="Specify Issue"
            value={customIssue}
            onChange={e => setCustomIssue(e.target.value)}
            margin="normal"
            required
          />
        )}

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Additional Details"
          value={description}
          onChange={e => setDescription(e.target.value)}
          margin="normal"
          placeholder="Please provide any additional details that might help us understand and resolve the issue."
        />

        <Box mt={2}>
          <Typography variant="caption" color="textSecondary">
            Quick Troubleshooting Tips:
          </Typography>
          <ul>
            <Typography variant="caption" component="li" color="textSecondary">
              Check your internet connection
            </Typography>
            <Typography variant="caption" component="li" color="textSecondary">
              Ensure microphone and camera permissions are granted
            </Typography>
            <Typography variant="caption" component="li" color="textSecondary">
              Try refreshing the page
            </Typography>
            <Typography variant="caption" component="li" color="textSecondary">
              Check if your device meets system requirements
            </Typography>
          </ul>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} color="primary" variant="contained">
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TechnicalIssueDialog; 