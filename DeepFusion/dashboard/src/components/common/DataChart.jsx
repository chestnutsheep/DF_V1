import { useRef, useEffect } from 'react';
import * as echarts from 'echarts';

export default function DataChart({ data, series, dateKey = 'period', height = 400, zoom = true }) {
  const chartRef = useRef(null);
  useEffect(() => {
    if (!chartRef.current || !data?.length) return;
    const chart = echarts.init(chartRef.current);
    const dates = data.map(r => r[dateKey]);
    const option = {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: series.map(s => s.name), textStyle: { color: 'var(--text-secondary)' }, bottom: 0 },
      grid: { left: '8%', right: '5%', top: '10%', bottom: '15%', containLabel: true },
      xAxis: { type: 'category', data: dates, axisLabel: { rotate: 45, color: 'var(--text-secondary)' } },
      yAxis: { type: 'value', axisLabel: { color: 'var(--text-secondary)' }, splitLine: { lineStyle: { color: 'rgba(212,168,83,0.08)' } } },
      series: series.map(s => ({
        name: s.name,
        type: s.type || 'line',
        data: data.map(r => r[s.key]),
        smooth: true,
        lineStyle: { color: s.color, width: 2 },
        areaStyle: s.type !== 'bar' ? { opacity: 0.05, color: s.color } : undefined,
        itemStyle: s.type === 'bar' ? { color: s.color } : undefined,
        symbol: 'none',
      })),
      ...(zoom && { dataZoom: [{ type: 'inside', start: 0, end: 100 }] }),
    };
    chart.setOption(option);
    return () => chart.dispose();
  }, [data, series, dateKey, zoom]);
  return <div ref={chartRef} style={{ width: '100%', height }} />;
}