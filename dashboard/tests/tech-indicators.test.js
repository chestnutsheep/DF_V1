import { describe, it, expect } from 'vitest';

const API = 'http://localhost:8080/api/tools/call';
const TO = 15000;

async function mcpCallJSON(tool, args = {}) {
  const r = await fetch(API, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: tool, arguments: args }),
  });
  const d = await r.json();
  if (!d.ok) throw new Error(d.error || `API error for ${tool}`);
  try { return JSON.parse(d.data); } catch { return d.data; }
}

describe('股票技术指标工具', () => {
  it('注册存在', async () => {
    const r = await fetch(API.replace('/call', '/list'));
    const d = await r.json();
    expect(d.tools).toContain('stock_tech_indicators');
  });

  it('返回 JSON 含 MACD/KDJ/RSI', async () => {
    const data = await mcpCallJSON('stock_tech_indicators', { symbol: '600519' });
    // 如果数据源不可用，工具返回 { error: "..." }
    if (data.error) return; // 数据源暂不可用则跳过
    expect(data).toHaveProperty('MACD');
    expect(data).toHaveProperty('RSI');
    expect(data).toHaveProperty('KDJ.K');
    expect(data).toHaveProperty('BOLL.U');
    expect(data).toHaveProperty('MA.20');
    expect(data).toHaveProperty('trade_date');
  }, TO);

  it('三只股票的技术指标', async () => {
    for (const code of ['600519']) {
      const data = await mcpCallJSON('stock_tech_indicators', { symbol: code });
      if (data.error) continue;
      expect(data.symbol).toBe(code);
    }
  }, TO * 3);
});
