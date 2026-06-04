import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useQueryMCP } from '../../hooks/useQueryMCP';
import { mcp } from '../../services/mcp';

const MONET = ['#d2991d','#a371f7','#58a6ff','#f85149','#3fb950','#db6d28','#7b5ea7','#c49ba5'];

function Section({ title, children, loading }) {
  return (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>{title}</h3>
      {loading ? (
        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>加载中...</div>
      ) : children}
    </div>
  );
}

export default function StockPanel() {
  const [keyword, setKeyword] = useState('贵州茅台');
  const [symbol, setSymbol] = useState('600519');
  const [stockName, setStockName] = useState('贵州茅台');

  const fin = useQueryMCP('financial_indicators', { symbol });
  const hist = useQueryMCP('individual_hist', { symbol, period: 'daily' });

  // 延迟加载——等个股确定后再发起
  const peer = useQueryMCP('peer_comparison', { symbol });
  const fund = useQueryMCP('capital_tracking', { symbol });

  function doSearch() {
    if (!keyword.trim()) return;
    mcp.call('search', { keyword, market: 'sh' }).then(text => {
      const lines = text.trim().split('\n');
      let code = '', name = '';
      for (const l of lines) {
        if (l.startsWith('code') && !l.startsWith('code:')) {
          const parts = l.split(/\s+/);
          if (parts.length >= 2) code = parts[1];
        }
        if (l.startsWith('name') && !l.startsWith('name:')) {
          const parts = l.split(/\s+/);
          if (parts.length >= 2) name = parts[1];
        }
      }
      if (code && code !== symbol) { setSymbol(code); setStockName(name); }
    }).catch(() => {});
  }

  // K线解析
  const klineOpt = hist.data ? (() => {
    const m = hist.data.match(/=== K线数据 ===\n([\s\S]+?)(\n\n|$)/);
    if (!m) return null;
    const lines = m[1].trim().split('\n');
    if (lines.length < 2) return null;
    const h = lines[0].split(',');
    const di = h.indexOf('日期'), oi = h.indexOf('开盘'), ci = h.indexOf('收盘');
    const hi = h.indexOf('最高'), li = h.indexOf('最低'), vi = h.indexOf('成交量');
    const dates = [], ohlc = [], vol = [];
    lines.slice(1).reverse().forEach(l => {
      const p = l.split(',');
      if (p.length > 6) { dates.push(p[di]?.slice(5)||''); ohlc.push([+p[oi],+p[ci],+p[li],+p[hi]]); vol.push(+p[vi]); }
    });
    if (!dates.length) return null;
    return { tooltip:{trigger:'axis',axisPointer:{type:'cross'}},
      legend:{data:['K线','成交量'],textStyle:{color:'#B0A898'},top:0},
      grid:[{left:'6%',right:'3%',bottom:'25%',height:'55%'},{left:'6%',right:'3%',top:'78%',height:'18%'}],
      xAxis:[{type:'category',data:dates,axisLabel:{color:'#B0A898',fontSize:9,rotate:30},gridIndex:0},{type:'category',data:dates,axisLabel:{show:false},gridIndex:1}],
      yAxis:[{type:'value',scale:true,axisLabel:{color:'#B0A898',fontSize:10},splitLine:{lineStyle:{color:'rgba(212,168,83,0.08)'}},gridIndex:0},{type:'value',scale:true,axisLabel:{color:'#B0A898',fontSize:10},gridIndex:1}],
      series:[{name:'K线',type:'candlestick',data:ohlc,itemStyle:{color:MONET[3],color0:MONET[4],borderColor:MONET[3],borderColor0:MONET[4]}},
              {name:'成交量',type:'bar',data:vol,xAxisIndex:1,yAxisIndex:1,itemStyle:{color:MONET[0]+'60'}}]};
  })() : null;

  // 财务解析
  const finRows = fin.data ? (() => {
    const csv = fin.data.match(/=== 财务指标 ===\n([\s\S]+?)(\n\n|$)/)?.[1];
    if (!csv) return [];
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];
    const h = lines[0].split(',');
    return lines.slice(1).map(l => { const v = l.split(','); const o = {}; h.forEach((k,i) => o[k]=v[i]); return o; }).reverse();
  })() : [];

  const lr = finRows[0] || {};

  return (
    <div>
      {/* 搜索框 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, maxWidth: 480 }}>
        <input value={keyword} onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch()}
          placeholder="股票代码/名称" style={{ flex:1, padding:'8px 12px', borderRadius:12, border:'1px solid var(--border-subtle)', background:'var(--bg-panel)', color:'var(--text-primary)' }} />
        <button onClick={doSearch} style={{ padding:'8px 20px', borderRadius:20, background:'var(--accent-gold)', color:'#000', border:'none', cursor:'pointer', fontWeight:600 }}>🔍 查询</button>
      </div>
      <div style={{ fontSize: 14, color:'var(--text-secondary)', marginBottom: 16 }}>{stockName} ({symbol})</div>

      {/* K线 — 优先加载 */}
      <Section title="📊 K线走势" loading={hist.isLoading}>
        {klineOpt ? <ReactECharts option={klineOpt} style={{height:320,width:'100%'}} theme="dark" notMerge />
          : !hist.isLoading && hist.data?.includes('未获取到')
            ? <div style={{textAlign:'center',color:'var(--text-muted)',padding:40}}>K线数据暂不可用（数据源代理问题）</div>
            : null}
      </Section>

      {/* 财务卡 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        {[
          {t:'📊 财务指标',items:[`营收增长率: ${lr['主营业务收入增长率(%)']||'—'}%`,`净利润增长率: ${lr['净利润增长率(%)']||'—'}%`,`ROE: ${lr['净资产收益率(%)']||'—'}%`]},
          {t:'💰 估值',items:[`每股收益: ${lr['摊薄每股收益(元)']||'—'}元`,`每股净资产: ${lr['每股净资产_调整前(元)']||'—'}元`,`每股现金流: ${lr['每股经营性现金流(元)']||'—'}元`]},
          {t:'🏆 质量',items:[`毛利率: ${lr['销售毛利率(%)']||'—'}%`,`净利率: ${lr['销售净利率(%)']||'—'}%`,`负债率: ${lr['资产负债率(%)']||'—'}%`]},
        ].map((c,i)=>(
          <div key={i} style={{background:'var(--bg-panel)',borderRadius:'var(--radius)',padding:16,border:'1px solid var(--border-subtle)'}}>
            <div style={{fontSize:12,fontWeight:700,color:'var(--text-secondary)',marginBottom:8}}>{c.t}</div>
            <ul style={{listStyle:'none',fontSize:12}}>{c.items.map((s,j)=><li key={j} style={{padding:'3px 0',color:'var(--text-secondary)'}}>{s}</li>)}</ul>
          </div>
        ))}
      </div>

      {/* 同业雷达 + 资金流 — 延迟加载 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Section title="同业比较" loading={peer.isLoading}>
          {peer.data && !peer.data.includes('未获取到') ? (() => {
            const lines = peer.data.trim().split('\n');
            if (lines.length < 3) return <div style={{color:'var(--text-muted)',textAlign:'center',padding:20}}>同业数据不足</div>;
            return <div style={{color:'var(--text-secondary)',fontSize:12}}>{lines.slice(0,4).map((l,i)=><div key={i} style={{padding:'4px 0'}}>{l.slice(0,80)}</div>)}</div>;
          })() : <div style={{color:'var(--text-muted)',textAlign:'center',padding:20}}>无同业数据</div>}
        </Section>
        <Section title="主力资金流向" loading={fund.isLoading}>
          {fund.data ? (() => {
            const lines = fund.data.trim().split('\n');
            if (lines.length < 2) return <div style={{color:'var(--text-muted)',textAlign:'center',padding:20}}>无资金流数据</div>;
            const h = lines[0].split(',');
            const di = h.indexOf('日期'), ni = h.indexOf('主力净流入-净额');
            if (di < 0 || ni < 0) return <div style={{color:'var(--text-muted)',textAlign:'center',padding:20}}>资金流格式不符</div>;
            const dates = [], vals = [];
            lines.slice(1).slice(-20).forEach(l => {
              const p = l.split(',');
              if (p.length > ni) { dates.push(p[di]?.slice(5)||''); vals.push(parseFloat(p[ni])/1e8||0); }
            });
            if (!dates.length) return <div style={{color:'var(--text-muted)',textAlign:'center',padding:20}}>无资金流数据</div>;
            return <ReactECharts option={{
              title:{text:'主力净流入(亿元)',textStyle:{color:'#B0A898',fontSize:12},left:'center'},
              grid:{left:'8%',right:'5%',bottom:'18%',top:'22%'},
              xAxis:{type:'category',data:dates,axisLabel:{color:'#B0A898',fontSize:9,rotate:30}},
              yAxis:{type:'value',axisLabel:{color:'#B0A898',fontSize:10},splitLine:{lineStyle:{color:'rgba(212,168,83,0.08)'}}},
              series:[{type:'bar',data:vals.map(v=>({value:v,itemStyle:{color:v>=0?MONET[3]:MONET[4]}}))}],
            }} style={{height:260,width:'100%'}} theme="dark" notMerge />;
          })() : <div style={{color:'var(--text-muted)',textAlign:'center',padding:20}}>无资金流数据</div>}
        </Section>
      </div>
    </div>
  );
}
