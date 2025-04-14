import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({
            error,
            errorInfo
        });

        // Log error to your error tracking service
        this.logError(error, errorInfo);
    }

    private logError = (error: Error, errorInfo: ErrorInfo) => {
        // Implement error logging service integration here
        console.error('Uncaught error:', error);
        console.error('Error info:', errorInfo);
    };

    private handleReset = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Container maxWidth="sm">
                    <Box
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center"
                        minHeight="100vh"
                        p={3}
                    >
                        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
                            <ErrorOutline color="error" sx={{ fontSize: 64, mb: 2 }} />
                            <Typography variant="h4" gutterBottom>
                                Oops! Something went wrong.
                            </Typography>
                            <Typography variant="body1" color="text.secondary" mb={3}>
                                {this.state.error?.message || 'An unexpected error occurred.'}
                            </Typography>
                            <Box display="flex" gap={2} justifyContent="center">
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={this.handleReset}
                                >
                                    Try Again
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    onClick={this.handleReload}
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

export default ErrorBoundary; 