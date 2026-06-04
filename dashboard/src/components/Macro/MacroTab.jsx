import ReactECharts from 'echarts-for-react';
import { useMCP } from '../../hooks/useMCP';

const MONET = ['#d2991d','#a371f7','#58a6ff','#f85149','#3fb950','#db6d28','#7b5ea7','#c49ba5'];

const BASE = {
  backgroundColor:'transparent', tooltip:{trigger:'axis',theme:'dark'},
  grid:{left:'8%',right:'5%',bottom:'20%',top:'22%'},
  xAxis:{type:'category',axisLabel:{color:'#B0A898',fontSize:10,rotate:30}},
  yAxis:{type:'value',axisLabel:{color:'#B0A898',fontSize:10},splitLine:{lineStyle:{color:'rgba(212,168,83,0.08)'}}},
};

function Chart({opt,height=220}) {
  return opt ? <ReactECharts option={{...BASE,...opt}} style={{height,width:'100%'}} theme="dark" notMerge />
    : <div style={{height,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-muted)',fontSize:12}}>加载中...</div>;
}

export default function MacroTab() {
  const { data: kd } = useMCP('data_kitchin');
  const { data: jd } = useMCP('data_juglar');
  const { data: kzd } = useMCP('data_kuznets');
  const { data: kvd } = useMCP('data_kondratiev',{method:'pca'});

  const kc = kd ? (() => {
    try {
      const a = JSON.parse(kd); if (!a||!a.length) return null;
      const d = a.slice(-120), x = d.map(r=>(r.period||'').slice(0,7));
      return {title:{text:'基钦 · 库存(左) vs 需求(右)',textStyle:{color:'#B0A898',fontSize:12},left:'center'},
        legend:{data:['库存','需求'],textStyle:{color:'#B0A898',fontSize:10},top:0},
        grid:{...BASE.grid,top:'22%'},xAxis:{...BASE.xAxis,data:x},
        yAxis:[{type:'value',axisLabel:{color:MONET[3],fontSize:9},splitLine:{show:false}},{type:'value',axisLabel:{color:MONET[0],fontSize:9},splitLine:{show:false}}],
        series:[{name:'库存',type:'line',data:d.map(r=>r.inventory_yoy),yAxisIndex:0,smooth:true,symbol:'none',lineStyle:{color:MONET[3],width:1.5}},
                {name:'需求',type:'line',data:d.map(r=>r.demand_yoy),yAxisIndex:1,smooth:true,symbol:'none',lineStyle:{color:MONET[0],width:1.5}}]};
    } catch(e){return null}
  })() : null;

  const jc = jd ? (() => {
    try {
      const a = JSON.parse(jd); if (!a||!a.length) return null;
      const d = a.slice(-120);
      return {title:{text:'朱格拉 · 投资z值',textStyle:{color:'#B0A898',fontSize:12},left:'center'},
        grid:{...BASE.grid,top:'22%'},xAxis:{...BASE.xAxis,data:d.map(r=>(r.period||'').slice(0,7))},
        series:[{type:'line',data:d.map(r=>r.comp_z),smooth:true,symbol:'none',lineStyle:{color:MONET[2],width:1.5}}]};
    } catch(e){return null}
  })() : null;

  const kzc = kzd ? (() => {
    try {
      const a = JSON.parse(kzd); if (!a||!a.length) return null;
      const d = a.slice(-120);
      return {title:{text:'库兹涅茨 · 房价同比',textStyle:{color:'#B0A898',fontSize:12},left:'center'},
        grid:{...BASE.grid,top:'22%'},xAxis:{...BASE.xAxis,data:d.map(r=>(r.period||'').slice(0,7))},
        series:[{type:'line',data:d.map(r=>r.house_price_yoy),smooth:true,symbol:'none',lineStyle:{color:MONET[1],width:1.5}}]};
    } catch(e){return null}
  })() : null;

  const kvc = kvd ? (() => {
    try {
      const j = JSON.parse(kvd); if (!j.pca1) return null;
      const s = Math.max(1,Math.floor(j.pca1.length/120));
      return {title:{text:'康波 · PCA合成',textStyle:{color:'#B0A898',fontSize:12},left:'center'},
        grid:{...BASE.grid,top:'22%'},xAxis:{...BASE.xAxis,data:j.years.filter((_,i)=>i%s===0)},
        series:[{type:'line',data:j.pca1.filter((_,i)=>i%s===0),smooth:true,symbol:'none',lineStyle:{color:MONET[0],width:2}}]};
    } catch(e){return null}
  })() : null;

  return (
    <div style={{padding:'28px 32px',maxWidth:'calc(100% - 320px)'}}>
      <h2 style={{fontSize:22,fontWeight:700,marginBottom:4}}>🌐 宏观经济</h2>
      <p style={{color:'var(--text-secondary)',fontSize:13,marginBottom:24}}>基钦 · 朱格拉 · 库兹涅茨 · 康波</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {[kc, jc, kzc, kvc].map((opt, i) => (
          <div key={i} style={{background:'var(--bg-panel)',border:'1px solid var(--border-subtle)',borderRadius:'var(--radius-lg)',padding:16}}>
            <Chart opt={opt} />
          </div>
        ))}
      </div>
    </div>
  );
}
