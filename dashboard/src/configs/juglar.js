/** 朱格拉周期（设备投资周期）指标配置 */
export const JUGLAR_METRICS = [
  { key: 'comp_z',         label: '综合z值',       unit: '',  card: true, decimals: 4, higherBetter: true },
  { key: 'fix_inv_yoy',    label: '固定投资',       unit: '%', card: true, decimals: 1, higherBetter: true },
  { key: 'capacity_util',  label: '产能利用率',     unit: '%', card: true, decimals: 1, higherBetter: true },
  { key: 'manufacturing_yoy', label: '制造业投资',  unit: '%', card: true, decimals: 1, higherBetter: true },
];
