import { useMemo } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { GaugeChart } from 'echarts/charts';
import { TooltipComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([GaugeChart, TooltipComponent, TitleComponent, CanvasRenderer]);

/**
 * GaugePanel — 仪表盘组件，适合展示当前相位/数值。
 * @param data  [{ name, value, max, color }]
 * @param height  默认 200
 */
export default function GaugePanel({ data = [], height = 200 }) {
  const option = useMemo(() => {
    return {
      series: data.map((item, i) => ({
        type: 'gauge',
        center: [`${(i + 0.5) * (100 / Math.max(data.length, 1))}%`, '55%'],
        radius: '70%',
        startAngle: 220,
        endAngle: -40,
        min: 0,
        max: item.max ?? 100,
        splitNumber: 2,
        progress: { show: true, width: 8, roundCap: true, itemStyle: { color: item.color || '#D4A853' } },
        axisLine: { lineStyle: { width: 8, color: [[1, 'rgba(212,168,83,0.12)']] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        title: { show: true, offsetCenter: [0, '40%'], fontSize: 11, color: '#B0A898' },
        detail: {
          offsetCenter: [0, '55%'],
          fontSize: 18,
          fontWeight: 700,
          color: item.color || '#D4A853',
          formatter: (v) => typeof v === 'number' ? v.toFixed(2) : String(v),
        },
        data: [{ value: item.value, name: item.name }],
      })),
    };
  }, [data]);

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      style={{ height, width: '100%' }}
      notMerge
    />
  );
}
