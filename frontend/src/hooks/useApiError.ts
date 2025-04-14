import { useCallback } from 'react';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';

interface ApiError {
    status?: number;
    message?: string;
    errors?: Array<{ field: string; message: string }>;
}

export const useApiError = () => {
    const { enqueueSnackbar } = useSnackbar();
    const navigate = useNavigate();

    const handleApiError = useCallback((error: ApiError) => {
        if (error.status === 401) {
            enqueueSnackbar('Session expired. Please login again.', { 
                variant: 'error',
                autoHideDuration: 3000
            });
            navigate('/auth/login');
            return;
        }

        if (error.status === 403) {
            enqueueSnackbar('You do not have permission to perform this action.', {
                variant: 'error',
                autoHideDuration: 3000
            });
            return;
        }

        if (error.errors && error.errors.length > 0) {
            error.errors.forEach(err => {
                enqueueSnackbar(`${err.field}: ${err.message}`, {
                    variant: 'error',
                    autoHideDuration: 3000
                });
            });
            return;
        }

        enqueueSnackbar(error.message || 'An unexpected error occurred', {
            variant: 'error',
            autoHideDuration: 3000
        });
    }, [enqueueSnackbar, navigate]);

    return { handleApiError };
}; 