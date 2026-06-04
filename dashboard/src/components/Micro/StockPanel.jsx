import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { useMCP } from '../../hooks/useMCP';
import { mcp } from '../../services/mcp';

const MONET = ['#d2991d','#a371f7','#58a6ff','#f85149','#3fb950','#db6d28','#7b5ea7','#c49ba5'];

export default function StockPanel() {
  const [keyword, setKeyword] = useState('贵州茅台');
  const [symbol, setSymbol] = useState('600519');
  const [stockName, setStockName] = useState('贵州茅台');

  const { data: hist } = useMCP('individual_hist', { symbol, period: 'daily' });
  const { data: fin } = useMCP('financial_indicators', { symbol });
  const { data: peer } = useMCP('peer_comparison', { symbol });
  const { data: fund } = useMCP('capital_tracking', { symbol });
  const { data: info } = useMCP('individual_info', { symbol });

  function doSearch() {
    if (!keyword.trim()) return;
    mcp.call('search', { keyword, market: 'sh' }).then(text => {
      const lines = text.trim().split('\n');
      for (const l of lines) {
        if (l.startsWith('code:')) { const c = l.split(/\s+/)[1]; if (c) setSymbol(c); }
        if (l.startsWith('name:')) { const n = l.split(/\s+/)[1]; if (n) setStockName(n); }
      }
    }).catch(() => {});
  }

  useEffect(() => { doSearch(); }, []);

  // K线
  const klineOpt = hist ? (() => {
    const m = hist.match(/=== K线数据 ===\n([\s\S]+?)\n\n/);
    if (!m) return null;
    const lines = m[1].trim().split('\n'); if (lines.length < 2) return null;
    const h = lines[0].split(',');
    const di = h.indexOf('日期'), oi = h.indexOf('开盘'), ci = h.indexOf('收盘');
    const hi = h.indexOf('最高'), li = h.indexOf('最低'), vi = h.indexOf('成交量');
    const dates=[], ohlc=[], vol=[];
    lines.slice(1).reverse().forEach(l => {
      const p = l.split(',');
      if(p.length>6){dates.push(p[di]?.slice(5)||'');ohlc.push([+p[oi],+p[ci],+p[li],+p[hi]]);vol.push(+p[vi]);}
    });
    if(!dates.length) return null;
    return {
      tooltip:{trigger:'axis',axisPointer:{type:'cross'}},
      legend:{data:['K线','成交量'],textStyle:{color:'#B0A898'},top:0},
      grid:[{left:'6%',right:'3%',bottom:'25%',height:'55%'},{left:'6%',right:'3%',top:'78%',height:'18%'}],
      xAxis:[{type:'category',data:dates,axisLabel:{color:'#B0A898',fontSize:9,rotate:30},gridIndex:0},{type:'category',data:dates,axisLabel:{show:false},gridIndex:1}],
      yAxis:[{type:'value',scale:true,axisLabel:{color:'#B0A898',fontSize:10},splitLine:{lineStyle:{color:'rgba(212,168,83,0.08)'}},gridIndex:0},{type:'value',scale:true,axisLabel:{color:'#B0A898',fontSize:10},gridIndex:1}],
      series:[{name:'K线',type:'candlestick',data:ohlc,itemStyle:{color:MONET[3],color0:MONET[4],borderColor:MONET[3],borderColor0:MONET[4]}},{name:'成交量',type:'bar',data:vol,xAxisIndex:1,yAxisIndex:1,itemStyle:{color:MONET[0]+'60'}}],
    };
  })() : null;

  // 财务指标
  const finLines = fin ? fin.trim().split('\n') : [];
  const finH = finLines.length > 0 ? finLines[0].split(',') : [];
  const finLast = finLines.length > 1 ? finLines[finLines.length - 1].split(',') : [];
  const fget = (name) => { const i = finH.indexOf(name); return i >= 0 && finLast[i] ? finLast[i] : '—'; };

  // 主要股东
  const shareRows = info ? (() => {
    const m = info.match(/编号,股东名称[^]+?(?=\n\n)/);
    if (!m) return [];
    return m[0].trim().split('\n').slice(1).filter(l=>l.trim()).map(l => {const p=l.split(','); return {name:p[1]||'',ratio:p[3]||'',shares:p[2]||''};}).slice(0,5);
  })() : [];

  return (
    <div style={{ padding: '32px 36px' }}>
      {/* 搜索区 — 大气舒展 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 500 }}>
          <input value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="输入公司名称或股票代码，如 贵州茅台 / 600519"
            style={{
              width: '100%', padding: '14px 20px', fontSize: 16, borderRadius: 12, outline: 'none',
              border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)',
              transition: 'border 0.2s', letterSpacing: 0.5,
            }}
          />
        </div>
        <button onClick={doSearch} style={{
          padding: '14px 32px', fontSize: 16, fontWeight: 600, borderRadius: 12, cursor: 'pointer',
          border: '1px solid var(--accent-gold)', background: 'rgba(212,168,83,0.12)', color: 'var(--accent-gold)',
          transition: 'all 0.2s', letterSpacing: 1,
        }}>🔍 查询</button>
        <div style={{ padding: '10px 20px', background: 'rgba(0,0,0,0.25)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginRight: 12 }}>{stockName}</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{symbol}.SH</span>
        </div>
      </div>

      {/* K线 */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--accent-gold)' }}>📈 K线走势 · {stockName}</h3>
        {klineOpt ? <ReactECharts option={klineOpt} style={{ height: 400, width: '100%' }} theme="dark" notMerge />
          : <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>加载K线数据...</div>}
      </div>

      {/* 财务指标卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: '营收增长率', val: fget('主营业务收入增长率(%)'), color: MONET[0] },
          { label: '净利润增长率', val: fget('净利润增长率(%)'), color: MONET[3] },
          { label: 'ROE', val: fget('净资产收益率(%)'), color: MONET[4] },
          { label: '毛利率', val: fget('销售毛利率(%)'), color: MONET[1] },
          { label: '负债率', val: fget('资产负债率(%)'), color: MONET[5] },
        ].map((c, i) => (
          <div key={i} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '18px 20px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.val}%</div>
          </div>
        ))}
      </div>

      {/* 主要股东 */}
      {shareRows.length > 0 && (
        <div style={{ background: 'var(--bg-panel)', borderRadius: 18, padding: 24, border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--accent-gold)' }}>🏛️ 主要股东</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>股东名称</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>持股比例</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>持股数量</th>
            </tr></thead>
            <tbody>
              {shareRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(212,168,83,0.06)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-primary)' }}>{r.name}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: MONET[0] }}>{r.ratio}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)' }}>{r.shares}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
