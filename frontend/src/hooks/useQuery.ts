import { 
  useQuery as useReactQuery,
  useMutation as useReactMutation,
  type QueryKey
} from '@tanstack/react-query';
import { apiClient } from '../services/api/apiClient';
import { useAppDispatch } from '../store/hooks';
import { addNotification } from '../store/slices/uiSlice';
import { useSnackbar } from 'notistack';

// Helper to extract error message from different error types
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'object' && error !== null) {
    // Handle axios error-like objects
    if ('response' in error && 
        typeof error.response === 'object' && 
        error.response && 
        'data' in error.response &&
        typeof error.response.data === 'object' &&
        error.response.data &&
        'message' in error.response.data &&
        typeof error.response.data.message === 'string') {
      return error.response.data.message;
    }
    
    // Handle objects with message property
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
  }
  
  // Fallback for other error types
  return 'An error occurred';
};

// Re-export the React Query hooks directly
export { useReactQuery as useQuery, useReactMutation as useMutation };

// Create convenience hooks for common API operations
export function useApiQuery<TData>(key: QueryKey, url: string) {
  return useReactQuery({
    queryKey: key,
    queryFn: () => apiClient.get<TData>(url)
  });
}

export function useApiMutation<TData, TVariables = void>(url: string) {
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  
  return useReactMutation({
    mutationFn: (variables: TVariables) => apiClient.post<TData>(url, variables),
    onError: (error: unknown) => {
      const errorMessage = getErrorMessage(error);
      dispatch(addNotification({
        message: errorMessage,
        type: 'error',
      }));
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  });
} 