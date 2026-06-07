import { useState, useEffect, useRef } from 'react';
import { useMCP } from '../../hooks/useMCP';
import DataChart from '../common/DataChart';
import DataGrid from '../common/DataGrid';
import StatusBar from '../common/StatusBar';

/** 每个周期默认X轴展示时间长度（年） */
const MAX_YEARS = {
  data_kitchin: 5,
  data_juglar: 12,
  data_kuznets: 20,
  data_kondratiev: 60,
};
const DEFAULT_MAX_YEARS = 40;
/** 基钦特殊放大倍率 */
const KITCHIN_SCALE = 1.2;

export default function CyclePage({ config, showTitle }) {
  const { data: rawData, isLoading } = useMCP(config.queryKey, config.params || {});
  let rows = [];
  try { rows = JSON.parse(rawData); } catch(e) {}
  const latest = rows[rows.length - 1] || {};
  const prev = rows[rows.length - 2] || {};

  if (isLoading) return <div style={{ padding: 20 }}>加载中...</div>;
  if (!rows.length) return <div style={{ padding: 20 }}>暂无数据</div>;

  let phaseValue = latest[config.phaseField];
  let phaseName = phaseValue;
  if (latest.phase_name && latest.phase_name !== '未知') {
    phaseName = latest.phase_name;
  } else if (config.phaseField === 'phase') {
    const phaseNames = ['', '复苏', '繁荣', '衰退', '萧条'];
    phaseName = phaseNames[phaseValue] || phaseValue;
  }

  // X轴限定时长
  const maxYears = MAX_YEARS[config.queryKey] || DEFAULT_MAX_YEARS;
  const maxPeriods = maxYears * 12;
  const sliced = rows.length > maxPeriods ? rows.slice(-maxPeriods) : rows;

  // 基钦放大
  const isKitchin = config.queryKey === 'data_kitchin';
  const chartScale = isKitchin ? KITCHIN_SCALE : 1;
  const chartHeight = Math.round(360 * chartScale);

  // 指标卡奇偶布局
  const metrics = config.metrics || [];
  const isEven = metrics.length % 2 === 0;
  const half = Math.ceil(metrics.length / 2);
  const leftCards = metrics.slice(0, isEven ? half : 0);
  const rightCards = metrics.slice(isEven ? half : 0);
  const bottomCards = !isEven ? metrics : [];
  const chartWidth = isEven ? '75%' : '85%';
  const cardSideWidth = isEven ? '12.5%' : '0%';

  // 同步卡片高度与图表高度
  const chartRef = useRef(null);
  const [cardMinH, setCardMinH] = useState(0);
  useEffect(() => {
    if (chartRef.current) {
      const h = chartRef.current.clientHeight;
      if (h > 0) setCardMinH(h);
    }
  }, [rows]);

  return (
    <div>
      {showTitle && <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, marginTop: 8 }}>{showTitle}</h2>}
      <StatusBar phase={phaseName} period={latest.period} />
      <div
        style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* 左侧指标卡（偶数布局） */}
        {leftCards.length > 0 && (
          <div style={{ width: cardSideWidth, minHeight: cardMinH || chartHeight, display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'space-between' }}>
            <DataGrid config={leftCards} data={latest} prevData={prev} columns={1} gap={8} />
          </div>
        )}

        {/* 图表 */}
        <div ref={chartRef} style={{ width: chartWidth, flexShrink: 0 }}>
          <DataChart data={sliced} series={config.chartSeries} dateKey="period" height={chartHeight} />
        </div>

        {/* 右侧指标卡（偶数布局） */}
        {rightCards.length > 0 && (
          <div style={{ width: cardSideWidth, minHeight: cardMinH || chartHeight, display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'space-between' }}>
            <DataGrid config={rightCards} data={latest} prevData={prev} columns={1} gap={8} />
          </div>
        )}
      </div>

      {/* 底部横排指标卡（奇数布局） */}
      {bottomCards.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <DataGrid config={bottomCards} data={latest} prevData={prev} columns={bottomCards.length} gap={8} />
        </div>
      )}
    </div>
  );
}
