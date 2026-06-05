import KitchinTab from './KitchinTab';
import JuglarTab from './JuglarTab';
import KuznetsTab from './KuznetsTab';
import KondratievTab from './KondratievTab';
import CoverageTab from './CoverageTab';
import MacroSnapshot from './MacroSnapshot';
import { useAppStore } from '../../store';

const TABS = {
  kitchin: KitchinTab,
  juglar: JuglarTab,
  kuznets: KuznetsTab,
  kondratiev: KondratievTab,
  coverage: CoverageTab,
};

export default function MacroLayout() {
  const sub = useAppStore((s) => s.activeMacroSub);
  const ActiveComp = TABS[sub] || KitchinTab;

  return (
    <div style={{ padding: '28px 0' }}>
      <MacroSnapshot />
      <ActiveComp />
    </div>
  );
}
