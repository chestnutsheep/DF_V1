/** 库兹涅茨周期（房地产周期）指标配置 */
export const KUZNETS_METRICS = [
  { key: 'house_price_yoy', label: '房价指数',   unit: '', card: true, decimals: 2, higherBetter: true },
  { key: 'sales_yoy',       label: '销售面积',   unit: '%', card: true, decimals: 1, higherBetter: true },
  { key: 'new_start_yoy',   label: '新开工',     unit: '%', card: true, decimals: 1, higherBetter: true },
  { key: 're_yoy',          label: '房产投资',   unit: '%', card: true, decimals: 1, higherBetter: true },
];
