import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from '../services/api/apiClient';
import { useAppDispatch } from '../store/hooks';
import { addNotification } from '../store/slices/uiSlice';

export function useApiQuery<TData>(
  key: string[],
  url: string,
  options?: UseQueryOptions<TData>
) {
  return useQuery<TData>({
    queryKey: key,
    queryFn: () => apiClient.get<TData>(url),
    ...options,
  });
}

export function useApiMutation<TData, TVariables>(
  url: string,
  options?: UseMutationOptions<TData, Error, TVariables>
) {
  const dispatch = useAppDispatch();

  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables) => apiClient.post<TData>(url, variables),
    onError: (error) => {
      dispatch(addNotification({
        message: error.message || 'An error occurred',
        type: 'error',
      }));
    },
    ...options,
  });
} 