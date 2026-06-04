import { describe, it, expect } from 'vitest';
import { mcp } from '../src/services/mcp';

// ─── 数据层测试（不依赖 React） ─────────────────────
describe('mcp.callJSON', () => {
  it('周期数据返回数组', async () => {
    const data = await mcp.callJSON('data_juglar');
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('period');
    expect(data[0]).toHaveProperty('phase_name');
  }, 10000);

  it('康波返回 PCA 对象', async () => {
    const data = await mcp.callJSON('data_kondratiev', { method: 'pca' });
    expect(data).toHaveProperty('pca1');
    expect(data.pca1.length).toBeGreaterThan(0);
  }, 10000);

  it('基钦每个条目有 stage_name', async () => {
    const data = await mcp.callJSON('data_kitchin');
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toHaveProperty('stage_name');
    expect(data[0]).toHaveProperty('inventory_yoy');
  }, 10000);

  it('不存在的工具返回 null', async () => {
    const data = await mcp.callJSON('__nonexistent__');
    expect(data).toBeNull();
  });

  it('非 JSON 工具不抛错', async () => {
    const data = await mcp.callJSON('get_current_time');
    expect(data).toBeNull(); // 纯文本，解析不了 JSON
  });
});

describe('mcp.callCSV', () => {
  it('宏观 CSV 解析为对象数组', async () => {
    const rows = await mcp.callCSV('macro_gdp', { limit: 3 });
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]).toHaveProperty('period');
    expect(rows[0]).toHaveProperty('value');
  }, 10000);

  it('跳过 === 标题行', async () => {
    const rows = await mcp.callCSV('fred_data', { series: 'fred_gs10', limit: 3 });
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]['date']).toBeTruthy();
  }, 10000);

  it('PMI 数据含制造业信息', async () => {
    const rows = await mcp.callCSV('macro_pmi', { limit: 2 });
    expect(rows.length).toBeGreaterThanOrEqual(1);
    // metadata 字段含制造业数据（JSON）
    expect(rows[0]['metadata']).toBeTruthy();
    expect(rows[0]['metadata']).toContain('制造业');
  }, 10000);

  it('行业分类返回列表', async () => {
    const rows = await mcp.callCSV('industry_classify', { 分类标准: '同花顺' });
    expect(rows.length).toBeGreaterThan(10);
    expect(rows[0]['industry_name'] || rows[0]['name']).toBeTruthy();
  }, 10000);
});

describe('mcp.call 原始文本', () => {
  it('时间工具返回文本', async () => {
    const text = await mcp.call('get_current_time');
    expect(text).toContain('当前时间');
  });

  it('缓存状态返回文本', async () => {
    const text = await mcp.call('cycle_cache_status');
    expect(text).toContain('指标');
  });

  it('财务指标含增长率', async () => {
    const text = await mcp.call('financial_indicators', { symbol: '002407' });
    expect(text).toContain('主营业务收入增长率(%)');
  }, 10000);

  it('错误工具抛异常', async () => {
    try {
      await mcp.call('__nonexistent__');
      expect.fail('应该抛错');
    } catch (e) {
      expect(e.message).toBeTruthy();
    }
  });
});
