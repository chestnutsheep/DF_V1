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
      <ActiveComp />
    </div>
  );
}
