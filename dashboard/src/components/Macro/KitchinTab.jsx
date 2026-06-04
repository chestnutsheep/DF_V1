import { useRef, useEffect } from 'react';
import * as echarts from 'echarts/core';
import { LineChart, CandlestickChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, DataZoomComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useQueryMCPJSON } from '../../hooks/useQueryMCP';
import DataGrid from '../charts/DataGrid';
import { KITCHIN_METRICS } from '../../configs/kitchin';

echarts.use([LineChart, CandlestickChart, BarChart, GridComponent, TooltipComponent, DataZoomComponent, LegendComponent, CanvasRenderer]);

const STAGE_COLORS = ['#D48A8A', '#6AD07A', '#D4A853', '#7B5E7B'];
const STAGE_NAMES = ['主动去库存', '被动去库存', '主动补库存', '被动补库存'];

const key = (v) => typeof document !== 'undefined'
  ? getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#D4A853'
  : '#D4A853';

function renderChart(div, rows) {
  if (!rows?.length) return;
  const periods = rows.map(r => r.period);
  const demand = rows.map(r => r.demand_yoy);
  const inventory = rows.map(r => r.inventory_yoy);

  const opt = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', confine: true,
      backgroundColor: 'rgba(26,47,42,0.92)',
      borderColor: key('--border-subtle'),
      textStyle: { color: key('--text-primary'), fontSize: 11 },
      formatter: (p) => {
        const i = p[0].dataIndex;
        return `<b style="color:${key('--accent-gold')}">${periods[i]}</b><br/>`
          + (demand[i] != null ? `需求: <b style="color:#58a6ff">${demand[i]}%</b><br/>` : '')
          + (inventory[i] != null ? `库存: <b style="color:${key('--accent-gold')}">${inventory[i]}%</b>` : '');
      },
    },
    legend: {
      data: ['需求(工业增加值%)', '库存(产成品存货%)'],
      bottom: 0,
      textStyle: { color: key('--text-secondary'), fontSize: 10 },
    },
    grid: { left: '3%', right: '3%', bottom: '16%', top: '3%', containLabel: true },
    xAxis: {
      type: 'category', data: periods,
      axisLabel: {
        color: key('--text-muted'),
        fontSize: 7,
        formatter: (v) => {
          const m = v?.substring(4,6);
          if (m === '01') return `{year|${v.substring(0,4)}}`;
          if (['04','07','10'].includes(m)) return `{qtr|Q${Math.ceil(parseInt(m)/3)}}`;
          return `{tick||}`;
        },
        rich: {
          year: { fontSize: 10, fontWeight: 700, color: key('--text-primary') },
          qtr: { fontSize: 8, color: key('--text-secondary') },
          tick: { fontSize: 7, color: key('--text-muted') },
        },
      },
      axisLine: { lineStyle: { color: key('--border-subtle') } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: key('--text-muted'), fontSize: 8 },
      splitLine: { lineStyle: { color: key('--border-subtle'), type: 'dashed' } },
    },
    dataZoom: [{ type: 'inside', start: Math.max(0, 100 - 6000 / periods.length), end: 100 }],
    series: [
      { name: '需求(工业增加值%)', type: 'line', data: demand, smooth: true, symbol: 'circle', symbolSize: 2,
        lineStyle: { width: 1.5, color: '#58a6ff' },
        areaStyle: { color: '#58a6ff', opacity: 0.05 } },
      { name: '库存(产成品存货%)', type: 'line', data: inventory, smooth: true, symbol: 'circle', symbolSize: 2,
        lineStyle: { width: 1.5, color: key('--accent-gold') } },
    ],
  };

  let c = echarts.getInstanceByDom(div);
  if (!c) c = echarts.init(div);
  c.setOption(opt, true);
  const rs = () => c?.resize();
  window.addEventListener('resize', rs);
  return () => window.removeEventListener('resize', rs);
}

export default function KitchinTab() {
  const ref = useRef(null);
  const { data, isLoading } = useQueryMCPJSON('data_kitchin');

  const rows = Array.isArray(data) ? data : [];
  const latest = rows[rows.length - 1] || null;
  const stageIdx = latest ? Math.max(0, (latest.stage || 1) - 1) : 0;

  useEffect(() => {
    if (!ref.current || !rows.length) return;
    return renderChart(ref.current, rows);
  }, [data]);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 0' }}>
      {/* 状态栏 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>基钦周期</h2>
        {latest ? (
          <>
            <span style={{
              background: STAGE_COLORS[stageIdx], padding: '2px 12px', borderRadius: 12,
              fontSize: 12, fontWeight: 600, color: '#F0E8D8',
            }}>{latest.stage_name || '未知'}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              需求 {latest.demand_yoy ?? '--'}% · 库存 {latest.inventory_yoy ?? '--'}%
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>截至 {latest.period}</span>
          </>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{isLoading ? '加载中...' : '暂无数据'}</span>
        )}
      </div>

      {/* 图表 */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 8, marginBottom: 16 }}>
        {rows.length > 0
          ? <div ref={ref} style={{ width: '100%', height: 380 }} />
          : <div style={{ width: '100%', height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              {isLoading ? '加载中...' : '暂无数据'}
            </div>}
      </div>

      {/* 指标卡网格（数据驱动） */}
      <DataGrid
        config={KITCHIN_METRICS}
        latest={latest}
        prev={rows.length >= 2 ? rows[rows.length - 2] : null}
        columns={3}
      />
    </div>
  );
}
