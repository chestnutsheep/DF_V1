import { useQuery } from '@tanstack/react-query';
import { mcp } from '../services/mcp';

const DEFAULT_STALE = 30_000; // 30s 内不重复请求

/**
 * useQueryMCP — 通过 React Query 调用 MCP 工具。
 *
 * 返回 { data, isLoading, error, refetch } 与 useQuery 一致。
 * options.staleTime 默认 30s。
 *
 * @example
 * const { data, isLoading } = useQueryMCP('data_kitchin')
 * const { data } = useQueryMCPCSV('macro_gdp', { limit: 3 })
 * const { data } = useQueryMCPJSON('data_juglar')
 */
export function useQueryMCP(tool, args = {}, options = {}) {
  return useQuery({
    queryKey: [tool, args],
    queryFn: () => mcp.call(tool, args),
    staleTime: DEFAULT_STALE,
    ...options,
  });
}

export function useQueryMCPJSON(tool, args = {}, options = {}) {
  return useQuery({
    queryKey: [tool, args, 'json'],
    queryFn: () => mcp.callJSON(tool, args),
    staleTime: DEFAULT_STALE,
    ...options,
  });
}

export function useQueryMCPCSV(tool, args = {}, options = {}) {
  return useQuery({
    queryKey: [tool, args, 'csv'],
    queryFn: () => mcp.callCSV(tool, args),
    staleTime: DEFAULT_STALE,
    ...options,
  });
}
