import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Grid,
  Typography,
  IconButton,
  Paper,
  Dialog,
  CircularProgress,
} from '@mui/material';
import {
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  CallEnd,
  Chat,
  ScreenShare,
  StopScreenShare,
  RecordVoiceOver,
  VolumeOff,
} from '@mui/icons-material';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTelemedicine } from '../../hooks/useTelemedicine';
import VitalsMonitor from './VitalsMonitor';
import ConsultationNotes from './ConsultationNotes';
import TechnicalIssueDialog from './TechnicalIssueDialog';

interface VideoConsultationProps {
  sessionId: string;
  patientId: string;
  doctorId: string;
  isDoctor: boolean;
}

const VideoConsultation: React.FC<VideoConsultationProps> = ({
  sessionId,
  patientId,
  doctorId,
  isDoctor,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showTechnicalIssue, setShowTechnicalIssue] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor'>('good');

  const { connect, disconnect, sendMessage } = useWebSocket(
    `${process.env.REACT_APP_WS_URL}/telemedicine/${sessionId}`
  );

  const {
    startSession,
    endSession,
    updateVitals,
    recordTechnicalIssue,
  } = useTelemedicine();

  useEffect(() => {
    initializeVideoCall();
    return () => {
      cleanup();
    };
  }, [sessionId]);

  const initializeVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsConnecting(false);
      await startSession(sessionId);
    } catch (error) {
      console.error('Error initializing video call:', error);
      setShowTechnicalIssue(true);
    }
  };

  const cleanup = () => {
    if (localVideoRef.current?.srcObject) {
      const tracks = (localVideoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    disconnect();
  };

  const handleToggleMute = () => {
    if (localVideoRef.current?.srcObject) {
      const audioTracks = (localVideoRef.current.srcObject as MediaStream)
        .getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const handleToggleVideo = () => {
    if (localVideoRef.current?.srcObject) {
      const videoTracks = (localVideoRef.current.srcObject as MediaStream)
        .getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const handleToggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }
      setIsScreenSharing(!isScreenSharing);
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  };

  const handleEndCall = async () => {
    try {
      await endSession(sessionId);
      cleanup();
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const handleTechnicalIssue = async (issue: string) => {
    try {
      await recordTechnicalIssue(sessionId, issue);
      setShowTechnicalIssue(false);
    } catch (error) {
      console.error('Error recording technical issue:', error);
    }
  };

  if (isConnecting) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
        <Typography variant="h6" ml={2}>
          Connecting to video call...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', p: 2 }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        <Grid item xs={12} md={9}>
          <Paper sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 2,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                padding: 2,
                borderRadius: 2,
              }}
            >
              <IconButton onClick={handleToggleMute} color="primary">
                {isMuted ? <MicOff /> : <Mic />}
              </IconButton>
              <IconButton onClick={handleToggleVideo} color="primary">
                {isVideoEnabled ? <Videocam /> : <VideocamOff />}
              </IconButton>
              <IconButton onClick={handleToggleScreenShare} color="primary">
                {isScreenSharing ? <StopScreenShare /> : <ScreenShare />}
              </IconButton>
              <IconButton onClick={() => setShowChat(!showChat)} color="primary">
                <Chat />
              </IconButton>
              {isDoctor && (
                <IconButton onClick={() => setShowNotes(!showNotes)} color="primary">
                  <RecordVoiceOver />
                </IconButton>
              )}
              <Button
                variant="contained"
                color="error"
                startIcon={<CallEnd />}
                onClick={handleEndCall}
              >
                End Call
              </Button>
            </Box>
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 200,
                height: 150,
                backgroundColor: 'black',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          {isDoctor && <VitalsMonitor sessionId={sessionId} patientId={patientId} />}
          {showNotes && isDoctor && (
            <ConsultationNotes sessionId={sessionId} patientId={patientId} />
          )}
        </Grid>
      </Grid>

      <TechnicalIssueDialog
        open={showTechnicalIssue}
        onClose={() => setShowTechnicalIssue(false)}
        onSubmit={handleTechnicalIssue}
      />
    </Box>
  );
};

export default VideoConsultation; 