export const mcp = {
  async call(toolName, args = {}) {
    const response = await fetch('/api/tools/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: toolName,
        arguments: args,
      }),
    });
    const json = await response.json();
    if (!json.ok) throw new Error(json.error || 'MCP call failed');
    return json.data || null;
  },

  policy: {
    stats: () => mcp.call('policy_stats'),
    search: (keyword = '', org = '', limit = 50) =>
      mcp.call('policy_search', { keyword, org, limit }),
  },

  cycles: {
    status: () => mcp.call('cycle_cache_status'),
  },
};
