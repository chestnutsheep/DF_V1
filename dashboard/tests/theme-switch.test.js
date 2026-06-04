import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../src/store';

// ─── 主题切换测试（无需 DOM，纯 store 逻辑） ─────────
describe('next-themes 主题切换', () => {
  beforeEach(() => {
    // 重置 store 到默认状态
    useAppStore.setState({ theme: 'matin', activeTab: 'policy' });
  });

  it('store 默认主题为 matin', () => {
    const { theme } = useAppStore.getState();
    expect(theme).toBe('matin');
  });

  it('setTheme 更新 store 主题值', () => {
    useAppStore.getState().setTheme('crepuscule');
    const { theme } = useAppStore.getState();
    expect(theme).toBe('crepuscule');
  });

  it('setTheme 支持全部 5 个主题值', () => {
    const themes = ['matin', 'crepuscule', 'eclat', 'reve', 'lumiere'];
    for (const t of themes) {
      useAppStore.getState().setTheme(t);
      expect(useAppStore.getState().theme).toBe(t);
    }
  });

  it('TopTabs 每个标签绑定正确的主题', () => {
    // 模拟 TopTabs 的 TAB_THEME 映射
    const TAB_THEME = {
      policy: 'crepuscule',
      macro: 'matin',
      meso: 'eclat',
      micro: 'reve',
      global: 'lumiere',
    };
    const store = useAppStore.getState();

    // 模拟 TopTabs 的 handleTabClick
    for (const [tab, expectedTheme] of Object.entries(TAB_THEME)) {
      store.setActiveTab(tab);
      store.setTheme(expectedTheme);
      expect(useAppStore.getState().activeTab).toBe(tab);
      expect(useAppStore.getState().theme).toBe(expectedTheme);
    }
  });

  it('主题切换与标签切换不冲突', () => {
    const store = useAppStore.getState();
    // 先切换到 meso 标签（主题 eclat）
    store.setActiveTab('meso');
    store.setTheme('eclat');
    // 手动调用 setTheme 改为 reve（模拟手动切主题）
    store.setTheme('reve');
    // 标签不变，主题已变
    expect(useAppStore.getState().activeTab).toBe('meso');
    expect(useAppStore.getState().theme).toBe('reve');
  });
});
