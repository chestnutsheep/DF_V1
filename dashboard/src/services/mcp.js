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
  return json?.data ?? '';
}

export const mcp = {
  call: request,

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
