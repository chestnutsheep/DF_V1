import { useQuery } from '@tanstack/react-query';
import { mcp } from '../services/mcp';

export function useMCP(toolName, args = {}) {
  const queryKey = [toolName, JSON.stringify(args)];
  return useQuery({
    queryKey,
    queryFn: () => mcp.call(toolName, args),
    staleTime: toolName.startsWith('macro_') ? 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000,
  });
}