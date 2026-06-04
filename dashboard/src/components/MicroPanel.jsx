import { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import { mcp } from '../services/mcp'

const MONET = ['#d2991d','#a371f7','#58a6ff','#f85149','#3fb950','#db6d28','#7b5ea7','#c49ba5']

export default function MicroPanel() {
  const [keyword,setKeyword] = useState('贵州茅台')
  const [code,setCode] = useState('600519')
  const [name,setName] = useState('贵州茅台')
  const [hist,setHist] = useState(null)
  const [fin,setFin] = useState(null)
  const [info,setInfo] = useState(null)
  const [loading,setLoading] = useState(false)

  async function search() {
    setLoading(true)
    try {
      const r = await mcp.call('search',{keyword,market:'sh'})
      const lines = r.trim().split('\n')
      let c=code, n=keyword
      lines.forEach(l => {
        if (l.startsWith('code')) c = l.split(/\s+/)[1] || c
        if (l.startsWith('name')) n = l.split(/\s+/)[1] || n
      })
      setCode(c); setName(n)
      await loadAll(c)
    } catch(e) {console.error(e)}
    setLoading(false)
  }

  async function loadAll(c) {
    try {
      const [h, f, i] = await Promise.all([
        mcp.call('individual_hist',{symbol:c,period:'daily'}),
        mcp.call('financial_indicators',{symbol:c}),
        mcp.call('individual_info',{symbol:c}),
      ])
      setHist(h); setFin(f); setInfo(i)
    } catch(e) {console.error(e)}
  }

  useEffect(() => { loadAll(code) }, [])

  // K线图
  const klineOpt = hist ? (() => {
    const m = hist.match(/=== K线数据 ===\n([\s\S]+?)\n\n/)
    if (!m) return null
    const lines = m[1].trim().split('\n')
    if (lines.length < 2) return null
    const headers = lines[0].split(',')
    const di=headers.indexOf('日期'), oi=headers.indexOf('开盘'), ci=headers.indexOf('收盘')
    const hi=headers.indexOf('最高'), li=headers.indexOf('最低'), vi=headers.indexOf('成交量')
    const dates=[], ohlc=[], vol=[]
    lines.slice(1).reverse().forEach(l => {
      const p = l.split(',')
      if (p.length > 6) {
        dates.push(p[di]?.slice(5)||'')
        ohlc.push([+p[oi], +p[ci], +p[li], +p[hi]])
        vol.push(+p[vi])
      }
    })
    if (!dates.length) return null
    return {
      tooltip:{trigger:'axis',axisPointer:{type:'cross'}},
      legend:{data:['K线','成交量'],textStyle:{color:'#B0A898'},top:0},
      grid:[{left:'6%',right:'3%',bottom:'25%',height:'55%'},{left:'6%',right:'3%',top:'78%',height:'18%'}],
      xAxis:[{type:'category',data:dates,axisLabel:{color:'#B0A898',fontSize:9,rotate:30},gridIndex:0},
             {type:'category',data:dates,axisLabel:{show:false},gridIndex:1}],
      yAxis:[{type:'value',scale:true,axisLabel:{color:'#B0A898',fontSize:10},splitLine:{lineStyle:{color:'rgba(212,168,83,0.08)'}},gridIndex:0},
             {type:'value',scale:true,axisLabel:{color:'#B0A898',fontSize:10},gridIndex:1}],
      series:[
        {name:'K线',type:'candlestick',data:ohlc,itemStyle:{color:MONET[3],color0:MONET[4],borderColor:MONET[3],borderColor0:MONET[4]}},
        {name:'成交量',type:'bar',data:vol,xAxisIndex:1,yAxisIndex:1,itemStyle:{color:MONET[0]+'60'}},
      ]
    }
  })() : null

  // 财务趋势
  const finOpt = fin ? (() => {
    const lines = fin.trim().split('\n'); if (lines.length<2) return null
    const h=lines[0].split(','); const ri=h.indexOf('主营业务收入增长率(%)'), pi=h.indexOf('净利润增长率(%)'), roei=h.indexOf('净资产收益率(%)')
    const d=[], rv=[], pf=[], ro=[]
    lines.slice(1).forEach(l => {
      const p=l.split(','); if (p.length>10) {
        const dt=p[0]?.trim(); if (dt && dt.length===10) { d.push(dt.slice(0,7)); rv.push(parseFloat(p[ri])||null); pf.push(parseFloat(p[pi])||null); ro.push(parseFloat(p[roei])||null) }
      }
    })
    if (!d.length) return null
    return {
      legend:{data:['营收增长率','净利润增长率','ROE'],textStyle:{color:'#B0A898'},top:0},
      grid:{left:'8%',right:'5%',bottom:'18%',top:'22%'},
      xAxis:{type:'category',data:d,axisLabel:{color:'#B0A898',fontSize:10,rotate:30}},
      yAxis:{type:'value',axisLabel:{color:'#B0A898',fontSize:10},splitLine:{lineStyle:{color:'rgba(212,168,83,0.08)'}}},
      series:[
        {name:'营收增长率',type:'line',data:rv,smooth:true,symbol:'none',lineStyle:{color:MONET[0],width:2},areaStyle:{color:MONET[0]+'15'}},
        {name:'净利润增长率',type:'line',data:pf,smooth:true,symbol:'none',lineStyle:{color:MONET[3],width:2},areaStyle:{color:MONET[3]+'15'}},
        {name:'ROE',type:'line',data:ro,smooth:true,symbol:'none',lineStyle:{color:MONET[4],width:2},areaStyle:{color:MONET[4]+'15'}},
      ]
    }
  })() : null

  // 股东
  const shareRows = info ? (() => {
    const m = info.match(/编号,股东名称[^]+?(?=\n\n)/)
    if (!m) return []
    return m[0].trim().split('\n').slice(1).filter(l=>l.trim()).map(l => {const p=l.split(','); return {name:p[1]||'',ratio:p[3]||'',shares:p[2]||''}}).slice(0,5)
  })() : []

  return <div style={{padding:'28px 32px'}}>
    <h2 style={{fontSize:22,fontWeight:700,marginBottom:4}}>📊 微观个股</h2>
    <p style={{color:'var(--text-secondary)',fontSize:13,marginBottom:24}}>个股行情·财务·资金流·同业比较</p>
    <div style={{display:'flex',gap:12,marginBottom:20}}>
      <input value={keyword} onChange={e=>setKeyword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()}
        placeholder="输入股票名称/代码"
        style={{flex:1,padding:'10px 16px',borderRadius:'var(--radius-sm)',border:'1px solid var(--border-subtle)',background:'var(--bg-panel)',color:'var(--text-primary)',fontSize:14,outline:'none'}} />
      <button onClick={search} disabled={loading}
        style={{padding:'10px 24px',borderRadius:'var(--radius-sm)',border:'1px solid var(--border-subtle)',background:'rgba(212,168,83,0.12)',color:'var(--accent-gold)',cursor:'pointer',fontSize:13}}>{loading?'...':'🔍'}</button>
    </div>
    <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20,padding:'12px 20px',background:'rgba(0,0,0,0.2)',borderRadius:'var(--radius)',border:'1px solid var(--border-subtle)'}}>
      <span style={{fontSize:18,fontWeight:700}}>{name}</span>
      <span style={{color:'var(--text-muted)',fontSize:12}}>{code}.SH</span>
    </div>

    {/* K线 */}
    <div style={{background:'var(--bg-panel)',border:'1px solid var(--border-subtle)',borderRadius:'var(--radius-lg)',padding:22,marginBottom:20}}>
      <h3 style={{fontSize:15,fontWeight:600,marginBottom:12,color:'var(--accent-gold)'}}>K线走势</h3>
      {klineOpt ? <ReactECharts option={klineOpt} style={{height:360,width:'100%'}} theme="dark" notMerge /> : <div style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>加载K线...</div>}
    </div>

    {/* 财务 */}
    <div style={{background:'var(--bg-panel)',border:'1px solid var(--border-subtle)',borderRadius:'var(--radius-lg)',padding:22,marginBottom:20}}>
      <h3 style={{fontSize:15,fontWeight:600,marginBottom:12,color:'var(--accent-gold)'}}>财务趋势</h3>
      {finOpt ? <ReactECharts option={finOpt} style={{height:300,width:'100%'}} theme="dark" notMerge /> : <div style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>加载财务数据...</div>}
    </div>

    {/* 股东 */}
    {shareRows.length>0 && <div style={{background:'var(--bg-panel)',border:'1px solid var(--border-subtle)',borderRadius:'var(--radius-lg)',padding:22}}>
      <h3 style={{fontSize:15,fontWeight:600,marginBottom:12,color:'var(--accent-gold)'}}>主要股东</h3>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
        <thead><tr style={{borderBottom:'1px solid var(--border-subtle)',color:'var(--text-muted)'}}>
          <th style={{padding:'8px 12px',textAlign:'left'}}>股东名称</th>
          <th style={{padding:'8px 12px',textAlign:'right'}}>持股比例</th>
          <th style={{padding:'8px 12px',textAlign:'right'}}>持股数量</th>
        </tr></thead>
        <tbody>
          {shareRows.map((r,i) => (
            <tr key={i} style={{borderBottom:'1px solid rgba(212,168,83,0.06)'}}>
              <td style={{padding:'6px 12px',color:'var(--text-primary)'}}>{r.name}</td>
              <td style={{padding:'6px 12px',textAlign:'right',color:MONET[0]}}>{r.ratio}</td>
              <td style={{padding:'6px 12px',textAlign:'right'}}>{r.shares}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>}
  </div>
}
