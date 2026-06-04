/** 基钦周期（库存周期）指标配置 — 只含 data_kitchin 实际返回字段 */
export const KITCHIN_METRICS = [
  { key: 'inventory_yoy',    label: '库存同比',    unit: '%', card: true, decimals: 1, higherBetter: null },
  { key: 'demand_yoy',       label: '需求(工业)',  unit: '%', card: true, decimals: 1, higherBetter: true },
  { key: 'fix_inv_yoy',      label: '固投',        unit: '%', card: true, decimals: 1, higherBetter: true },
  { key: 'real_inventory_yoy', label: '实际库存',  unit: '%', card: true, decimals: 1, higherBetter: null },
];
