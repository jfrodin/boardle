import { create } from 'zustand';

type Screen = 'home' | 'lobby' | 'game';

interface UiStore {
  screen: Screen;
  opponentDisconnected: boolean;
  setScreen: (s: Screen) => void;
  setOpponentDisconnected: (v: boolean) => void;
}

export const useUiStore = create<UiStore>(set => ({
  screen: 'home',
  opponentDisconnected: false,
  setScreen: screen => set({ screen }),
  setOpponentDisconnected: opponentDisconnected => set({ opponentDisconnected }),
}));
