import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../src/store';

describe('Sidebar 结构（react-pro-sidebar）', () => {
  beforeEach(() => {
    useAppStore.setState({ activeTab: 'policy', activeMicroSub: 'stock', theme: 'matin' });
  });

  it('store 初始 tab 为 policy', () => {
    expect(useAppStore.getState().activeTab).toBe('policy');
  });

  it('setActiveTab 切换标签', () => {
    useAppStore.getState().setActiveTab('macro');
    expect(useAppStore.getState().activeTab).toBe('macro');
    useAppStore.getState().setActiveTab('meso');
    expect(useAppStore.getState().activeTab).toBe('meso');
  });

  it('全部 5 个标签均可切换', () => {
    const tabs = ['policy', 'macro', 'meso', 'micro', 'global'];
    for (const t of tabs) {
      useAppStore.getState().setActiveTab(t);
      useAppStore.getState().setTheme(
        t === 'policy' ? 'crepuscule' :
        t === 'macro' ? 'matin' :
        t === 'meso' ? 'eclat' :
        t === 'micro' ? 'reve' : 'lumiere'
      );
      const state = useAppStore.getState();
      expect(state.activeTab).toBe(t);
      expect(state.theme).toBeTruthy();
    }
  });

  it('setActiveMicroSub 切换微观子标签', () => {
    const subs = ['stock', 'fund', 'futures', 'bond', 'option'];
    for (const s of subs) {
      useAppStore.getState().setActiveMicroSub(s);
      expect(useAppStore.getState().activeMicroSub).toBe(s);
    }
  });

  it('单独切换主题不影响标签', () => {
    useAppStore.getState().setActiveTab('macro');
    useAppStore.getState().setTheme('reve');
    expect(useAppStore.getState().activeTab).toBe('macro');
    expect(useAppStore.getState().theme).toBe('reve');
  });
});
