import { useRef, useEffect } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, DataZoomComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useQueryMCPJSON } from '../../hooks/useQueryMCP';
import DataGrid from '../charts/DataGrid';
import { KONDRATIEV_METRICS } from '../../configs/kondratiev';

echarts.use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, LegendComponent, CanvasRenderer]);

export default function KondratievTab() {
  const ref = useRef(null);
  const { data, isLoading } = useQueryMCPJSON('data_kondratiev', { method: 'pca' });

  useEffect(() => {
    if (!ref.current || !data?.pca1?.length) return;
    const { pca1, years, dominant_period, phase, confidence } = data;
    const s = Math.max(1, Math.floor(pca1.length / 120));

    const opt = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis', confine: true,
        backgroundColor: 'rgba(26,47,42,0.92)',
        borderColor: '#B0A898',
        textStyle: { color: '#E8E0D0', fontSize: 11 },
      },
      legend: {
        data: ['PCA合成', 'CF滤波'],
        bottom: 0,
        textStyle: { color: '#B0A898', fontSize: 10 },
      },
      grid: { left: '3%', right: '3%', bottom: '16%', top: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: years.filter((_, i) => i % s === 0),
        axisLabel: { color: '#A09888', fontSize: 7, interval: Math.max(1, Math.floor(years.length / 15 / s)) },
        axisLine: { lineStyle: { color: 'rgba(212,168,83,0.12)' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#A09888', fontSize: 8 },
        splitLine: { lineStyle: { color: 'rgba(212,168,83,0.08)', type: 'dashed' } },
      },
      dataZoom: [{ type: 'inside', start: 0, end: 100 }],
      series: [
        { name: 'PCA合成', type: 'line', data: pca1.filter((_, i) => i % s === 0), smooth: true,
          symbol: 'none', lineStyle: { width: 2, color: '#D4A853' } },
        ...(data.cf_cycle ? [{
          name: 'CF滤波', type: 'line', data: data.cf_cycle.filter((_, i) => i % s === 0), smooth: true,
          symbol: 'none', lineStyle: { width: 1, color: '#58a6ff', opacity: 0.5 },
        }] : []),
      ],
    };

    let c = echarts.getInstanceByDom(ref.current);
    if (!c) c = echarts.init(ref.current);
    c.setOption(opt, true);
    const rs = () => c?.resize();
    window.addEventListener('resize', rs);
    return () => window.removeEventListener('resize', rs);
  }, [data]);

  const phaseNames = ['', '复苏', '繁荣', '衰退', '萧条'];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>康波周期 (长波)</h2>
        {data ? (
          <>
            <span style={{ background: '#7B5E7B', padding: '2px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: '#F0E8D8' }}>
              相位 {data.phase} · {phaseNames[data.phase] || '未知'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              主周期 {data.dominant_period?.toFixed(1) ?? '--'}年
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              置信度 {(data.confidence * 100).toFixed(0) ?? '--'}%
            </span>
          </>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{isLoading ? '加载中...' : '暂无数据'}</span>
        )}
      </div>

      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 8, marginBottom: 16 }}>
        {data?.pca1?.length
          ? <div ref={ref} style={{ width: '100%', height: 380 }} />
          : <div style={{ width: '100%', height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              {isLoading ? '加载中...' : '暂无数据'}
            </div>}
      </div>

      <DataGrid
        config={KONDRATIEV_METRICS}
        latest={{
          dominant_period: data?.dominant_period,
          pca_variance_ratio: data?.pca_variance_ratio != null ? data.pca_variance_ratio * 100 : null,
          confidence: data?.confidence != null ? data.confidence * 100 : null,
          indicators_used: data?.indicators_used,
        }}
        columns={3}
      />
    </div>
  );
}
