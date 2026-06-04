import { create } from 'zustand';

export const useAppStore = create((set) => ({
  activeTab: 'macro',
  activeMicroSub: 'stock',  // 微观子标签: stock/fund/futures/bond/option
  historyMode: null,
  theme: 'matin',
  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveMicroSub: (sub) => set({ activeMicroSub: sub }),
  setHistoryMode: (mode) => set({ historyMode: mode }),
  setTheme: (theme) => set({ theme }),
}));
