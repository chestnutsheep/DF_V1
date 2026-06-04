import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useMCP } from '../../hooks/useMCP';

const MONET = ['#d2991d','#a371f7','#58a6ff','#f85149','#3fb950','#db6d28','#7b5ea7','#c49ba5'];

/* ── 期货面板 ── */
export function FuturesPanel() {
  const [symbol, setSymbol] = useState('螺纹钢');
  const [inputVal, setInputVal] = useState('螺纹钢');
  const { data: price } = useMCP('futures_prices', { symbol, limit: 30 });
  const { data: basis } = useMCP('futures_basis', { symbol });
  const { data: pos } = useMCP('futures_positions', { symbol });
  const { data: inv } = useMCP('futures_inventory', { symbol });

  const opt = price ? (() => {
    const lines = price.trim().split('\n'); if (lines.length < 2) return null;
    const h = lines[0].split(','); const ci = h.indexOf('close') >= 0 ? h.indexOf('close') : 2;
    const p = lines.slice(1).map(l => parseFloat(l.split(',')[ci])).filter(v => !isNaN(v));
    if (p.length < 2) return null;
    return { grid: { left: '8%', right: '5%', bottom: '20%', top: '16%' },
      xAxis: { type: 'category', data: p.map((_,i)=>i+1), axisLabel: { show: false } },
      yAxis: { type: 'value', axisLabel: { color: '#B0A898', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(212,168,83,0.08)' } } },
      series: [{ type: 'line', data: p, smooth: true, lineStyle: { color: MONET[0], width: 2 }, areaStyle: { color: MONET[0]+'15' }, symbol: 'none' }],
    };
  })() : null;

  const commonSymbols = ['螺纹钢','铁矿石','沪铜','原油','豆粕','沪金','焦炭','甲醇'];
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={inputVal} onChange={e => setInputVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && setSymbol(inputVal)}
          placeholder="输入品种名称，如 螺纹钢、沪铜、原油"
          style={{ padding: '12px 18px', fontSize: 15, borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)', outline: 'none', width: 280 }} />
        <button onClick={() => setSymbol(inputVal)} style={{ padding: '12px 24px', borderRadius: 10, border: '1px solid var(--accent-gold)', background: 'rgba(212,168,83,0.12)', color: 'var(--accent-gold)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>📊 查询</button>
        {commonSymbols.map(s => (
          <span key={s} onClick={() => { setSymbol(s); setInputVal(s); }}
            style={{ padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, background: symbol === s ? 'rgba(212,168,83,0.15)' : 'rgba(0,0,0,0.2)', border: symbol === s ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)', color: symbol === s ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>{s}</span>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--bg-panel)', borderRadius: 16, padding: 20, border: '1px solid var(--border-subtle)' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📈 {symbol} 主力合约走势</h4>
          {opt ? <ReactECharts option={opt} style={{ height: 220 }} theme="dark" notMerge /> : <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>加载中...</div>}
        </div>
        <div style={{ background: 'var(--bg-panel)', borderRadius: 16, padding: 20, border: '1px solid var(--border-subtle)' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📋 数据摘要</h4>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: 1.8 }}>
            {basis ? `基差: ${basis.slice(0, 80)}` : '加载基差...'}{'\n'}
            {pos ? `持仓: ${pos.slice(0, 80)}` : '加载持仓...'}{'\n'}
            {inv ? `库存: ${inv.slice(0, 80)}` : '加载库存...'}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 债券面板 ── */
export function BondPanel() {
  const { data: yieldsCsv } = useMCP('bond_yields', { limit: 60, china_only: true });
  const rows = yieldsCsv ? yieldsCsv.trim().split('\n').slice(1) : [];
  const latest = rows.length > 0 ? rows[rows.length - 1].split(',') : [];
  const dates = rows.map(r => r.split(',')[0]?.slice(5) || '');
  const cn10 = rows.map(r => parseFloat(r.split(',')[3] || '0'));

  const opt = dates.length > 2 ? {
    grid: { left: '8%', right: '5%', bottom: '18%', top: '12%' },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#B0A898', fontSize: 9 } },
    yAxis: { type: 'value', axisLabel: { color: '#B0A898', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(212,168,83,0.08)' } } },
    series: [{ type: 'line', data: cn10, smooth: true, lineStyle: { color: MONET[0], width: 2 }, areaStyle: { color: MONET[0]+'12' }, symbol: 'none' }],
  } : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ background: 'var(--bg-panel)', borderRadius: 16, padding: 24, border: '1px solid var(--border-subtle)' }}>
        <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>📜 中国国债收益率曲线</h4>
        {opt ? <ReactECharts option={opt} style={{ height: 240 }} theme="dark" notMerge />
          : <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>加载中...</div>}
      </div>
      <div style={{ background: 'var(--bg-panel)', borderRadius: 16, padding: 24, border: '1px solid var(--border-subtle)' }}>
        <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>📊 当前收益率</h4>
        {latest.length >= 6 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: '2 年期', val: latest[1], color: MONET[2] },
              { label: '5 年期', val: latest[2], color: MONET[0] },
              { label: '10 年期', val: latest[3], color: MONET[3] },
              { label: '30 年期', val: latest[4], color: MONET[4] },
              { label: '10-2 利差', val: latest[5], color: MONET[5] },
            ].map((c, i) => (
              <div key={i} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 16, textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.val}%</div>
              </div>
            ))}
          </div>
        ) : <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>加载中...</div>}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>数据源: 中债登 · 更新: {latest[0] || '--'}</div>
      </div>
    </div>
  );
}

/* ── 期权面板（QVIX）── */
export function OptionPanel() {
  const { data: qvix } = useMCP('option_ivix', { limit: 180 });
  const rows = qvix ? qvix.trim().split('\n').slice(1) : [];
  const dates = rows.map(r => r.split(',')[0]?.slice(5) || '');
  const val = rows.map(r => parseFloat(r.split(',')[4] || '0'));
  const cur = val.length > 0 ? val[val.length - 1] : null;

  const opt = dates.length > 2 ? {
    grid: { left: '8%', right: '5%', bottom: '18%', top: '10%' },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#B0A898', fontSize: 9, rotate: 30 } },
    yAxis: { type: 'value', min: 10, max: 35, axisLabel: { color: '#B0A898', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(212,168,83,0.08)' } } },
    series: [{ type: 'line', data: val, smooth: true, lineStyle: { color: MONET[1], width: 2 }, areaStyle: { color: MONET[1]+'12' }, symbol: 'none' }],
  } : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ background: 'var(--bg-panel)', borderRadius: 16, padding: 24, border: '1px solid var(--border-subtle)' }}>
        <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>🎯 50ETF QVIX（中国版恐慌指数）</h4>
        {opt ? <ReactECharts option={opt} style={{ height: 260 }} theme="dark" notMerge />
          : <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>加载中...</div>}
      </div>
      <div style={{ background: 'var(--bg-panel)', borderRadius: 16, padding: 24, border: '1px solid var(--border-subtle)' }}>
        <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>📊 QVIX 解读</h4>
        {cur !== null ? (
          <div>
            <div style={{ fontSize: 48, fontWeight: 700, color: cur > 25 ? MONET[3] : cur > 20 ? MONET[0] : MONET[4], textAlign: 'center', marginBottom: 16 }}>
              {cur.toFixed(1)}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 20 }}>
              {cur >= 30 ? '极度恐慌 — 市场情绪悲观' : cur >= 25 ? '恐慌 — 避险情绪升温' : cur >= 20 ? '中性偏恐慌' : cur >= 15 ? '正常波动区间' : '市场情绪平稳'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>历史区间</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>15 ~ 35</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>数据量</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{rows.length} 日</div>
              </div>
            </div>
          </div>
        ) : <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>加载中...</div>}
      </div>
    </div>
  );
}

/* ── 基金面板 ── */
export function FundPanel() {
  const [code, setCode] = useState('000001');
  const { data: info } = useMCP('fund_info', { code });
  const { data: nav } = useMCP('fund_nav', { code, limit: 60 });
  const { data: ranking } = useMCP('fund_ranking', { fund_type: '股票型' });

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <input value={code} onChange={e => setCode(e.target.value)}
          placeholder="输入基金代码，如 000001"
          style={{ padding: '12px 18px', fontSize: 15, borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)', outline: 'none', width: 240 }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>例如: 000001(华夏成长) · 110011(易方达中小盘)</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--bg-panel)', borderRadius: 16, padding: 20, border: '1px solid var(--border-subtle)' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📦 基金信息</h4>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>{info || '加载中...'}</div>
        </div>
        <div style={{ background: 'var(--bg-panel)', borderRadius: 16, padding: 20, border: '1px solid var(--border-subtle)' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>🏆 股票型基金排名</h4>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>{ranking || '加载中...'}</div>
        </div>
      </div>
    </div>
  );
}
