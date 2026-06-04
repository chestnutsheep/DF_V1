/**
 * MCP 数据服务层 — 通过 HTTP API 调用 DeepFusion 工具。
 *
 * 后端: python -m deep_fusion serve 8080
 * 前端: import { mcp } from '../services/mcp'
 */

const API_BASE = import.meta.env.VITE_MCP_URL || 'http://localhost:8080';

async function request(method, params = {}) {
  const resp = await fetch(`${API_BASE}/api/tools/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: method, arguments: params }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || `${resp.status} ${resp.statusText}`);
  }
  const json = await resp.json();
  if (!json?.ok) throw new Error(json?.error || 'API error');
  return json?.data ?? '';
}

/** 跳过 === 标题行和空行，取 CSV 表头行 */
function trimMeta(lines) {
  const start = lines.findIndex(l => l && !l.startsWith('===') && !l.startsWith('共'));
  return start >= 0 ? lines.slice(start) : lines;
}

export const mcp = {
  call: request,

  /** 调用并解析 JSON */
  callJSON: async (tool, args = {}) => {
    try {
      const text = await request(tool, args);
      if (!text) return null;
      return JSON.parse(text);
    } catch { return null; }
  },

  /** 调用并解析 CSV → 对象数组 */
  callCSV: async (tool, args = {}) => {
    const text = await request(tool, args);
    if (!text) return [];
    const lines = trimMeta(text.trim().split('\n'));
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim());
      const row = {};
      headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
      return row;
    });
  },

  policy: {
    collect: (pages = 2) => request('policy_collect', { max_pages: pages }),
    search: (keyword = '', org = '', limit = 50) =>
      request('policy_search', { keyword, org, limit }),
    stats: () => request('policy_stats'),
    detail: (url) => request('policy_detail', { url }),
  },

  cycles: {
    status: () => request('cycle_cache_status'),
    collect: () => request('cycle_collect'),
    fredData: (series = 'fred_ppiaco', limit = 20) =>
      request('fred_data', { series, limit }),
    wbData: (indicator = 'wb_gdp_growth', limit = 20) =>
      request('wb_data', { indicator, limit }),
  },

  industry: {
    daily: (industry = '', limit = 20) =>
      request('industry_daily_query', { industry, limit }),
    swTree: () => request('industry_sw_tree'),
    fundFlow: (limit = 20) =>
      request('industry_capital_flow', { limit }),
  },

  spot: {
    prices: (symbol = '螺纹钢', limit = 20) =>
      request('spot_prices', { symbol, limit }),
  },

  caixin: {
    data: (name = '中国新经济指数', limit = 20) =>
      request('caixin_indices', { name, limit }),
  },

  ff: () => request('ff_factors'),
};
