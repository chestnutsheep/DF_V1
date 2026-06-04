import { describe, it, expect } from 'vitest';
import { KITCHIN_METRICS } from '../src/configs/kitchin';
import { prepareCardData, fmtVal } from '../src/components/charts/DataCard';

describe('KitchinTab 数据流', () => {
  const mockData = {
    period: '202604',
    inventory_yoy: 6.7,
    demand_yoy: 5.8,
    pmi: 49.9,
    m2_yoy: 8.8,
    fix_inv_yoy: 4.2,
    real_inventory_yoy: 4.6,
  };

  it('KITCHIN_METRICS 配置所有 card 项都有 key 和 label', () => {
    KITCHIN_METRICS.forEach(m => {
      expect(m.key).toBeTruthy();
      expect(m.label).toBeTruthy();
    });
  });

  it('prepareCardData 从 mock 数据正确取值', () => {
    const cards = prepareCardData(KITCHIN_METRICS, mockData, {});
    expect(cards).toHaveLength(KITCHIN_METRICS.length);
    const inv = cards.find(c => c.key === 'inventory_yoy');
    expect(inv.value).toBe(6.7);
    expect(inv.label).toBe('库存同比');
  });

  it('指标值格式化不丢失精度', () => {
    const cards = prepareCardData(KITCHIN_METRICS, mockData, {});
    cards.forEach(c => {
      if (typeof c.value === 'number') {
        const formatted = fmtVal(c.value, c.decimals ?? 1);
        expect(parseFloat(formatted)).toBeCloseTo(c.value, c.decimals ?? 1);
      }
    });
  });

  it('上期数据正确计算方向', () => {
    const prev = {
      inventory_yoy: 5.2,
      demand_yoy: 4.5,
      pmi: 50.6,
      m2_yoy: 8.5,
      fix_inv_yoy: 3.8,
      real_inventory_yoy: 4.2,
    };
    const cards = prepareCardData(KITCHIN_METRICS, mockData, prev);
    const inv = cards.find(c => c.key === 'inventory_yoy');
    expect(inv.dir).toBe('up');
    const pmi = cards.find(c => c.key === 'pmi');
    expect(pmi.dir).toBe('down');
  });

  it('缺失值处理', () => {
    const cards = prepareCardData(KITCHIN_METRICS, { period: '202604' }, {});
    cards.forEach(c => expect(c.value).toBeUndefined());
  });
});
