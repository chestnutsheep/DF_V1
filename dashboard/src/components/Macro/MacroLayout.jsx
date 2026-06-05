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

function PortfolioPanel() {
  const items = [
    { label: '权益', pct: 35, color: '#D4A853' },
    { label: '债券', pct: 40, color: '#5B8FA8' },
    { label: '基金', pct: 15, color: '#3E6B5C' },
    { label: '现金', pct: 10, color: '#C49BA5' },
  ];
  return (
    <div style={{ background: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', padding: 16, backdropFilter: 'blur(12px)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, letterSpacing: 1 }}>💼 资产配置</div>
      {items.map(i => (
        <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: i.color }} />
          <span style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1 }}>{i.label}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-gold)' }}>{i.pct}%</span>
        </div>
      ))}
    </div>
  );
}

function CycleDirection() {
  const phases = [
    { name: '基钦', phase: '主动补库存', dir: '↑', color: '#3fb950' },
    { name: '朱格拉', phase: '弱复苏', dir: '→', color: '#D4A853' },
    { name: '库兹涅茨', phase: 'L型筑底', dir: '↓', color: '#f85149' },
    { name: '康波', phase: '萧条期末', dir: '↑', color: '#D4A853' },
  ];
  return (
    <div style={{ background: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', padding: 16, backdropFilter: 'blur(12px)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, letterSpacing: 1 }}>🔄 基于周期大概方向</div>
      {phases.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 32 }}>{p.name}</span>
          <span style={{ fontSize: 14, color: p.color, fontWeight: 700 }}>{p.dir}</span>
          <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{p.phase}</span>
        </div>
      ))}
    </div>
  );
}

export default function MacroLayout() {
  const [sub, setSub] = useState('kitchin');
  const ActiveComp = TABS.find(t => t.key === sub)?.comp || KitchinTab;

  return (
    <div style={{ display: 'flex', gap: 24, padding: '28px 0', alignItems: 'flex-start' }}>
      {/* 左侧面板: 资产配置 + 周期方向 + 分区按钮 */}
      <div style={{ width: 200, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 20, alignSelf: 'flex-start' }}>
        <PortfolioPanel />
        <CycleDirection />
        {/* 分区按钮 (子Tab) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setSub(t.key)}
              style={{
                background: sub === t.key ? 'var(--accent-gold)' : 'transparent',
                border: 'none', color: sub === t.key ? '#1a1a1a' : 'var(--text-secondary)',
                padding: '10px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                borderRadius: 10, transition: '0.2s', textAlign: 'left',
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>
      {/* 右侧主区域 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <MacroSnapshot />
        <ActiveComp />
      </div>
    </div>
  );
}
