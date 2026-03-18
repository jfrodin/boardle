import { create } from 'zustand';

type Screen = 'home' | 'lobby' | 'game';
export type AnimSpeed = 'slow' | 'normal' | 'fast';

const SPEED_KEY = 'kalahaAnimSpeed';

function loadSpeed(): AnimSpeed {
  const v = localStorage.getItem(SPEED_KEY);
  if (v === 'slow' || v === 'normal' || v === 'fast') return v;
  return 'normal';
}

interface UiStore {
  screen: Screen;
  opponentDisconnected: boolean;
  animSpeed: AnimSpeed;
  setScreen: (s: Screen) => void;
  setOpponentDisconnected: (v: boolean) => void;
  setAnimSpeed: (s: AnimSpeed) => void;
}

export const useUiStore = create<UiStore>(set => ({
  screen: 'home',
  opponentDisconnected: false,
  animSpeed: loadSpeed(),
  setScreen: screen => set({ screen }),
  setOpponentDisconnected: opponentDisconnected => set({ opponentDisconnected }),
  setAnimSpeed: animSpeed => {
    localStorage.setItem(SPEED_KEY, animSpeed);
    set({ animSpeed });
  },
}));
