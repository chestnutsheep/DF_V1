import { useState } from 'react';
import { useMCP } from '../../hooks/useMCP';
import DataChart from '../common/DataChart';
import DataCard from '../common/DataCard';

/** 申万一级行业列表（从 industry_sw_daily 返回数据中解析） */
function parseSWIndustries(csv) {
  if (!csv) return [];
  return csv.trim().split('\n').slice(1).map(l => {
    const p = l.split(',');
    return { code: p[0], name: p[1], date: p[2], close: parseFloat(p[3]) || 0, change: parseFloat(p[5]) || 0, pe: parseFloat(p[7]) || 0, pb: parseFloat(p[8]) || 0 };
  }).filter(i => i.name);
}

/** 解析 industry_daily_query CSV */
function parseDaily(csv) {
  if (!csv) return [];
  return csv.trim().split('\n').slice(1).map(l => {
    const p = l.split(',');
    return { period: p[1]?.slice(5) || p[1], close: parseFloat(p[3]) || 0, change: parseFloat(p[8]) || 0, volume: parseFloat(p[6]) || 0 };
  }).filter(d => !isNaN(d.close)).slice(-120);
}

export default function MesoLayout() {
  const swResult = useMCP('industry_sw_daily', { symbol: '一级行业' });
  const industries = parseSWIndustries(swResult.data);
  const [activeInd, setActiveInd] = useState('');

  // 默认选中第一个有数据行业
  if (!activeInd && industries.length > 0) {
    // 会在下次渲染设置
  }
  const selName = activeInd || (industries[0]?.name || '');
  const sel = industries.find(i => i.name === selName);

  const dailyResult = useMCP('industry_daily_query', { industry: selName, limit: 120 });
  const chartData = parseDaily(dailyResult.data);
  const latest = chartData[chartData.length - 1] || {};
  const prev = chartData[chartData.length - 2] || {};

  // 排序：涨幅前5/后5
  const sorted = [...industries].sort((a, b) => b.change - a.change);
  const top5 = sorted.slice(0, 5);
  const bottom5 = sorted.slice(-5).reverse();

  const chartSeries = [{ key: 'change', name: `${selName}涨跌幅`, color: '#d2991d', type: 'line' }];
  const metrics = [
    { key: 'close', label: '收盘', unit: '', decimals: 2, higherBetter: true },
    { key: 'change', label: '涨跌幅', unit: '%', decimals: 2, higherBetter: true },
    { key: 'volume', label: '成交额', unit: '亿', decimals: 0, higherBetter: true },
    { key: 'pe', label: 'PE', unit: '', decimals: 1, higherBetter: null },
  ];
  const extraMetrics = [
    { key: 'pb', label: 'PB', unit: '', decimals: 2, higherBetter: null },
    { key: 'close', label: '指数', unit: '', decimals: 2, higherBetter: true },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>🏭 中观产业</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>申万一级行业 · 涨跌排行 · 详情</p>
      </div>
      <hr className="section-divider" />

      {/* 行业导航 — 来自 SW 一级行业 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {industries.slice(0, 31).map(ind => (
          <button key={ind.code} onClick={() => setActiveInd(ind.name)}
            style={{ padding: '3px 10px', borderRadius: 2, fontSize: 11, fontWeight: selName === ind.name ? 700 : 500,
              background: selName === ind.name ? 'var(--accent-gold)' : 'transparent',
              color: selName === ind.name ? '#000' : 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
            {ind.name}
          </button>
        ))}
      </div>

      <hr className="section-divider-thin" />

      {/* 涨幅前5 / 跌幅前5 */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#3fb950' }}>🔥 涨幅 TOP 5</div>
          {top5.map((i, idx) => (
            <div key={i.code} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: idx < 4 ? '1px solid var(--border-subtle)' : 'none', fontSize: 12, cursor: 'pointer' }} onClick={() => setActiveInd(i.name)}>
              <span style={{ width: 28, color: 'var(--text-muted)' }}>#{idx + 1}</span>
              <span style={{ fontWeight: 600, flex: 1 }}>{i.name}</span>
              <span style={{ color: i.change >= 0 ? '#3fb950' : '#f85149', fontWeight: 700 }}>{i.change >= 0 ? '+' : ''}{i.change.toFixed(2)}%</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>PE {i.pe.toFixed(1)}</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#f85149' }}>❄️ 跌幅 TOP 5</div>
          {bottom5.map((i, idx) => (
            <div key={i.code} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: idx < 4 ? '1px solid var(--border-subtle)' : 'none', fontSize: 12, cursor: 'pointer' }} onClick={() => setActiveInd(i.name)}>
              <span style={{ width: 28, color: 'var(--text-muted)' }}>#{idx + 1}</span>
              <span style={{ fontWeight: 600, flex: 1 }}>{i.name}</span>
              <span style={{ color: i.change >= 0 ? '#3fb950' : '#f85149', fontWeight: 700 }}>{i.change >= 0 ? '+' : ''}{i.change.toFixed(2)}%</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>PE {i.pe.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>

      <hr className="section-divider-thin" />

      {/* 选中行业 → 图表 + 指标卡 */}
      {sel && (
        <>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{selName}</span>
            <span style={{ marginLeft: 8, fontSize: 13, color: sel.change >= 0 ? '#3fb950' : '#f85149' }}>
              {sel.change >= 0 ? '+' : ''}{sel.change.toFixed(2)}%
            </span>
            <span style={{ marginLeft: 12, fontSize: 11, color: 'var(--text-muted)' }}>PE {sel.pe.toFixed(1)} · PB {sel.pb.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ width: '75%' }}>
              <DataChart data={chartData} series={chartSeries} dateKey="period" height={320} />
            </div>
            <div style={{ width: '12.5%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {metrics.map(m => (
                <DataCard key={m.key} label={m.label} value={latest[m.key]} prevValue={prev[m.key]} unit={m.unit} decimals={m.decimals} higherBetter={m.higherBetter} />
              ))}
              {extraMetrics.slice(0, 2).map(m => (
                <DataCard key={m.key} label={m.label} value={sel[m.key]} higherBetter={m.higherBetter} decimals={m.decimals} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
