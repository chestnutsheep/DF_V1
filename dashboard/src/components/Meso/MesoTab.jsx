import ReactECharts from 'echarts-for-react';
import { useQueryMCP, useQueryMCPCSV } from '../../hooks/useQueryMCP';

const MONET = ['#d2991d','#a371f7','#58a6ff','#f85149','#3fb950','#db6d28','#7b5ea7','#c49ba5'];

function lineChart(csv, title, color) {
  if (!csv) return null;
  const rows = Array.isArray(csv) ? csv : (() => {
    const l = csv.trim().split('\n');
    if (l.length < 2) return [];
    const h = l[0].split(',');
    return l.slice(1).map(r => { const s = r.split(','); const o = {}; h.forEach((k,i) => o[k]=s[i]); return o; });
  })();
  if (!rows.length) return null;
  const data = rows.slice(-120);
  const dates = data.map(r => (r.trade_date || r.date || '').slice(5));
  const prices = data.map(r => parseFloat(r.close || r.value));
  return {
    backgroundColor: 'transparent', tooltip: { trigger: 'axis', theme: 'dark' },
    title: { text: title, textStyle: { color: '#B0A898', fontSize: 13, fontWeight: 600 }, left: 'center' },
    grid: { left: '8%', right: '5%', bottom: '22%', top: '25%' },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#B0A898', fontSize: 9, rotate: 30 } },
    yAxis: { type: 'value', axisLabel: { color: '#B0A898', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(212,168,83,0.08)' } } },
    series: [{ type: 'line', data: prices, smooth: true, symbol: 'none', lineStyle: { color, width: 1.5 } }],
  };
}

const TOP_IND = ['银行','钢铁','房地产','白酒'];

export default function MesoTab() {
  const tree = useQueryMCP('industry_sw_tree');
  const fundFlow = useQueryMCPCSV('industry_capital_flow', { limit: 8 });

  const charts = TOP_IND.map(name => ({
    name,
    data: useQueryMCP('industry_daily_query', { industry: name, limit: 120 }),
  }));

  return (
    <div style={{ padding: '28px 0' }}>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {charts.map(({ name, data }, i) => {
          const o = lineChart(data.data, name, MONET[i]);
          return (
            <div key={name} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
              {o ? <ReactECharts option={o} style={{ height: 220, width: '100%' }} theme="dark" notMerge />
                : <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>{name} 加载中...</div>}
            </div>
          );
        })}
      </div>

      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '16px 20px 8px', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>📊 行业资金流排行</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'rgba(212,168,83,0.08)' }}>
              <th style={{ padding: '8px 16px', textAlign: 'left', color: 'var(--accent-gold)' }}>行业</th>
              <th style={{ padding: '8px 16px', textAlign: 'right', color: 'var(--accent-gold)' }}>涨跌幅</th>
              <th style={{ padding: '8px 16px', textAlign: 'right', color: 'var(--accent-gold)' }}>净流入</th>
            </tr>
          </thead>
          <tbody>
            {(fundFlow.data || []).slice(0, 8).map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(212,168,83,0.06)' }}>
                <td style={{ padding: '8px 16px', color: 'var(--text-primary)' }}>{r.industry_name}</td>
                <td style={{ padding: '8px 16px', textAlign: 'right', color: parseFloat(r.change_pct) >= 0 ? '#3fb950' : '#f85149' }}>{r.change_pct}%</td>
                <td style={{ padding: '8px 16px', textAlign: 'right', color: parseFloat(r.net_amount) >= 0 ? '#3fb950' : '#f85149' }}>{(parseFloat(r.net_amount)/1e4).toFixed(1)}万</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details style={{ marginTop: 12 }}>
        <summary style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px 0' }}>🏗️ 申万三级行业树</summary>
        <pre style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, maxHeight: 400, overflow: 'auto', padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius)' }}>
          {tree.data ? (tree.data.length > 2000 ? tree.data.slice(0, 2000) + '\n... (截断)' : tree.data) : '加载中...'}
        </pre>
      </details>
    </div>
  );
}
