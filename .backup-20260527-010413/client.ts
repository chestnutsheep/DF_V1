let _requestId = 1;

export async function mcpCall(tool: string, args: Record<string, unknown> = {}): Promise<string> {
  const id = _requestId++;
  const resp = await fetch('/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: tool, arguments: args },
      id,
    }),
  });
  if (!resp.ok) throw new Error(`MCP request failed: ${resp.status}`);
  const body = await resp.json();
  if (body.error) throw new Error(body.error.message || 'MCP error');
  const text = body.result?.content?.[0]?.text;
  if (text === undefined) throw new Error('MCP returned empty content');
  return text as string;
}

export async function mcpCallJSON<T>(tool: string, args: Record<string, unknown> = {}): Promise<T> {
  const text = await mcpCall(tool, args);
  return JSON.parse(text) as T;
}

export async function mcpCallCSV(tool: string, args: Record<string, unknown> = {}): Promise<Record<string, string>[]> {
  const text = await mcpCall(tool, args);
  if (!text) return [];
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}
