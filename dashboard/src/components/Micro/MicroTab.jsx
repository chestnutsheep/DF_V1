import StockPanel from './StockPanel';
import { FundPanel, FuturesPanel, BondPanel, OptionPanel } from './SubPanels';
import { useAppStore } from '../../store';

const SUB_MAP = {
  stock: StockPanel,
  fund: FundPanel,
  futures: FuturesPanel,
  bond: BondPanel,
  option: OptionPanel,
};

export default function MicroTab() {
  const activeMicroSub = useAppStore((s) => s.activeMicroSub);
  const ActiveComp = SUB_MAP[activeMicroSub] || StockPanel;

  return (
    <div style={{ padding: '28px 0' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>🔬 微观</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>个股 · 基金 · 期货 · 债券 · 期权</p>
      <ActiveComp />
    </div>
  );
}
