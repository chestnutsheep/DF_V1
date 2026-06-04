import { useRef, useEffect } from 'react';
import * as echarts from 'echarts/core';
import { LineChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, DataZoomComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useQueryMCPJSON } from '../../hooks/useQueryMCP';
import GaugePanel from '../charts/GaugePanel';
import DataGrid from '../charts/DataGrid';
import { KUZNETS_METRICS } from '../../configs/kuznets';

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, DataZoomComponent, LegendComponent, CanvasRenderer]);

const STAGE_COLORS = ['#D48A8A', '#6AD07A', '#D4A853', '#7B5E7B'];

function renderChart(div, rows) {
  if (!rows?.length) return;
  const periods = rows.map(r => r.period);
  const price = rows.map(r => r.house_price_yoy);
  const sales = rows.map(r => r.sales_yoy);
  const newStart = rows.map(r => r.new_start_yoy);

  const opt = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', confine: true,
      backgroundColor: 'rgba(26,47,42,0.92)',
      borderColor: '#B0A898',
      textStyle: { color: '#E8E0D0', fontSize: 11 },
      formatter: (p) => {
        const i = p[0].dataIndex;
        let h = `<b style="color:#D4A853">${periods[i]}</b><br/>`;
        if (price[i] != null) h += `房价: <b>${price[i]}</b><br/>`;
        if (sales[i] != null) h += `销售: <b>${sales[i]}%</b><br/>`;
        if (newStart[i] != null) h += `新开工: <b>${newStart[i]}%</b>`;
        return h;
      },
    },
    legend: {
      data: ['房价指数%', '销售面积%', '新开工%'],
      bottom: 0,
      textStyle: { color: '#B0A898', fontSize: 10 },
    },
    grid: { left: '3%', right: '3%', bottom: '16%', top: '3%', containLabel: true },
    xAxis: {
      type: 'category', data: periods,
      axisLabel: {
        color: '#A09888', fontSize: 7,
        formatter: (v) => {
          const m = v?.substring(4,6);
          if (m === '01') return `{year|${v.substring(0,4)}}`;
          if (['04','07','10'].includes(m)) return `{qtr|Q${Math.ceil(parseInt(m)/3)}}`;
          return `{tick||}`;
        },
        rich: {
          year: { fontSize: 10, fontWeight: 700, color: '#E8E0D0' },
          qtr: { fontSize: 8, color: '#B0A898' },
          tick: { fontSize: 7, color: '#706858' },
        },
      },
      axisLine: { lineStyle: { color: 'rgba(212,168,83,0.12)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#A09888', fontSize: 8 },
      splitLine: { lineStyle: { color: 'rgba(212,168,83,0.08)', type: 'dashed' } },
    },
    dataZoom: [{ type: 'inside', start: Math.max(0, 100 - 6000 / periods.length), end: 100 }],
    series: [
      { name: '房价指数%', type: 'line', data: price, smooth: true, symbol: 'circle', symbolSize: 2,
        lineStyle: { width: 1.5, color: '#D4A853' } },
      { name: '销售面积%', type: 'line', data: sales, smooth: true, symbol: 'diamond', symbolSize: 2,
        lineStyle: { width: 1.5, color: '#58a6ff' } },
      { name: '新开工%', type: 'bar', data: newStart,
        itemStyle: { color: '#a371f7', opacity: 0.6 } },
    ],
  };

  let c = echarts.getInstanceByDom(div);
  if (!c) c = echarts.init(div);
  c.setOption(opt, true);
  const rs = () => c?.resize();
  window.addEventListener('resize', rs);
  return () => window.removeEventListener('resize', rs);
}

export default function KuznetsTab() {
  const ref = useRef(null);
  const { data, isLoading } = useQueryMCPJSON('data_kuznets');
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
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>库兹涅茨周期</h2>
        {latest ? (
          <>
            <span style={{ background: STAGE_COLORS[stageIdx], padding: '2px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: '#F0E8D8' }}>
              {latest.phase_name || '未知'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              房价 {latest.house_price_yoy ?? '--'}
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 8 }}>
          <GaugePanel data={[{
            name: '房价指数',
            value: latest?.house_price_yoy ?? 0,
            max: 120,
            color: '#58a6ff',
          }]} height={180} />
        </div>
        <DataGrid config={KUZNETS_METRICS} latest={latest} prev={rows.length >= 2 ? rows[rows.length - 2] : null} columns={3} />
      </div>
    </div>
  );
}
