import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_MCP_URL || 'http://localhost:8080';
const cache = new Map();

export function useMCP(toolName, args = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const key = `${toolName}-${JSON.stringify(args)}`;
    if (cache.has(key)) {
      setData(cache.get(key));
      return;
    }
    setLoading(true);
    fetch(`${API}/api/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: toolName, arguments: args }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          cache.set(key, d.data);
          setData(d.data);
        } else {
          setError(new Error(d.error || 'unknown'));
        }
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [toolName, JSON.stringify(args)]);

  return { data, loading, error };
}
