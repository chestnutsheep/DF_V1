/**
 * DataCard — 通用指标卡组件。
 *
 * 自动处理：数值格式化、方向箭头、色标、空值、悬浮详情。
 *
 * @example
 * <DataCard label="库存同比" value={6.7} prevValue={5.2} unit="%" higherBetter />
 * <DataCard label="相位" value="主动补库存" />
 */
import { useState, useRef, useEffect } from 'react';

/* ── 工具函数（与测试一致） ── */
export function calcDir(value, prevValue) {
  if (value == null || prevValue == null) return null;
  return value > prevValue ? 'up' : value < prevValue ? 'down' : 'flat';
}

export function cardColor(higherBetter, dir) {
  if (!dir || dir === 'flat') return 'var(--text-primary)';
  if (higherBetter === null) return 'var(--accent-gold)';
  const isGood = (higherBetter && dir === 'up') || (!higherBetter && dir === 'down');
  return isGood ? '#3fb950' : '#f85149';
}

export function fmtVal(value, decimals = 1) {
  if (value == null) return '—';
  if (typeof value === 'number') return value.toFixed(decimals);
  return String(value);
}

export function prepareCardData(config, latest, prev) {
  return config
    .filter(m => m.card !== false)
    .map(m => {
      const v = latest?.[m.key];
      const p = prev?.[m.key] ?? null;
      return { ...m, value: v, dir: calcDir(v, p) };
    });
}

const DIR_SYMBOL = { up: '↑', down: '↓', flat: '→', null: '' };

/**
 * @param {object} props
 * @param {string} props.label     显示名称
 * @param {number|string} props.value  数值
 * @param {number|string} [props.prevValue] 上期值（用于方向箭头）
 * @param {string} [props.unit]    单位
 * @param {boolean} [props.higherBetter] 是否越高越好
 * @param {number} [props.decimals=1] 小数位数
 * @param {string} [props.detail]  悬浮卡说明文字
 * @param {string} [props.source]  数据来源
 */
export default function DataCard({
  label, value, prevValue, unit = '', higherBetter, decimals = 1,
  detail, source,
}) {
  const dir = calcDir(value, prevValue);
  const color = cardColor(higherBetter, dir);
  const arrow = DIR_SYMBOL[dir] || '';
  const display = fmtVal(value, decimals);

  return (
    <div style={{
      background: 'transparent',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius)',
      padding: 16, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
        letterSpacing: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1.2 }}>
          {display}
        </span>
        {unit && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{unit}</span>}
        {arrow && <span style={{ fontSize: 16, color, marginLeft: 2 }}>{arrow}</span>}
      </div>
      {detail && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: 6, lineHeight: 1.5 }}>
          {detail}
          {source && <span style={{ marginLeft: 8, opacity: 0.6 }}>· {source}</span>}
        </div>
      )}
    </div>
  );
}
