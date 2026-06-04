import { ThemeProvider, useTheme } from 'next-themes';
import { ProSidebarProvider } from 'react-pro-sidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
});
import Sidebar from './components/Sidebar';
import TopTabs from './components/TopTabs';
import MacroLayout from './components/Macro/MacroLayout';
import MesoTab from './components/Meso/MesoTab';
import MicroTab from './components/Micro/MicroTab';
import PolicyDashboard from './components/PolicyDashboard';
import GlobalTab from './components/Global/GlobalTab';
import { useAppStore } from './store';
import { mcp } from './services/mcp';
import './styles/theme.css';

const PANELS = {
  policy: () => <PolicyDashboard />,
  macro: () => <MacroLayout />,
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

  // store 主题 → next-themes（切换标签时触发）
  useEffect(() => {
    if (storeTheme && storeTheme !== theme) setTheme(storeTheme);
  }, [storeTheme]);

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
        <main id="main-panel" style={{ maxWidth: '80%', margin: '0 auto', padding: '0 0 20px 0' }}>
          <Panel />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="data-theme" enableSystem={false} storageKey="df-theme">
      <QueryClientProvider client={queryClient}>
        <ProSidebarProvider>
          <AppInner />
        </ProSidebarProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
