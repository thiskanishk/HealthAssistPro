import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Tooltip,
  Alert
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  Timer as TimerIcon,
  Save,
  NotificationsActive
} from '@mui/icons-material';

interface VisitTimerProps {
  patientId: string;
  patientName: string;
  onSave: (data: VisitData) => void;
  recommendedDuration?: number; // in minutes
}

interface VisitData {
  patientId: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in seconds
  notes: string;
  overTime: boolean;
}

const VisitTimer: React.FC<VisitTimerProps> = ({
  patientId,
  patientName,
  onSave,
  recommendedDuration = 15
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const [showWarning, setShowWarning] = useState(false);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsRunning(true);
    setStartTime(new Date());
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleStop = () => {
    setShowSaveDialog(true);
  };

  const handleSave = () => {
    if (startTime) {
      const visitData: VisitData = {
        patientId,
        startTime,
        endTime: new Date(),
        duration: time,
        notes,
        overTime: time > recommendedDuration * 60
      };
      onSave(visitData);
      resetTimer();
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTime(0);
    setStartTime(null);
    setNotes('');
    setShowSaveDialog(false);
    setShowWarning(false);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning) {
      interval = setInterval(() => {
        setTime((prevTime) => {
          const newTime = prevTime + 1;
          // Check if we've exceeded recommended duration
          if (newTime === recommendedDuration * 60) {
            setShowWarning(true);
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, recommendedDuration]);

  const getTimerColor = () => {
    const minutesElapsed = time / 60;
    if (minutesElapsed >= recommendedDuration) return 'error';
    if (minutesElapsed >= recommendedDuration * 0.8) return 'warning';
    return 'primary';
  };

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
        <Typography variant="h6" gutterBottom>
          Visit Timer
        </Typography>
        
        <Box display="flex" alignItems="center" gap={1}>
          <TimerIcon color={getTimerColor()} />
          <Typography variant="h4" color={getTimerColor()}>
            {formatTime(time)}
          </Typography>
        </Box>

        <Typography variant="subtitle1">
          Patient: {patientName}
        </Typography>

        <Chip
          label={`Recommended: ${recommendedDuration} minutes`}
          color={time > recommendedDuration * 60 ? 'error' : 'default'}
        />

        <Box display="flex" gap={1}>
          {!isRunning ? (
            <Tooltip title="Start Timer">
              <IconButton
                color="primary"
                onClick={handleStart}
                disabled={time > 0 && !startTime}
              >
                <PlayArrow />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Pause Timer">
              <IconButton color="warning" onClick={handlePause}>
                <Pause />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="End Visit">
            <IconButton
              color="error"
              onClick={handleStop}
              disabled={time === 0}
            >
              <Stop />
            </IconButton>
          </Tooltip>
        </Box>

        {showWarning && (
          <Alert
            severity="warning"
            icon={<NotificationsActive />}
            onClose={() => setShowWarning(false)}
          >
            Visit has exceeded recommended duration of {recommendedDuration} minutes
          </Alert>
        )}
      </Box>

      <Dialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)}>
        <DialogTitle>Save Visit Time</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Typography>
              Total Visit Time: {formatTime(time)}
            </Typography>
            {time > recommendedDuration * 60 && (
              <Alert severity="info">
                This visit was {Math.round(time / 60 - recommendedDuration)} minutes over the recommended duration
              </Alert>
            )}
            <TextField
              label="Visit Notes"
              multiline
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any notes about the visit..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
          >
            Save Visit
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default VisitTimer; 