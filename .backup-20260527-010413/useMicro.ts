import { useQuery } from '@tanstack/react-query';
import { mcpCall, mcpCallCSV, mcpCallJSON } from '../client';
import type { StockItem, StockDetail, PricePoint, FinancialItem, PeerItem, SentimentItem, CapitalItem, FullReport } from '../types';

export function useStockSearch(keyword: string) {
  return useQuery({
    queryKey: ['micro', 'stocks', 'search', keyword],
    queryFn: () => mcpCallCSV('search', { keyword }),
    enabled: keyword.length >= 2,
    staleTime: 60_000,
  });
}

export function useStockDetail(symbol: string) {
  return useQuery({
    queryKey: ['micro', 'stocks', 'detail', symbol],
    queryFn: () => mcpCallCSV('individual_info', { symbol }),
    enabled: !!symbol,
    staleTime: 60_000,
  });
}

export function useStockFinancials(symbol: string) {
  return useQuery({
    queryKey: ['micro', 'stocks', 'financials', symbol],
    queryFn: () => mcpCallCSV('financial_indicators', { symbol }),
    enabled: !!symbol,
    staleTime: 300_000,
  });
}

export function useStockPrices(symbol: string, limit = 120) {
  return useQuery({
    queryKey: ['micro', 'stocks', 'prices', symbol, limit],
    queryFn: () => mcpCallCSV('individual_hist', { symbol, limit }),
    enabled: !!symbol,
    staleTime: 60_000,
  });
}

export function useStockKline(symbol: string, limit = 100) {
  return useQuery({
    queryKey: ['micro', 'stocks', 'kline', symbol, limit],
    queryFn: () => mcpCallCSV('market_prices', { symbol, limit }),
    enabled: !!symbol,
    staleTime: 60_000,
  });
}

export function useStockPeers(symbol: string) {
  return useQuery({
    queryKey: ['micro', 'stocks', 'peers', symbol],
    queryFn: () => mcpCallCSV('peer_comparison', { symbol }),
    enabled: !!symbol,
    staleTime: 300_000,
  });
}

export function useStockSentiment(symbol: string) {
  return useQuery({
    queryKey: ['micro', 'stocks', 'sentiment', symbol],
    queryFn: () => mcpCallCSV('sentiment_side', { symbol }),
    enabled: !!symbol,
    staleTime: 120_000,
  });
}

export function useStockCapital(symbol: string) {
  return useQuery({
    queryKey: ['micro', 'stocks', 'capital', symbol],
    queryFn: () => mcpCallCSV('capital_tracking', { symbol }),
    enabled: !!symbol,
    staleTime: 120_000,
  });
}

export function useStockReport(symbol: string) {
  return useQuery({
    queryKey: ['micro', 'stocks', 'report', symbol],
    queryFn: async () => {
      const [detail, prices, kline, financials, peers, sentiment, capital] = await Promise.all([
        mcpCallCSV('individual_info', { symbol }),
        mcpCallCSV('individual_hist', { symbol }),
        mcpCallCSV('market_prices', { symbol }),
        mcpCallCSV('financial_indicators', { symbol }),
        mcpCallCSV('peer_comparison', { symbol }),
        mcpCallCSV('sentiment_side', { symbol }),
        mcpCallCSV('capital_tracking', { symbol }),
      ]);
      return { detail, prices, kline, financials, peers, sentiment, capital } as any as FullReport;
    },
    enabled: !!symbol,
    staleTime: 120_000,
  });
}

export function useHotStocks(_limit = 10) {
  return useQuery({
    queryKey: ['micro', 'stocks', 'hot'],
    queryFn: () => mcpCallCSV('stock_zt_pool_em', { limit: _limit }),
    staleTime: 60_000,
    refetchInterval: 300_000,
  });
}
