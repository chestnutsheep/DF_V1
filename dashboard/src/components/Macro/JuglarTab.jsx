import { useRef, useEffect } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, DataZoomComponent, LegendComponent, MarkAreaComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useQueryMCPJSON } from '../../hooks/useQueryMCP';
import GaugePanel from '../charts/GaugePanel';

echarts.use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, LegendComponent, MarkAreaComponent, CanvasRenderer]);

const STAGE_COLORS = ['#D48A8A', '#6AD07A', '#D4A853', '#7B5E7B'];

function renderChart(div, rows) {
  if (!rows?.length) return;
  const periods = rows.map(r => r.period);
  const compZ = rows.map(r => r.comp_z);
  const fixInv = rows.map(r => r.fix_inv_yoy);

  // 阶段着色 markArea
  const markAreas = [];
  let cur = -1, start = -1;
  for (let i = 0; i <= rows.length; i++) {
    const s = i < rows.length ? (rows[i].phase || rows[i].stage || 0) : -1;
    if (s !== cur) {
      if (cur > 0 && start >= 0)
        markAreas.push([{ xAxis: start, itemStyle: { color: STAGE_COLORS[cur - 1], opacity: 0.08 } }, { xAxis: i - 1 }]);
      cur = s; start = i;
    }
  }

  const opt = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', confine: true,
      backgroundColor: 'rgba(26,47,42,0.92)',
      borderColor: '#B0A898',
      textStyle: { color: '#E8E0D0', fontSize: 11 },
      formatter: (p) => {
        const i = p[0].dataIndex;
        return `<b style="color:#D4A853">${periods[i]}</b><br/>`
          + (compZ[i] != null ? `投资z值: <b>${compZ[i].toFixed(3)}</b><br/>` : '')
          + (fixInv[i] != null ? `固投: <b>${fixInv[i]}%</b>` : '');
      },
    },
    legend: {
      data: ['综合z值', '固投同比%'],
      bottom: 0,
      textStyle: { color: '#B0A898', fontSize: 10 },
    },
    grid: { left: '3%', right: '3%', bottom: '16%', top: '3%', containLabel: true },
    xAxis: {
      type: 'category', data: periods,
      axisLabel: { color: '#A09888', fontSize: 7, interval: Math.max(1, Math.floor(periods.length / 15)) },
      axisLine: { lineStyle: { color: 'rgba(212,168,83,0.12)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#A09888', fontSize: 8 },
      splitLine: { lineStyle: { color: 'rgba(212,168,83,0.08)', type: 'dashed' } },
    },
    dataZoom: [{ type: 'inside', start: 0, end: 100 }],
    series: [
      {
        name: '综合z值', type: 'line', data: compZ, smooth: true, symbol: 'diamond', symbolSize: 2,
        lineStyle: { width: 1.5, color: '#58a6ff' },
        markArea: { data: markAreas },
      },
      {
        name: '固投同比%', type: 'line', data: fixInv, smooth: true, symbol: 'circle', symbolSize: 2,
        lineStyle: { width: 1.5, color: '#D4A853' },
      },
    ],
  };

  let c = echarts.getInstanceByDom(div);
  if (!c) c = echarts.init(div);
  c.setOption(opt, true);
  const rs = () => c?.resize();
  window.addEventListener('resize', rs);
  return () => window.removeEventListener('resize', rs);
}

export default function JuglarTab() {
  const ref = useRef(null);
  const { data, isLoading } = useQueryMCPJSON('data_juglar');
  const rows = Array.isArray(data) ? data : [];
  const latest = rows[rows.length - 1] || null;
  const stageIdx = latest ? Math.max(0, (latest.phase || 1) - 1) : 0;

  useEffect(() => {
    if (!ref.current || !rows.length) return;
    return renderChart(ref.current, rows);
  }, [data]);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>朱格拉周期</h2>
        {latest ? (
          <>
            <span style={{ background: STAGE_COLORS[stageIdx], padding: '2px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: '#F0E8D8' }}>
              {latest.phase_name || '未知'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              comp_z {latest.comp_z?.toFixed(3) ?? '--'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>截至 {latest.period}</span>
          </>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{isLoading ? '加载中...' : '暂无数据'}</span>
        )}
      </div>

      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 8, marginBottom: 16 }}>
        {rows.length > 0
          ? <div ref={ref} style={{ width: '100%', height: 380 }} />
          : <div style={{ width: '100%', height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              {isLoading ? '加载中...' : '暂无数据'}
            </div>}
      </div>

      {/* 仪表盘 + 指标卡 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 8 }}>
          <GaugePanel data={[{
            name: '综合z值',
            value: latest?.comp_z ?? 0,
            max: 3,
            color: latest?.comp_z > 0 ? '#3fb950' : '#f85149',
          }]} height={180} />
        </div>
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>固定投资%</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-gold)' }}>{latest?.fix_inv_yoy ?? '-'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>同比</div>
        </div>
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>产能利用率</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-gold)' }}>{latest?.capacity_util ?? '-'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>{latest?.manufacturing_yoy ? `制造业 ${latest.manufacturing_yoy}%` : '—'}</div>
        </div>
      </div>
    </div>
  );
}
