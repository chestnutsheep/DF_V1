/** 宏观快照指标配置 */
export const SNAPSHOT_METRICS = [
  { key: 'gdp',  label: 'GDP当季同比', unit: '%', tool: 'macro_gdp',      card: true, higherBetter: null },
  { key: 'cpi',  label: 'CPI当月同比', unit: '',  tool: 'macro_cpi',      card: true, higherBetter: null },
  { key: 'pmi',  label: '制造业PMI',   unit: '',  tool: 'macro_pmi',      card: true, higherBetter: true },
  { key: 'inv',  label: '产成品库存',  unit: '%', tool: 'macro_inventory_growth', card: true, higherBetter: null },
  { key: 'fix',  label: '固投',        unit: '%', tool: 'macro_fixed_investment', card: true, higherBetter: true },
];
