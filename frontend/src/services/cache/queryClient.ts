import { QueryClient } from '@tanstack/react-query';
import { logError } from '../../utils/logger';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      onError: (error) => {
        logError('Query error', { error });
      },
    },
    mutations: {
      retry: 2,
      onError: (error) => {
        logError('Mutation error', { error });
      },
    },
  },
}); 