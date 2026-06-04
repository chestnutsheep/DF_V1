import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { mcp } from '../../services/mcp';

const MONET = ['#d2991d','#a371f7','#58a6ff','#f85149','#3fb950','#db6d28','#7b5ea7','#c49ba5'];

function useMCP(fn) {
  const [d, setD] = useState(null);
  useEffect(() => { fn().then(setD).catch(() => {}); }, []);
  return d;
}

function line(csv, title, color) {
  if (!csv) return null;
  const l = csv.trim().split('\n');
  if (l.length < 2) return null;
  const dates = [], prices = [];
  l.slice(1).reverse().forEach(r => { const s = r.split(','); if (s.length >= 3) { dates.push(s[1].slice(5)); prices.push(parseFloat(s[3])); } });
  return {
    backgroundColor: 'transparent', tooltip: { trigger: 'axis', theme: 'dark' },
    title: { text: title, textStyle: { color: '#B0A898', fontSize: 12 }, left: 'center' },
    grid: { left: '8%', right: '5%', bottom: '20%', top: '22%' },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#B0A898', fontSize: 10, rotate: 30 } },
    yAxis: { type: 'value', axisLabel: { color: '#B0A898', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(212,168,83,0.08)' } } },
    series: [{ type: 'line', data: prices, smooth: true, symbol: 'none', lineStyle: { color, width: 1.5 } }],
  };
}

export default function MesoTab() {
  const bank = useMCP(() => mcp.industry.daily('银行', 120));
  const steel = useMCP(() => mcp.industry.daily('钢铁', 120));
  const estate = useMCP(() => mcp.industry.daily('房地产开发', 120));
  const wine = useMCP(() => mcp.industry.daily('白酒', 120));

  return (
    <div style={{ padding: '28px 32px', maxWidth: 'calc(100% - 320px)' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>🏭 中观行业</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>90 行业 · 日行情 · 同花顺</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[['银行', bank, MONET[4]], ['钢铁', steel, MONET[0]], ['房地产', estate, MONET[2]], ['白酒', wine, MONET[3]]].map(([name, data, color]) => {
          const o = line(data, name, color);
          return (
            <div key={name} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
              {o ? <ReactECharts option={o} style={{ height: 220, width: '100%' }} theme="dark" notMerge /> : <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>{name} 加载中...</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
