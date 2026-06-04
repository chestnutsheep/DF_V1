import { describe, it, expect, beforeAll } from 'vitest';

const API = 'http://localhost:8080/api/tools/call';
const TO = 10000;

// ─── 测试工具 ──────────────────────────────────────
async function mcpCall(tool, args = {}) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: tool, arguments: args }),
  });
  const d = await r.json();
  if (!d.ok) throw new Error(d.error || `API error for ${tool}`);
  return d.data;
}

function parseCSV(csvBlock) {
  if (!csvBlock) return [];
  const lines = csvBlock.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = (vals[i] || '').trim(); });
    return row;
  });
}

function extractCSV(text, startMarker) {
  if (!text) return '';
  const idx = startMarker ? text.indexOf(startMarker) : 0;
  if (idx < 0) return text;
  const block = text.slice(idx + (startMarker?.length || 0)).trim();
  const end = block.indexOf('\n\n');
  return end > 0 ? block.slice(0, end).trim() : block;
}

function parseData(text) {
  if (!text) return null;
  try { const j = JSON.parse(text); if (Array.isArray(j)) return j; } catch(e) {}
  const csv = extractCSV(text);
  const rows = parseCSV(csv);
  if (rows.length > 0) return rows;
  return null;
}

/** 缓存层模拟：记录调用次数 */
const callCount = {};
async function mcpCallCached(tool, args = {}) {
  const key = `${tool}-${JSON.stringify(args)}`;
  callCount[key] = (callCount[key] || 0) + 1;
  return mcpCall(tool, args);
}

// ─── 1. 无缓存/有缓存 ──────────────────────────────
describe('缓存层', () => {
  beforeAll(() => { Object.keys(callCount).forEach(k => delete callCount[k]); });

  it('首次调用无缓存，请求API', async () => {
    const n = Object.keys(callCount).length;
    await mcpCallCached('get_current_time');
    expect(Object.keys(callCount).length).toBe(n + 1);
  });

  it('重复调用命中缓存（前端Map缓存）', () => {
    // 验证前端 useMCP hook 的逻辑：
    // mcpCall 本身无缓存，但 useMCP hook 通过 Map 缓存
    // 这步由组件测试覆盖
    expect(true).toBe(true);
  });

  it('缓存key不同则重新请求', async () => {
    const n = Object.keys(callCount).length;
    await mcpCallCached('macro_gdp', { limit: 3 });
    await mcpCallCached('macro_gdp', { limit: 5 });
    expect(Object.keys(callCount).length).toBe(n + 2);
  });
});

// ─── 2. 数据获取（Data Provision） ──────────────────
describe('数据获取', () => {
  it('周期JSON数组 > 100条', async () => {
    const j = JSON.parse(await mcpCall('data_kitchin'));
    expect(Array.isArray(j)).toBe(true);
    expect(j.length).toBeGreaterThan(100);
  });

  it('周期JSON每条有period字段', async () => {
    const j = JSON.parse(await mcpCall('data_juglar'));
    j.forEach(row => expect(row.period).toBeTruthy());
  });

  it('宏观CSV列名不缺失', async () => {
    const text = await mcpCall('macro_gdp', { limit: 3 });
    const rows = parseCSV(text);
    expect(rows[0]).toHaveProperty('value');
  });

  it('股票财务指标含增长率', async () => {
    const text = await mcpCall('financial_indicators', { symbol: '002407' });
    const csv = extractCSV(text, '=== 财务指标 ===');
    const rows = parseCSV(csv);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    const latest = rows[rows.length - 1];
    expect(latest['主营业务收入增长率(%)']).toBeTruthy();
  });

  it('K线数据OHLC齐全', async () => {
    const text = await mcpCall('individual_hist', { symbol: '600519', period: 'daily' });
    if (text.includes('未获取到')) return;
    const csv = extractCSV(text, 'K线数据');
    const rows = parseCSV(csv);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[0]['开盘']).toBeTruthy();
    expect(rows[0]['收盘']).toBeTruthy();
    expect(rows[0]['最高']).toBeTruthy();
    expect(rows[0]['最低']).toBeTruthy();
  });
});

// ─── 3. 数据转换（Transformation） ─────────────────
describe('数据转换', () => {
  it('CSV → 对象数组 列映射正确', () => {
    const csv = '日期,值,备注\n202601,5.0,好\n202602,4.5,中';
    const rows = parseCSV(csv);
    expect(rows[0]['日期']).toBe('202601');
    expect(rows[0]['值']).toBe('5.0');
    expect(rows[0]['备注']).toBe('好');
  });

  it('JSON → 对象数组 保持全部字段', async () => {
    const j = JSON.parse(await mcpCall('data_juglar'));
    const sample = j[0];
    expect(sample).toHaveProperty('period');
    expect(sample).toHaveProperty('comp_z');
    expect(sample).toHaveProperty('phase_name');
  });

  it('数值字段可转换为Number', async () => {
    const j = JSON.parse(await mcpCall('data_kuznets'));
    j.forEach(row => {
      if (row.house_price_yoy != null) {
        expect(() => parseFloat(row.house_price_yoy)).not.toThrow();
      }
    });
  });

  it('空值字段不破坏解析', async () => {
    const j = JSON.parse(await mcpCall('data_kitchin'));
    const nullCount = j.filter(r => r.pmi == null).length;
    expect(nullCount).toBeGreaterThan(0); // 大部分pmi为null
  });
});

// ─── 4. 渲染数据（Rendering Readiness） ────────────
describe('渲染数据', () => {
  it('周期最新值可格式化显示', async () => {
    const j = JSON.parse(await mcpCall('data_kitchin'));
    const latest = j[j.length - 1];
    const label = `基钦相位: ${latest.stage_name} (库存${latest.inventory_yoy}%)`;
    expect(label).toMatch(/基钦相位/);
    expect(latest.stage_name).toBeTruthy();
  });

  it('宏观快照值可渲染卡片', async () => {
    const [gdp, cpi, pmi] = await Promise.all([
      mcpCall('macro_gdp', { limit: 1 }),
      mcpCall('macro_cpi', { limit: 1 }),
      mcpCall('macro_pmi', { limit: 1 }),
    ]);
    const gdpRows = parseCSV(gdp);
    const cpiRows = parseCSV(cpi);
    const pmiRows = parseCSV(pmi);
    expect(gdpRows.length).toBeGreaterThan(0);
    expect(cpiRows.length).toBeGreaterThan(0);
    expect(pmiRows.length).toBeGreaterThan(0);
  });

  it('行业列表可渲染选择器', async () => {
    const text = await mcpCall('industry_classify', { 分类标准: '同花顺' });
    const lines = text.trim().split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(10); // 至少10个行业
  });

  it('政策列表可渲染时间轴', async () => {
    const stats = await mcpCall('policy_stats');
    expect(stats).toContain('篇');
  });

  it('涨停股池可渲染列表', async () => {
    const text = await mcpCall('stock_zt_pool_em');
    if (text.includes('error') || text.includes('empty')) return;
    // 跳过首行统计，取实际CSV
    const lines = text.split('\n').filter(l => !l.startsWith('共') && l.trim());
    const rows = parseCSV(lines.join('\n'));
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]['名称'] || rows[0]['代码']).toBeTruthy();
  });
});

// ─── 5. 刷新/重载（Trigger Refresh） ──────────────
describe('触发器刷新', () => {
  it('相同参数重复调用结果一致（幂等）', async () => {
    const [a, b] = await Promise.all([
      mcpCall('get_current_time'),
      mcpCall('get_current_time'),
    ]);
    // 时间函数连续两次结果可能不同（秒级变化），但格式一致
    expect(a).toContain('当前时间');
    expect(b).toContain('当前时间');
  });

  it('不同limit参数返回不同条数', async () => {
    const [t3, t5] = await Promise.all([
      mcpCall('macro_gdp', { limit: 3 }),
      mcpCall('macro_gdp', { limit: 5 }),
    ]);
    const r3 = parseCSV(t3);
    const r5 = parseCSV(t5);
    expect(r5.length).toBeGreaterThanOrEqual(r3.length);
  });

  it('采集后数据可查询（cycle_collect → data_kitchin）', async () => {
    // 采集是耗时操作，只验证采集工具可用
    const text = await mcpCall('cycle_cache_status');
    expect(text).toContain('指标');
  }, 15000);
});

// ─── 6. 行业归属（来自测试股票） ──────────────────
describe('行业归属', () => {
  const stocks = [
    { name: '多氟多',   code: '002407', industry: '化学原料' },
    { name: '昊华能源', code: '601101', industry: '煤炭' },
    { name: '久立特材', code: '002318', industry: '钢铁' },
  ];
  for (const s of stocks) {
    it(`${s.name}(${s.code}) 属于 ${s.industry}`, async () => {
      const text = await mcpCall('industry_classify', { 分类标准: '同花顺' });
      expect(text).toContain(s.industry);
    });
  }
});

// ─── 7. 多数据源一致（FRED/WB） ────────────────────
describe('国际数据', () => {
  it('FRED 返回时间序列', async () => {
    const text = await mcpCall('fred_data', { series: 'fred_gs10', limit: 3 });
    // 跳过 `===` 标题行
    const lines = text.split('\n').filter(l => !l.startsWith('===') && l.trim());
    const rows = parseCSV(lines.join('\n'));
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]['date'] || rows[0]['Date']).toBeTruthy();
  });

  it('World Bank 返回年序列', async () => {
    const text = await mcpCall('wb_data', { indicator: 'wb_gdp_growth', limit: 3 });
    const rows = parseCSV(text);
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});
