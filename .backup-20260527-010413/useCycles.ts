import { useQuery } from '@tanstack/react-query';
import { mcpCall, mcpCallJSON } from '../client';

interface KitchinDataSet {
  inventory_yoy: { periods: string[]; values: number[] };
  ind_yoy: { periods: string[]; values: number[] };
}

interface JuglarDataSet {
  fix_inv: { periods: string[]; values: number[] };
  ppi: { periods: string[]; values: number[] };
}

interface KuznetsDataSet {
  re_dev_yoy: { periods: string[]; values: number[] };
  cpi: { periods: string[]; values: number[] };
}

export function useKitchinCurrent() {
  return useQuery({
    queryKey: ['cycles', 'kitchin', 'current'],
    queryFn: () => mcpCall('kitchin_cycle'),
    refetchInterval: 600_000,
    retry: 3,
  });
}

export function useKitchinHistory() {
  return useQuery({
    queryKey: ['cycles', 'kitchin', 'history'],
    queryFn: () => mcpCall('kitchin_cycle'),
    staleTime: 600_000,
  });
}

export function useKitchinData() {
  return useQuery({
    queryKey: ['cycles', 'kitchin', 'data'],
    queryFn: () => mcpCallJSON<KitchinDataSet>('data_kitchin'),
    staleTime: 600_000,
  });
}

export function useJuglarData() {
  return useQuery({
    queryKey: ['cycles', 'juglar', 'data'],
    queryFn: () => mcpCallJSON<JuglarDataSet>('data_juglar'),
    staleTime: 600_000,
  });
}

export function useKuznetsCurrent() {
  return useQuery({
    queryKey: ['cycles', 'kuznets', 'current'],
    queryFn: () => mcpCall('kuznets_cycle'),
    refetchInterval: 600_000,
    retry: 3,
  });
}

export function useKuznetsHistory(_limit = 50) {
  return useQuery({
    queryKey: ['cycles', 'kuznets', 'history', _limit],
    queryFn: () => mcpCall('kuznets_cycle'),
    staleTime: 600_000,
  });
}

export function useKuznetsData() {
  return useQuery({
    queryKey: ['cycles', 'kuznets', 'data'],
    queryFn: () => mcpCallJSON<KuznetsDataSet>('data_kuznets'),
    staleTime: 600_000,
  });
}
