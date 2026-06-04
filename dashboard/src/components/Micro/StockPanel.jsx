import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useQueryMCP } from '../../hooks/useQueryMCP';
import { mcp } from '../../services/mcp';

const MONET = ['#d2991d','#a371f7','#58a6ff','#f85149','#3fb950','#db6d28','#7b5ea7','#c49ba5'];

/* ── 工具函数 ── */
function tsv(text, marker) {
  const idx = marker ? text.indexOf(marker) : 0; if (idx < 0) return [];
  const block = text.slice(idx + (marker?.length||0)).trim();
  const lines = block.split('\n').filter(l => l && !l.startsWith('===') && !l.startsWith('共'));
  if (lines.length < 2) return [];
  const h = lines[0].split(',').map(s=>s.trim());
  return lines.slice(1).map(l => { const v=l.split(',').map(s=>s.trim()); const o={}; h.forEach((k,i)=>o[k]=v[i]); return o; });
}

function skipMeta(text) {
  return text?.split('\n').filter(l=>l&&!l.startsWith('===')&&!l.startsWith('共')).join('\n')||'';
}

/* ── 分块容器 ── */
function Block({title, loading, children, wide}) {
  return (
    <div className="cb" style={{
      background: 'transparent',
      border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)',
      padding: 20, marginBottom: 16, gridColumn: wide ? '1/-1' : undefined,
    }}>
      {title && <h3 style={{fontSize:14,fontWeight:600,marginBottom:12,color:'var(--text-secondary)',borderLeft:'2px solid var(--accent-gold)',paddingLeft:10}}>{title}</h3>}
      {loading ? <div style={{height:160,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-muted)',fontSize:12}}>加载中...</div> : children}
    </div>
  );
}

/* ── 指标卡列表项 ── */
function Item({label, value, color}) {
  return (
    <li style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid rgba(212,168,83,0.06)',fontSize:13}}>
      <span style={{color:'var(--text-muted)'}}>{label}</span>
      <span style={{color: color || 'var(--text-primary)',fontWeight:600}}>{value}</span>
    </li>
  );
}

/* ── 主组件 ── */
export default function StockPanel() {
  const [keyword, setKeyword] = useState('贵州茅台');
  const [symbol, setSymbol] = useState('600519');
  const [stockName, setStockName] = useState('贵州茅台');

  const fin = useQueryMCP('financial_indicators', { symbol });
  const hist = useQueryMCP('individual_hist', { symbol, period: 'daily' });
  const peer = useQueryMCP('peer_comparison', { symbol });
  const fund = useQueryMCP('capital_tracking', { symbol });

  function doSearch() {
    if (!keyword.trim()) return;
    mcp.call('search', {keyword, market:'sh'}).then(text => {
      const lines = text.trim().split('\n');
      let c='', n='';
      for (const l of lines) {
        if (l.startsWith('code') && !l.startsWith('code:')) { const p=l.split(/\s+/); if(p.length>=2) c=p[1]; }
        if (l.startsWith('name') && !l.startsWith('name:')) { const p=l.split(/\s+/); if(p.length>=2) n=p[1]; }
      }
      if (c && c!==symbol) { setSymbol(c); setStockName(n); }
    }).catch(()=>{});
  }

  /* ── K线 ── */
  const klineOpt = hist.data ? (() => {
    const m = hist.data.match(/=== K线数据 ===\n([\s\S]+?)(\n\n|$)/);
    if (!m) return null;
    const lines = m[1].trim().split('\n'); if (lines.length < 2) return null;
    const h = lines[0].split(',');
    const di=h.indexOf('日期')>=0?h.indexOf('日期'):h.indexOf('date'), oi=h.indexOf('开盘')>=0?h.indexOf('开盘'):h.indexOf('open'), ci=h.indexOf('收盘')>=0?h.indexOf('收盘'):h.indexOf('close'), hi=h.indexOf('最高')>=0?h.indexOf('最高'):h.indexOf('high'), li=h.indexOf('最低')>=0?h.indexOf('最低'):h.indexOf('low'), vi=h.indexOf('成交量')>=0?h.indexOf('成交量'):h.indexOf('volume');
    const dates=[], ohlc=[], vol=[];
    lines.slice(1).reverse().forEach(l => {
      const p=l.split(',');
      if(p.length>6){dates.push(p[di]?.slice(5)||'');ohlc.push([+p[oi],+p[ci],+p[li],+p[hi]]);vol.push(+p[vi]);}
    });
    if (!dates.length) return null;
    return { tooltip:{trigger:'axis',axisPointer:{type:'cross'}},
      legend:{data:['K线','成交量'],textStyle:{color:'#B0A898'},top:0},
      grid:[{left:'6%',right:'3%',bottom:'25%',height:'55%'},{left:'6%',right:'3%',top:'78%',height:'18%'}],
      xAxis:[{type:'category',data:dates,axisLabel:{color:'#B0A898',fontSize:9,rotate:30},gridIndex:0},{type:'category',data:dates,axisLabel:{show:false},gridIndex:1}],
      yAxis:[{type:'value',scale:true,axisLabel:{color:'#B0A898',fontSize:10},splitLine:{lineStyle:{color:'rgba(212,168,83,0.08)'}},gridIndex:0},{type:'value',scale:true,axisLabel:{color:'#B0A898',fontSize:10},gridIndex:1}],
      dataZoom:[{type:'inside',start:50,end:100},{type:'slider',start:50,end:100,height:20,bottom:0}],
      series:[{name:'K线',type:'candlestick',data:ohlc,itemStyle:{color:MONET[3],color0:MONET[4],borderColor:MONET[3],borderColor0:MONET[4]}},
              {name:'成交量',type:'bar',data:vol,xAxisIndex:1,yAxisIndex:1,itemStyle:{color:MONET[0]+'60'}}]};
  })() : null;

  /* ── 财务指标 ── */
  const finRows = fin.data ? tsv(fin.data, '=== 财务指标 ===') : [];
  const lr = finRows[finRows.length - 1] || {};
  const f = (k) => lr[k] || '—';

  /* ── 资金流 ── */
  const fundRows = fund.data ? tsv(fund.data, '=== 个股资金流 ===') : [];

  /* ── 同业比较（多表） ── */
  const peerGrowth  = peer.data ? tsv(peer.data, '=== 成长性比较 ===') : [];
  const peerValuation = peer.data ? tsv(peer.data, '=== 估值比较 ===') : [];
  const peerDupont = peer.data ? tsv(peer.data, '=== 杜邦分析比较 ===') : [];
  const myGrowth = peerGrowth.find(r => r['简称']?.includes(stockName) || r['代码'] === symbol);
  const myVal    = peerValuation.find(r => r['简称']?.includes(stockName) || r['代码'] === symbol);
  const myDupont = peerDupont.find(r => r['简称']?.includes(stockName) || r['代码'] === symbol);

  /* ── 雷达图（同业） ── */
  const radarOpt = (peerDupont.length > 3 && myDupont) ? (() => {
    const indicator = [
      {name:'ROE', max:50},{name:'净利率%', max:60},{name:'总资产周转率%', max:100},{name:'营收增长率%', max:30},{name:'毛利率%', max:100},
    ];
    const myVals = [
      parseFloat(myDupont['ROE-24A']||0), parseFloat(myDupont['净利率-24A']||0),
      parseFloat(myDupont['总资产周转率-24A']||0), parseFloat(f('主营业务收入增长率(%)')||0),
      parseFloat(f('销售毛利率(%)')||0),
    ];
    return {
      tooltip:{trigger:'item'},
      legend:{data:[stockName,'同业均值'],textStyle:{color:'#B0A898'},bottom:0},
      radar:{indicator,radius:'60%',axisName:{color:'#B0A898'},splitArea:{areaStyle:{color:['rgba(212,168,83,0.02)','rgba(212,168,83,0.04)']}}},
      series:[{
        type:'radar',
        data:[
          {name:stockName,value:myVals,lineStyle:{color:MONET[0]},areaStyle:{opacity:0.1}},
          {name:'行业均值',value:indicator.map(()=>30),lineStyle:{color:MONET[3]},areaStyle:{opacity:0.05}},
        ],
      }],
    };
  })() : null;

  /* ── 资金流柱状图 ── */
  const fundBarOpt = fundRows.length > 0 ? (() => {
    const dates = fundRows.map(r=>r['日期']?.slice(5)||'').slice(-20);
    const vals = fundRows.map(r=>parseFloat(r['主力净流入-净额']||0)/1e8).slice(-20);
    return {
      title:{text:'主力净流入(亿元)',textStyle:{color:'#B0A898',fontSize:12},left:'center'},
      grid:{left:'6%',right:'4%',bottom:'18%',top:'22%'},
      xAxis:{type:'category',data:dates,axisLabel:{color:'#B0A898',fontSize:9,rotate:30}},
      yAxis:{type:'value',axisLabel:{color:'#B0A898',fontSize:10},splitLine:{lineStyle:{color:'rgba(212,168,83,0.08)'}}},
      series:[{type:'bar',data:vals.map(v=>({value:v,itemStyle:{color:v>=0?MONET[3]:MONET[4]}}))}],
    };
  })() : null;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* ── 搜索框 ── */}
      <div className="search-box" style={{display:'flex',gap:12,maxWidth:520}}>
        <input value={keyword} onChange={e=>setKeyword(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&doSearch()}
          placeholder="股票代码/名称"
          style={{flex:1,padding:'8px 14px',borderRadius:12,border:'1px solid var(--border-subtle)',background:'var(--bg-panel)',color:'var(--text-primary)',fontSize:14}}/>
        <button onClick={doSearch} style={{padding:'8px 22px',borderRadius:20,background:'var(--accent-gold)',color:'#000',border:'none',cursor:'pointer',fontWeight:600,fontSize:14}}>🔍 查询</button>
      </div>

      {/* ── 顶部股票徽章 ── */}
      <div className="stock-badge" style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
        <span className="stock-name" style={{fontSize:22,fontWeight:700}}>{stockName}</span>
        <span className="stock-code" style={{fontSize:13,color:'var(--text-muted)'}}>{symbol}.SH</span>
        <span className="stock-price" style={{fontSize:20,fontWeight:700,color:'var(--accent-gold)'}}>{f('加权每股收益(元)') ? `EPS ${f('加权每股收益(元)')}` : ''}</span>
      </div>

      {/* ── K线 ── */}
      <Block title="📊 K线走势" loading={hist.isLoading && !hist.data}>
        {klineOpt ? <ReactECharts option={klineOpt} style={{height:360,width:'100%'}} theme="dark" notMerge />
          : !hist.isLoading ? <div style={{textAlign:'center',color:'var(--text-muted)',padding:40}}>数据暂不可用</div> : null}
      </Block>

      {/* ── 三列财务卡 ── */}
      <div className="f5d" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        <div className="f5" style={{background:'transparent',border:'1px solid var(--border-subtle)',borderRadius:'var(--radius-lg)',padding:20}}>
          <div className="h" style={{fontSize:13,fontWeight:600,marginBottom:12,color:'var(--text-secondary)'}}>📊 财务指标</div>
          <ul className="items" style={{listStyle:'none',padding:0}}>
            <Item label="营收增长率" value={`${f('主营业务收入增长率(%)')}%`} color={+f('主营业务收入增长率(%)')>=0?MONET[3]:MONET[4]} />
            <Item label="净利润增长率" value={`${f('净利润增长率(%)')}%`} color={+f('净利润增长率(%)')>=0?MONET[3]:MONET[4]} />
            <Item label="ROE" value={`${f('净资产收益率(%)')}%`} color={+f('净资产收益率(%)')>=10?MONET[3]:MONET[5]} />
            <Item label="毛利率" value={`${f('销售毛利率(%)')}%`} />
            <Item label="净利率" value={`${f('销售净利率(%)')}%`} />
          </ul>
        </div>
        <div className="f5" style={{background:'transparent',border:'1px solid var(--border-subtle)',borderRadius:'var(--radius-lg)',padding:20}}>
          <div className="h" style={{fontSize:13,fontWeight:600,marginBottom:12,color:'var(--text-secondary)'}}>💰 估值</div>
          <ul className="items" style={{listStyle:'none',padding:0}}>
            <Item label="每股收益" value={`${f('摊薄每股收益(元)')}元`} />
            <Item label="每股净资产" value={`${f('每股净资产_调整前(元)')}元`} />
            <Item label="每股现金流" value={`${f('每股经营性现金流(元)')}元`} />
            <Item label="PE(PEG)" value={myVal?.['市盈率-TTM']||'—'} />
            <Item label="PB" value={myVal?.['市净率-MRQ']||'—'} />
          </ul>
        </div>
        <div className="f5" style={{background:'transparent',border:'1px solid var(--border-subtle)',borderRadius:'var(--radius-lg)',padding:20}}>
          <div className="h" style={{fontSize:13,fontWeight:600,marginBottom:12,color:'var(--text-secondary)'}}>🏆 质量</div>
          <ul className="items" style={{listStyle:'none',padding:0}}>
            <Item label="杜邦ROE(24A)" value={`${myDupont?.['ROE-24A']||f('净资产收益率(%)')}%`} />
            <Item label="资产负债率" value={`${f('资产负债率(%)')}%`} color={+f('资产负债率(%)')<50?MONET[4]:MONET[3]} />
            <Item label="总资产周转率" value={myDupont?.['总资产周转率-24A']||'—'} />
            <Item label="营收排名" value={myGrowth?.['营业收入增长率-3年复合排名']||'—'} />
            <Item label="ROE排名" value={myDupont?.['ROE-3年平均排名']||'—'} />
          </ul>
        </div>
      </div>

      {/* ── 同业雷达 + 资金流 ── */}
      <div className="cg2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <Block title="📡 同业雷达" loading={peer.isLoading}>
          {radarOpt ? <ReactECharts option={radarOpt} style={{height:300,width:'100%'}} theme="dark" notMerge />
            : <div style={{textAlign:'center',color:'var(--text-muted)',padding:40}}>同业数据不足</div>}
        </Block>
        <Block title="💰 主力资金流向" loading={fund.isLoading}>
          {fundBarOpt ? <ReactECharts option={fundBarOpt} style={{height:300,width:'100%'}} theme="dark" notMerge />
            : <div style={{textAlign:'center',color:'var(--text-muted)',padding:40}}>无资金流数据</div>}
        </Block>
      </div>

      {/* ── 同业对比表 ── */}
      {peerValuation.length > 3 && (
        <Block title="🏭 同业估值对比" wide>
          <div style={{overflowX:'auto',fontSize:12}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{borderBottom:'1px solid var(--border-subtle)',color:'var(--text-muted)'}}>
                  <th style={{padding:'8px 12px',textAlign:'left',fontWeight:600}}>股票</th>
                  <th style={{padding:'8px 12px',textAlign:'right',fontWeight:600}}>PE-TTM</th>
                  <th style={{padding:'8px 12px',textAlign:'right',fontWeight:600}}>PB</th>
                  <th style={{padding:'8px 12px',textAlign:'right',fontWeight:600}}>PE-25E</th>
                  <th style={{padding:'8px 12px',textAlign:'right',fontWeight:600}}>PS-TTM</th>
                  <th style={{padding:'8px 12px',textAlign:'right',fontWeight:600}}>PEG</th>
                </tr>
              </thead>
              <tbody>
                {peerValuation.slice(0,7).map((r,i)=>(
                  <tr key={i} style={{borderBottom:'1px solid rgba(212,168,83,0.06)'}}>
                    <td style={{padding:'8px 12px',color:r['简称']===stockName?'var(--accent-gold)':'var(--text-primary)',fontWeight:r['简称']===stockName?600:400}}>{r['简称']||r['代码']}</td>
                    <td style={{padding:'8px 12px',textAlign:'right',color:'var(--text-secondary)'}}>{r['市盈率-TTM']}</td>
                    <td style={{padding:'8px 12px',textAlign:'right',color:'var(--text-secondary)'}}>{r['市净率-MRQ']}</td>
                    <td style={{padding:'8px 12px',textAlign:'right',color:'var(--text-secondary)'}}>{r['市盈率-25E']||'—'}</td>
                    <td style={{padding:'8px 12px',textAlign:'right',color:'var(--text-secondary)'}}>{r['市销率-TTM']||'—'}</td>
                    <td style={{padding:'8px 12px',textAlign:'right',color:'var(--text-secondary)'}}>{r['PEG']||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Block>
      )}
    </div>
  );
}
