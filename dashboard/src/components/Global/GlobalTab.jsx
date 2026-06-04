import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { mcp } from '../../services/mcp';

/** 单个 World Bank 指标卡片组件 */
function WbCard({ indicator, label }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    mcp.cycles.wbData(indicator).then(setData).catch(() => {});
  }, [indicator]);

  const lines = data ? data.trim().split('\n') : [];
  const latest = lines.length > 1 ? lines[lines.length - 1].split(',')[1] : '—';
  return (
    <div style={{
      background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius)', padding: 14,
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, margin: '4px 0' }}>{latest}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{lines.length > 1 ? `${lines.length - 1} 条数据` : '加载...'}</div>
    </div>
  );
}

/** 图表生成辅助 */
function makeOpt(csv, name, color) {
  if (!csv) return null;
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return null;
  const years = [], vals = [];
  lines.slice(1).forEach(l => {
    const [y, v] = l.split(',');
    if (y && v) { years.push(y); vals.push(parseFloat(v)); }
  });
  return {
    backgroundColor: 'transparent', tooltip: { trigger: 'axis', theme: 'dark' },
    title: { text: name, textStyle: { color: '#d1c2ae', fontSize: 12 }, left: 'center' },
    grid: { left: '8%', right: '5%', bottom: '18%', top: '22%' },
    xAxis: { type: 'category', data: years, axisLabel: { color: '#d7cfb0', fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { color: '#d1c2ae', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(212,168,83,0.08)' } } },
    series: [{ type: 'line', data: vals, smooth: true, symbol: 'none', lineStyle: { color, width: 1.5 } }],
  };
}

export default function GlobalTab() {
  const [gdp, setGdp] = useState(null);
  const [pop, setPop] = useState(null);

  useEffect(() => {
    mcp.cycles.wbData('wb_gdp_growth').then(setGdp).catch(() => {});
    mcp.cycles.wbData('wb_population').then(setPop).catch(() => {});
  }, []);

  const cardDefs = [
    { indicator: 'wb_trade_pct', label: 'Trade / GDP' },
    { indicator: 'wb_inflation', label: 'CPI Inflation' },
    { indicator: 'wb_patent', label: 'Patent Apps' },
    { indicator: 'wb_electricity', label: 'Elec per capita' },
  ];

  return (
    <div style={{ padding: '28px 32px', maxWidth: 'calc(100% - 320px)' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>🌍 国际数据</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>FRED · World Bank</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[makeOpt(gdp, '全球GDP增长率', '#f85149'), makeOpt(pop, '全球总人口', '#3fb950')].map((o, i) => (
          <div key={i} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
            {o ? <ReactECharts option={o} style={{ height: 240, width: '100%' }} theme="dark" notMerge />
              : <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>加载...</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 20 }}>
        {cardDefs.map(c => <WbCard key={c.indicator} indicator={c.indicator} label={c.label} />)}
      </div>
    </div>
  );
}
