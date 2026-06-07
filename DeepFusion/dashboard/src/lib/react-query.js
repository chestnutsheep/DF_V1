import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 8 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});