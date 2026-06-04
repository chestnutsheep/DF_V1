/**
 * DataGrid — 通用指标卡网格。
 *
 * 接收配置数组 + 最新/上期数据，自动布局 DataCard。
 *
 * @example
 * <DataGrid config={KITCHIN_METRICS} latest={latestRow} prev={prevRow} columns={3} />
 */
import DataCard from './DataCard';
import { prepareCardData } from './DataCard';

export default function DataGrid({ config = [], latest, prev, columns = 3, gap = 12 }) {
  const cards = prepareCardData(config, latest, prev);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap,
    }}>
      {cards.map((c, i) => (
        <DataCard
          key={c.key || i}
          label={c.label}
          value={c.value}
          prevValue={prev?.[c.key] ?? null}
          unit={c.unit}
          higherBetter={c.higherBetter}
          decimals={c.decimals ?? 1}
          detail={c.detail}
          source={c.source}
        />
      ))}
    </div>
  );
}
