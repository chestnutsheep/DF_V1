import { describe, it, expect } from 'vitest';

// 数据方向计算函数（DataCard 的核心逻辑）
function calcDir(value, prevValue) {
  if (value == null || prevValue == null) return null;
  return value > prevValue ? 'up' : value < prevValue ? 'down' : 'flat';
}

function cardColor(higherBetter, dir) {
  if (!dir || dir === 'flat') return 'var(--text-primary)';
  if (higherBetter === null) return 'var(--accent-gold)';
  const isGood = (higherBetter && dir === 'up') || (!higherBetter && dir === 'down');
  return isGood ? '#3fb950' : '#f85149';
}

function formatValue(value, decimals = 1) {
  if (value == null) return '—';
  if (typeof value === 'number') return value.toFixed(decimals);
  return String(value);
}

function filterCardConfig(config, data) {
  return config.filter(m => m.card !== false).map(m => ({
    ...m,
    value: data[m.key],
  }));
}

function calcPrevValues(rows, config) {
  if (!rows || rows.length === 0) return {};
  const latest = rows[rows.length - 1];
  const prev = rows.length >= 2 ? rows[rows.length - 2] : null;
  const result = {};
  config.forEach(m => {
    const v = latest[m.key];
    const p = prev ? prev[m.key] : null;
    result[m.key] = { value: v, dir: calcDir(v, p) };
  });
  return result;
}

describe('DataCard 工具函数', () => {
  describe('calcDir', () => {
    it('值上升返回 up', () => expect(calcDir(6.7, 5.2)).toBe('up'));
    it('值下降返回 down', () => expect(calcDir(4.0, 5.0)).toBe('down'));
    it('值相等返回 flat', () => expect(calcDir(5.0, 5.0)).toBe('flat'));
    it('空值返回 null', () => expect(calcDir(null, 5.0)).toBeNull());
    it('负数上升', () => expect(calcDir(-3, -5)).toBe('up'));
    it('负数下降', () => expect(calcDir(-5, -3)).toBe('down'));
  });

  describe('cardColor', () => {
    it('higherBetter=true + up → 绿色', () => expect(cardColor(true, 'up')).toBe('#3fb950'));
    it('higherBetter=true + down → 红色', () => expect(cardColor(true, 'down')).toBe('#f85149'));
    it('higherBetter=false + up → 红色', () => expect(cardColor(false, 'up')).toBe('#f85149'));
    it('higherBetter=false + down → 绿色', () => expect(cardColor(false, 'down')).toBe('#3fb950'));
    it('higherBetter=null → 金色', () => expect(cardColor(null, 'up')).toBe('var(--accent-gold)'));
    it('dir=null → 默认色', () => expect(cardColor(true, null)).toBe('var(--text-primary)'));
  });

  describe('formatValue', () => {
    it('数值格式化', () => expect(formatValue(6.666, 1)).toBe('6.7'));
    it('整数格式化', () => expect(formatValue(5, 1)).toBe('5.0'));
    it('null 显示 —', () => expect(formatValue(null)).toBe('—'));
    it('undefined 显示 —', () => expect(formatValue(undefined)).toBe('—'));
    it('字符串原样', () => expect(formatValue('复苏', 0)).toBe('复苏'));
  });

  describe('filterCardConfig', () => {
    const cfg = [
      { key: 'a', label: 'A', card: true },
      { key: 'b', label: 'B', card: false },
      { key: 'c', label: 'C' },
    ];
    it('过滤非 card 项', () => {
      const r = filterCardConfig(cfg, { a: 1, b: 2, c: 3 });
      expect(r).toHaveLength(2);
      expect(r[0].value).toBe(1);
    });
    it('不存在的 key value 为 undefined', () => {
      const r = filterCardConfig(cfg, {});
      expect(r[0].value).toBeUndefined();
    });
  });

  describe('calcPrevValues', () => {
    const cfg = [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
    ];
    it('两行数据算方向', () => {
      const rows = [{ period: '1', a: 5, b: 3 }, { period: '2', a: 7, b: 2 }];
      const r = calcPrevValues(rows, cfg);
      expect(r.a.dir).toBe('up');
      expect(r.b.dir).toBe('down');
    });
    it('单行数据无方向', () => {
      const rows = [{ period: '1', a: 5 }];
      const r = calcPrevValues(rows, cfg);
      expect(r.a.value).toBe(5);
      expect(r.a.dir).toBeNull();
    });
    it('空数组返回空', () => {
      expect(calcPrevValues([], cfg)).toEqual({});
    });
  });
});
