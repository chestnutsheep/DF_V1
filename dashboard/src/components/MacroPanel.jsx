import { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import { mcp } from '../services/mcp'

const MONET = ['#b58f4d','#6f658f','#0586a1','#8e6487','#3fb950','#db6d28','#7b5ea7','#c49ba5']

function useMCP(fn) {
  const [data, setData] = useState(null);
  useEffect(() => { fn().then(setData).catch(() => setData(null)); }, []);
  return data;
}

const CHART_OPT = {
  backgroundColor:'transparent', tooltip:{trigger:'axis',theme:'dark'},
  grid:{left:'8%',right:'5%',bottom:'20%',top:'16%'},
  xAxis:{type:'category',axisLabel:{color:'#B0A898',fontSize:10,rotate:30}},
  yAxis:{type:'value',axisLabel:{color:'#B0A898',fontSize:10},splitLine:{lineStyle:{color:'rgba(212,168,83,0.08)'}}},
}

export default function MacroPanel() {
  const kd = useMCP(() => mcp.call('data_kitchin'))
  const jd = useMCP(() => mcp.call('data_juglar'))
  const kzd = useMCP(() => mcp.call('data_kuznets'))
  const kvd = useMCP(() => mcp.call('data_kondratiev',{method:'pca'}))
  const kvt = useMCP(() => mcp.call('kondratiev_cycle'))

  // 相位卡
  const cards = [];
  try { const a = JSON.parse(kd||'[]'); if (a.length) { const l = a[a.length-1]; cards.push({label:'基钦',val:l.stage_name||'?',color:MONET[3],desc:`库存${l.inventory_yoy}% · 需求${l.demand_yoy}%`}); } } catch(e) {}
  try { const a = JSON.parse(jd||'[]'); if (a.length) { const l = a[a.length-1]; cards.push({label:'朱格拉',val:l.phase_name||'?',color:MONET[2],desc:`投资z ${l.comp_z?.toFixed(2)||'?'}`}); } } catch(e) {}
  try { const a = JSON.parse(kzd||'[]'); if (a.length) { const l = a[a.length-1]; cards.push({label:'库兹涅茨',val:l.phase_name||'?',color:MONET[1],desc:`房价${l.house_price_yoy?.toFixed(1)||'?'}%`}); } } catch(e) {}
  if (kvt) { const m=kvt.match(/当前相位:\s*(\d+)\s*[—\-]\s*(\S+)/); if (m) cards.push({label:'康波',val:m[2],color:MONET[0],desc:`相位${m[1]}`}) }

  // 基钦 — 双Y轴
  const kc = kd ? (() => {
    try {
      const a = JSON.parse(kd);
      if (!a || !a.length) return null;
      const d = a.slice(-120);
      const x = d.map(r => (r.period||'').slice(0,7));
      return {
        title:{text:'基钦 · 库存(左) vs 需求(右)',textStyle:{color:'#d7cfb0',fontSize:12},left:'center'},
        legend:{data:['库存','需求'],textStyle:{color:'#d1c2ae',fontSize:10},top:0},
        grid:{...CHART_OPT.grid,top:'22%'},
        xAxis:{...CHART_OPT.xAxis,data:x},
        yAxis:[
          {type:'value',axisLabel:{color:MONET[3],fontSize:9},splitLine:{show:false}},
          {type:'value',axisLabel:{color:MONET[0],fontSize:9},splitLine:{show:false}},
        ],
        series:[
          {name:'库存',type:'line',data:d.map(r=>r.inventory_yoy),yAxisIndex:0,smooth:true,symbol:'none',lineStyle:{color:MONET[3],width:1.5}},
          {name:'需求',type:'line',data:d.map(r=>r.demand_yoy),yAxisIndex:1,smooth:true,symbol:'none',lineStyle:{color:MONET[0],width:1.5}},
        ],
      };
    } catch(e) { return null; }
  })() : null

  // 朱格拉
  const jc = jd ? (() => {
    try {
      const a = JSON.parse(jd);
      if (!a || !a.length) return null;
      const d = a.slice(-120);
      return {title:{text:'朱格拉 · 投资z值',textStyle:{color:'#d7cfb0',fontSize:12},left:'center'},grid:{...CHART_OPT.grid,top:'22%'},xAxis:{...CHART_OPT.xAxis,data:d.map(r=>(r.period||'').slice(0,7))},series:[{type:'line',data:d.map(r=>r.comp_z),smooth:true,symbol:'none',lineStyle:{color:MONET[2],width:1.5}}]};
    } catch(e) { return null; }
  })() : null

  // 库兹涅茨
  const kzc = kzd ? (() => {
    try {
      const a = JSON.parse(kzd);
      if (!a || !a.length) return null;
      const d = a.slice(-120);
      return {title:{text:'库兹涅茨 · 房价同比',textStyle:{color:'#d1c2ae',fontSize:12},left:'center'},grid:{...CHART_OPT.grid,top:'22%'},xAxis:{...CHART_OPT.xAxis,data:d.map(r=>(r.period||'').slice(0,7))},series:[{type:'line',data:d.map(r=>r.house_price_yoy),smooth:true,symbol:'none',lineStyle:{color:MONET[1],width:1.5}}]};
    } catch(e) { return null; }
  })() : null

  // 康波
  const kvc = kvd ? (() => {
    try {
      const j = JSON.parse(kvd);
      if (!j.pca1) return null;
      const s = Math.max(1, Math.floor(j.pca1.length / 120));
      return {title:{text:'康波 · PCA合成',textStyle:{color:'#d7cfb0',fontSize:12},left:'center'},grid:{...CHART_OPT.grid,top:'22%'},xAxis:{...CHART_OPT.xAxis,data:j.years.filter((_,i)=>i%s===0)},series:[{type:'line',data:j.pca1.filter((_,i)=>i%s===0),smooth:true,symbol:'none',lineStyle:{color:MONET[0],width:2}}]};
    } catch(e) { return null; }
  })() : null

  const charts = [
    {opt:kc,key:'kitchin'},{opt:jc,key:'juglar'},{opt:kzc,key:'kuznets'},{opt:kvc,key:'kondratiev'},
  ]

  return (
    <div className="macro-panel" style={{padding:'28px 0 28px 32px',maxWidth:'calc(100% - 320px)'}}>
      <h2 style={{fontSize:22,fontWeight:700,marginBottom:4}}>📈 宏观经济</h2>
      <p style={{color:'var(--text-secondary)',fontSize:13,marginBottom:24}}>基钦 · 朱格拉 · 库兹涅茨 · 康波</p>

      {/* 相位卡 — 在图表上方 */}
      {cards.length>0 && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:20}}>
          {cards.map((c,i)=>(
            <div key={i} style={{background:'rgba(0,0,0,0.25)',borderRadius:'var(--radius)',padding:'18px 22px',border:'1px solid var(--border-subtle)'}}>
              <div style={{fontSize:13,fontWeight:600,color:'var(--text-secondary)',letterSpacing:1,marginBottom:6}}>{c.label}</div>
              <div style={{fontSize:22,fontWeight:800,color:c.color,marginBottom:6}}>{c.val}</div>
              <div style={{fontSize:14,fontWeight:500,color:'var(--text-primary)'}}>{c.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* 2×2 图表 */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {charts.map(({opt,key}) => (
          <div key={key} style={{background:'var(--bg-panel)',backdropFilter:'blur(12px)',border:'1px solid var(--border-subtle)',borderRadius:'var(--radius-lg)',padding:16}}>
            {opt ? <ReactECharts option={{...CHART_OPT,...opt}} style={{height:220,width:'100%'}} theme="dark" notMerge />
              : <div style={{height:220,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-muted)',fontSize:12}}>加载中...</div>}
          </div>
        ))}
      </div>

      {/* 四相位综合 → 投资组合建议（占位） */}
      <div style={{marginTop:24,background:'var(--bg-panel)',backdropFilter:'blur(12px)',border:'1px solid var(--border-subtle)',borderRadius:'var(--radius-lg)',padding:'24px 28px',minHeight:160,display:'flex',flexDirection:'column',justifyContent:'center'}}>
        <h3 style={{fontSize:15,fontWeight:600,marginBottom:8,color:'var(--text-secondary)'}}>📊 相位综合 → 投资组合建议</h3>
        <p style={{fontSize:13,color:'var(--text-muted)'}}>根据基钦({cards[0]?.val||'?'}) / 朱格拉({cards[1]?.val||'?'}) / 库兹涅茨({cards[2]?.val||'?'}) / 康波({cards[3]?.val||'?'}) 四周期相位，综合输出资产配比建议。</p>
        <div style={{marginTop:12,display:'flex',gap:12}}>
          {['权益','债券','商品','现金'].map((a,i)=>(
            <div key={a} style={{flex:1,padding:'12px 16px',background:'rgba(0,0,0,0.2)',borderRadius:'var(--radius-sm)',textAlign:'center'}}>
              <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:4}}>{a}</div>
              <div style={{fontSize:18,fontWeight:700,color:'var(--text-secondary)'}}>--%</div>
            </div>
          ))}
        </div>
        <p style={{fontSize:11,color:'var(--text-muted)',marginTop:8}}>🚧 待接入四周期综合评分模型</p>
      </div>
    </div>
  )
}
