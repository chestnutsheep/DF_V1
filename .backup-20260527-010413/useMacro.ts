import { useQuery } from '@tanstack/react-query';
import { mcpCall, mcpCallCSV } from '../client';

export function useMacroSnapshot() {
  return useQuery({
    queryKey: ['macro', 'snapshot'],
    queryFn: async () => {
      const [growth, inflation, business] = await Promise.all([
        mcpCallCSV('macro_growth', { limit: 2 }),
        mcpCallCSV('macro_inflation', { limit: 2 }),
        mcpCallCSV('macro_business', { limit: 2 }),
      ]);
      const snapshots: any[] = [];
      const extract = (rows: Record<string, string>[], label: string) => {
        const last = rows[rows.length - 1];
        if (!last) return;
        const valKey = Object.keys(last).find(k => k !== '日期' && k !== 'period');
        if (!valKey) return;
        snapshots.push({
          table: label, label,
          latest_value: parseFloat(last[valKey] ?? ''),
          latest_period: last['日期'] || '',
          direction: null, min_period: null, max_period: null,
          row_count: rows.length, unit: '%',
        });
      };
      extract(growth, 'GDP（季度）');
      extract(inflation, 'CPI月度');
      extract(business, '制造业PMI');
      return snapshots;
    },
    refetchInterval: 300_000,
  });
}

const MACRO_TOOL_MAP: Record<string, string> = {
  gdp: 'macro_gdp', cpi: 'macro_cpi', pmi: 'macro_pmi',
  interest_rate: 'macro_interest_rate', money_supply: 'macro_money_supply',
  industrial_value_add: 'macro_industrial_value_add',
  inventory_growth: 'macro_inventory_growth',
  fixed_investment: 'macro_fixed_investment',
};

export function useMacroTable(table: string) {
  const tool = MACRO_TOOL_MAP[table];
  return useQuery({
    queryKey: ['macro', table],
    queryFn: () => tool ? mcpCallCSV(tool) : Promise.resolve([]),
    enabled: !!tool,
  });
}

export function useMacroLatest(table: string, n = 12) {
  const tool = MACRO_TOOL_MAP[table];
  return useQuery({
    queryKey: ['macro', table, 'latest', n],
    queryFn: () => tool ? mcpCallCSV(tool, { limit: n }).then(rows => rows.slice(-n)) : Promise.resolve([]),
    enabled: !!tool,
  });
}
