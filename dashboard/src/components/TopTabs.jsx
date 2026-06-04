import { useAppStore } from '../store';

/** 每个标签页绑定的主题 */
const TAB_THEME = {
  policy: 'crepuscule',
  macro: 'matin',
  meso: 'eclat',
  micro: 'reve',
  global: 'lumiere',
};

const tabs = [
  { key: 'policy', label: '📜 政策' },
  { key: 'macro',  label: '🌐 宏观' },
  { key: 'meso',   label: '🏭 中观' },
  { key: 'micro',  label: '🔬 微观' },
  { key: 'global', label: '🌍 国际' },
];

export default function TopTabs() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setTheme = useAppStore((s) => s.setTheme);

  function handleTabClick(key) {
    setActiveTab(key);
    const theme = TAB_THEME[key];
    if (theme) setTheme(theme);
  }

  return (
    <div id="top-tabs" style={{ display: 'flex', background: 'rgba(13,17,23,0.65)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-subtle)', padding: '0 28px', gap: 6, overflowX: 'auto' }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          className="tab-btn"
          style={{
            background: 'transparent', border: 'none', color: activeTab === t.key ? 'var(--accent-gold)' : 'var(--text-secondary)',
            padding: '12px 26px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            borderBottom: activeTab === t.key ? '2px solid var(--accent-gold)' : '2px solid transparent',
            transition: '0.2s', whiteSpace: 'nowrap',
          }}
          onClick={() => handleTabClick(t.key)}
        >{t.label}</button>
      ))}
    </div>
  );
}
