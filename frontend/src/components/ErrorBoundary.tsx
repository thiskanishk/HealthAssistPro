
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Container, Paper, Typography, Box } from '@mui/material';
import { useSnackbar } from 'notistack';
import errorHandling from '../services/errorHandling';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log and track the error
    errorHandling.captureError(error, {
      context: { errorInfo },
      tags: { component: 'ErrorBoundary' }
    });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Container maxWidth="sm">
          <Box sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
              <Typography variant="h5" color="error" gutterBottom>
                Something went wrong
              </Typography>
              <Typography variant="body1" paragraph>
                We apologize for the inconvenience. The error has been logged and we'll look into it.
              </Typography>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="subtitle2" color="error">
                    Error: {this.state.error.message}
                  </Typography>
                  <pre style={{ 
                    overflow: 'auto', 
                    padding: '1rem', 
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    marginTop: '0.5rem'
                  }}>
                    {this.state.error.stack}
                  </pre>
                </Box>
              )}
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={this.handleReset}
                >
                  Try Again
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </Button>
              </Box>
            </Paper>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

// Wrapper component to use hooks with class component
const ErrorBoundary: React.FC<Props> = (props) => {
  const { enqueueSnackbar } = useSnackbar();

  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    enqueueSnackbar('An error occurred. Our team has been notified.', { 
      variant: 'error',
      autoHideDuration: 5000
    });
    
    if (props.onError) {
      props.onError(error, errorInfo);
    }
  };

  return <ErrorBoundaryClass {...props} onError={handleError} />;
};

export default ErrorBoundary;
