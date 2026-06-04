import { describe, it, expect } from 'vitest';

const API = 'http://localhost:8080/api/tools/call';
const TO = 8000; // 超时

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

/** 从 CSV 文本中部提取表格（跳过标题行和空行） */
function extractCSV(text, startMarker) {
  if (!text) return '';
  const idx = startMarker ? text.indexOf(startMarker) : 0;
  if (idx < 0) return text;
  const block = text.slice(idx + (startMarker?.length || 0)).trim();
  // 取到下一个空行或文件结尾
  const end = block.indexOf('\n\n');
  return end > 0 ? block.slice(0, end).trim() : block;
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

function parseCycleTable(text) {
  // data_juglar/kuznets/kondratiev 可能返回 JSON 数组
  if (!text) return [];
  try {
    const arr = JSON.parse(text);
    if (Array.isArray(arr) && arr.length > 0) return arr;
  } catch(e) { /* 不是 JSON，继续 CSV 解析 */ }
  // data_kitchin 等返回多段文本，用 `===` 分段取表格
  const sections = text.split(/===+/);
  for (const s of sections) {
    const t = s.trim();
    if (t.startsWith('\n') || t.length < 10) continue;
    const rows = parseCSV(t);
    if (rows.length > 0 && rows[0]['period']) return rows;
  }
  return parseCSV(text);
}

// ─── 1. API 适配测试 ──────────────────────────────────
describe('API 适配层', () => {
  it('mcpCall 返回纯文本', async () => {
    const text = await mcpCall('get_current_time');
    expect(text).toBeTruthy();
    expect(text).toContain('当前时间');
  }, TO);

  it('mcpCall 错误参数返回 error', async () => {
    try {
      await mcpCall('nonexistent_tool');
      expect.fail('应该抛错');
    } catch (e) {
      expect(e.message).toMatch(/error|not found|unknown/i);
    }
  }, TO);

  it('parseCSV 正确解析', () => {
    const csv = '日期,值\n202601,5.00\n202602,4.50';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]['日期']).toBe('202601');
    expect(rows[0]['值']).toBe('5.00');
  });
});

// ─── 2. 宏观周期数据测试 ───────────────────────────────
describe('宏观周期数据', () => {
  it('data_kitchin 返回带最新阶段的数据', async () => {
    const text = await mcpCall('data_kitchin');
    const rows = parseCycleTable(text);
    expect(rows.length).toBeGreaterThan(0);
    const latest = rows[rows.length - 1];
    expect(latest['stage_name']).toBeTruthy();
    expect(latest['stage_name']).toMatch(/去库存|补库存|主动|被动|未知/);
  }, TO);

  it('data_juglar 返回带相位的数据', async () => {
    const text = await mcpCall('data_juglar');
    const rows = parseCycleTable(text);
    expect(rows.length).toBeGreaterThan(0);
    const latest = rows[rows.length - 1];
    expect(latest['phase_name'] || latest['phase_name'] !== undefined).toBeTruthy();
  }, TO);

  it('data_kuznets 返回房价同比数据', async () => {
    const text = await mcpCall('data_kuznets');
    const rows = parseCycleTable(text);
    expect(rows.length).toBeGreaterThan(0);
    const latest = rows[rows.length - 1];
    expect(latest['house_price_yoy']).toBeTruthy();
    expect(latest['phase_name'] || latest['phase_name'] !== undefined).toBeTruthy();
  }, TO);

  it('data_kondratiev 返回康波 PCA', async () => {
    const text = await mcpCall('data_kondratiev', { method: 'pca' });
    const data = JSON.parse(text);
    expect(data).toHaveProperty('pca1');
    expect(data).toHaveProperty('years');
    expect(data.pca1.length).toBeGreaterThan(0);
    expect(data.years.length).toBeGreaterThan(0);
  }, TO);
});

// ─── 3. 宏观快照数据 ──────────────────────────────────
describe('宏观快照', () => {
  it('macro_gdp 返回数据', async () => {
    const text = await mcpCall('macro_gdp', { limit: 2 });
    const rows = parseCSV(text);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]['period'] || rows[0]['值']).toBeTruthy();
  }, TO);

  it('macro_cpi 返回数据', async () => {
    const text = await mcpCall('macro_cpi', { limit: 2 });
    const rows = parseCSV(text);
    expect(rows.length).toBeGreaterThanOrEqual(1);
  }, TO);

  it('macro_pmi 返回数据', async () => {
    const text = await mcpCall('macro_pmi', { limit: 2 });
    const rows = parseCSV(text);
    expect(rows.length).toBeGreaterThanOrEqual(1);
  }, TO);
});
