import { create } from 'zustand';

export type AnimSpeed = 'slow' | 'normal' | 'fast';

const SPEED_KEY = 'kalahaAnimSpeed';

function loadSpeed(): AnimSpeed {
  const v = localStorage.getItem(SPEED_KEY);
  if (v === 'slow' || v === 'normal' || v === 'fast') return v;
  return 'normal';
}

interface UiStore {
  opponentDisconnected: boolean;
  reconnected: boolean;
  animSpeed: AnimSpeed;
  setOpponentDisconnected: (v: boolean) => void;
  setReconnected: (v: boolean) => void;
  setAnimSpeed: (s: AnimSpeed) => void;
}

export const useUiStore = create<UiStore>(set => ({
  opponentDisconnected: false,
  reconnected: false,
  animSpeed: loadSpeed(),
  setOpponentDisconnected: opponentDisconnected => set({ opponentDisconnected }),
  setReconnected: reconnected => {
    set({ reconnected });
    if (reconnected) setTimeout(() => set({ reconnected: false }), 3000);
  },
  setAnimSpeed: animSpeed => {
    localStorage.setItem(SPEED_KEY, animSpeed);
    set({ animSpeed });
  },
}));
