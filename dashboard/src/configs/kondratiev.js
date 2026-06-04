/** 康波周期指标配置 */
export const KONDRATIEV_METRICS = [
  { key: 'dominant_period',  label: '主周期',   unit: '年', card: true, decimals: 1, higherBetter: null },
  { key: 'pca_variance_ratio', label: 'PCA方差比', unit: '%', card: true, decimals: 1, higherBetter: true },
  { key: 'confidence',      label: '置信度',   unit: '%', card: true, decimals: 0, higherBetter: true },
  { key: 'indicators_used', label: '指标数',   unit: '',  card: true, decimals: 0, higherBetter: null },
];
