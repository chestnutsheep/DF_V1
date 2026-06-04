import { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import { mcp } from '../services/mcp'

const MONET = ['#b58f4d','#6f658f','#0586a1','#8e6487','#3fb950','#db6d28','#7b5ea7','#c49ba5']

function useMCP(fn, deps = []) {
  const [data, setData] = useState(null)
  useEffect(() => { fn().then(setData).catch(() => setData(null)) }, deps)
  return data
}

const BASE = {
  backgroundColor:'transparent', tooltip:{trigger:'axis',theme:'dark'},
  grid:{left:'8%',right:'5%',bottom:'20%',top:'16%'},
  xAxis:{type:'category',axisLabel:{color:'#B0A898',fontSize:10,rotate:30}},
  yAxis:{type:'value',axisLabel:{color:'#B0A898',fontSize:10},splitLine:{lineStyle:{color:'rgba(212,168,83,0.08)'}}},
}

export default function MesoPanel() {
  const bank=useMCP(()=>mcp.industry.daily('银行',120))
  const steel=useMCP(()=>mcp.industry.daily('钢铁',120))
  const estate=useMCP(()=>mcp.industry.daily('房地产开发',120))
  const wine=useMCP(()=>mcp.industry.daily('白酒',120))

  function line(csv,title,color) {
    if(!csv) return null
    const l=csv.trim().split('\n'); if(l.length<2) return null
    const d=[],p=[]
    l.slice(1).reverse().forEach(r=>{const s=r.split(',');if(s.length>=3){d.push(s[1].slice(5));p.push(parseFloat(s[3]))}})
    return {...BASE,title:{text:title,textStyle:{color:'#D4A853',fontSize:12},left:'center'},grid:{...BASE.grid,top:'22%'},xAxis:{...BASE.xAxis,data:d},series:[{type:'line',data:p,smooth:true,symbol:'none',lineStyle:{color,width:1.5}}]}
  }

  return <div style={{padding:'28px 0 28px 32px',maxWidth:'calc(100% - 320px)'}}>
    <h2 style={{fontSize:22,fontWeight:700,marginBottom:4}}>🏭 中观行业</h2>
    <p style={{color:'var(--text-secondary)',fontSize:13,marginBottom:24}}>90 行业 · 日行情 · 同花顺</p>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      {[bank,steel,estate,wine].map((d,i) => {
        const names=['银行','钢铁','房地产','白酒']
        const ls=d?line(d,names[i],MONET[i]):null
        return <div key={i} style={{background:'var(--bg-panel)',backdropFilter:'blur(12px)',border:'1px solid var(--border-subtle)',borderRadius:'var(--radius-lg)',padding:16}}>
          {ls ? <ReactECharts option={ls} style={{height:220,width:'100%'}} theme="dark" notMerge />
            : <div style={{height:220,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-muted)',fontSize:12}}>{names[i]} 加载中...</div>}
        </div>
      })}
    </div>
  </div>
}
