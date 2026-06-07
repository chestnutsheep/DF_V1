import { useAppStore } from '../../store';
import StockPanel from './StockPanel';
import FundPanel from './FundPanel';
import FuturesPanel from './FuturesPanel';
import BondPanel from './BondPanel';
import OptionPanel from './OptionPanel';

const PANEL_MAP = {
  stock: StockPanel,
  fund: FundPanel,
  futures: FuturesPanel,
  bond: BondPanel,
  option: OptionPanel,
};

export default function MicroLayout() {
  const activeSub = useAppStore((s) => s.activeMicroSub);
  const ActiveComp = PANEL_MAP[activeSub] || StockPanel;
  return (
    <div>
      <ActiveComp />
    </div>
  );
}
