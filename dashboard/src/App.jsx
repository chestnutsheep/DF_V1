import { ThemeProvider, useTheme } from 'next-themes';
import { ProSidebarProvider } from 'react-pro-sidebar';
import { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopTabs from './components/TopTabs';
import MacroTab from './components/Macro/MacroTab';
import MacroSnapshot from './components/Macro/MacroSnapshot';
import MesoTab from './components/Meso/MesoTab';
import MicroTab from './components/Micro/MicroTab';
import PolicyDashboard from './components/PolicyDashboard';
import GlobalTab from './components/Global/GlobalTab';
import { useAppStore } from './store';
import { mcp } from './services/mcp';
import './styles/theme.css';

const PANELS = {
  policy: () => <PolicyDashboard />,
  macro: () => (
    <>
      <MacroTab />
      <MacroSnapshot />
    </>
  ),
  meso: () => <MesoTab />,
  micro: () => <MicroTab />,
  global: () => <GlobalTab />,
};

/* 内部组件：同步 next-themes ↔ 本地 store */
function AppInner() {
  const activeTab = useAppStore((s) => s.activeTab);
  const storeTheme = useAppStore((s) => s.theme);
  const setStoreTheme = useAppStore((s) => s.setTheme);
  const { theme, setTheme } = useTheme();

  // 首次加载：store 主题 → next-themes
  useEffect(() => {
    if (storeTheme && storeTheme !== theme) setTheme(storeTheme);
  }, []);

  // TopTabs 切换主题时同步到 store
  useEffect(() => {
    if (theme && theme !== storeTheme) setStoreTheme(theme);
  }, [theme]);

  const Panel = PANELS[activeTab] || PANELS.policy;

  return (
    <div>
      <Sidebar />
      <div className="mn" style={{ marginLeft: 'var(--nav-width)', position: 'relative', zIndex: 2, minHeight: '100vh' }}>
        <TopTabs />
        <main id="main-panel" style={{ padding: '0 0 20px 0' }}>
          <Panel />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="data-theme" enableSystem={false} storageKey="df-theme">
      <ProSidebarProvider>
        <AppInner />
      </ProSidebarProvider>
    </ThemeProvider>
  );
}
