import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { SecurityOutlined, QrCode2 } from '@mui/icons-material';

interface TwoFactorAuthProps {
  userId: string;
  is2FAEnabled: boolean;
  onUpdate: () => void;
}

const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({
  userId,
  is2FAEnabled,
  onUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [setupStep, setSetupStep] = useState<'initial' | 'verify' | 'complete'>('initial');

  // Initialize 2FA setup
  const initiate2FASetup = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/security/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message);
      
      setQrCode(data.qrCode);
      setSetupStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  // Verify and enable 2FA
  const verify2FA = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/security/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          token: verificationCode
        })
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message);
      
      setBackupCodes(data.backupCodes);
      setShowBackupCodes(true);
      setSetupStep('complete');
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  // Disable 2FA
  const disable2FA = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/security/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          token: verificationCode
        })
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message);
      
      setSetupStep('initial');
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <SecurityOutlined color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Two-Factor Authentication</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : (
          <>
            {!is2FAEnabled && setupStep === 'initial' && (
              <Box>
                <Typography paragraph>
                  Enhance your account security by enabling two-factor authentication.
                  You'll need an authenticator app like Google Authenticator or Authy.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={initiate2FASetup}
                >
                  Setup 2FA
                </Button>
              </Box>
            )}

            {setupStep === 'verify' && qrCode && (
              <Box>
                <Typography paragraph>
                  1. Scan this QR code with your authenticator app:
                </Typography>
                <Box display="flex" justifyContent="center" mb={2}>
                  <img src={qrCode} alt="2FA QR Code" />
                </Box>
                <Typography paragraph>
                  2. Enter the verification code from your authenticator app:
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <TextField
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    inputProps={{ maxLength: 6 }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={verify2FA}
                    disabled={verificationCode.length !== 6}
                  >
                    Verify
                  </Button>
                </Box>
              </Box>
            )}

            {is2FAEnabled && (
              <Box>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Two-factor authentication is enabled
                </Alert>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => setShowBackupCodes(true)}
                >
                  View Backup Codes
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={disable2FA}
                  sx={{ ml: 2 }}
                >
                  Disable 2FA
                </Button>
              </Box>
            )}
          </>
        )}

        <Dialog
          open={showBackupCodes}
          onClose={() => setShowBackupCodes(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Backup Codes</DialogTitle>
          <DialogContent>
            <Typography paragraph color="warning.main">
              Save these backup codes in a secure place. Each code can only be used once.
            </Typography>
            <List>
              {backupCodes.map((code, index) => (
                <React.Fragment key={code}>
                  <ListItem>
                    <ListItemText primary={code} />
                  </ListItem>
                  {index < backupCodes.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowBackupCodes(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default TwoFactorAuth; 