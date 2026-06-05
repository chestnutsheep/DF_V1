import { useState } from 'react';
import KitchinTab from './KitchinTab';
import JuglarTab from './JuglarTab';
import KuznetsTab from './KuznetsTab';
import KondratievTab from './KondratievTab';
import CoverageTab from './CoverageTab';
import MacroSnapshot from './MacroSnapshot';

const TABS = [
  { key: 'kitchin',    label: '📉 基钦',    comp: KitchinTab },
  { key: 'juglar',     label: '📈 朱格拉',  comp: JuglarTab },
  { key: 'kuznets',    label: '🏠 库兹涅茨', comp: KuznetsTab },
  { key: 'kondratiev', label: '🌊 康波',    comp: KondratievTab },
  { key: 'coverage',   label: '📊 宏观覆盖', comp: CoverageTab },
];

export default function MacroLayout() {
  const [sub, setSub] = useState('kitchin');
  const ActiveComp = TABS.find(t => t.key === sub)?.comp || KitchinTab;

  return (
    <div style={{ padding: '28px 0' }}>
      <MacroSnapshot />

      {/* 分区按钮 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 24, marginBottom: 16, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setSub(t.key)}
            style={{
              background: sub === t.key ? 'var(--accent-gold)' : 'transparent',
              border: 'none', color: sub === t.key ? '#1a1a1a' : 'var(--text-secondary)',
              padding: '8px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              borderRadius: 30, transition: '0.2s',
            }}
          >{t.label}</button>
        ))}
      </div>

      <ActiveComp />
    </div>
  );
}
