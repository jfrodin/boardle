import { create } from 'zustand';
import type { GameState, PlayerSide, Move, GameMode, AiSkill } from '@kalaha/shared';

interface AnimationItem {
  move: Move;
  nextState: GameState;
}

interface GameStore {
  state: GameState | null;
  playerSide: PlayerSide | null;
  mode: GameMode | null;
  skill: AiSkill | null;
  roomId: string | null;
  pendingAnimation: AnimationItem | null;
  isAnimating: boolean;

  setGame: (state: GameState, side: PlayerSide, mode: GameMode, skill?: AiSkill) => void;
  setRoomId: (id: string) => void;
  queueAnimation: (move: Move, nextState: GameState) => void;
  commitAnimation: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  playerSide: null,
  mode: null,
  skill: null,
  roomId: null,
  pendingAnimation: null,
  isAnimating: false,

  setGame: (state, side, mode, skill) =>
    set({ state, playerSide: side, mode, skill: skill ?? null }),

  setRoomId: id => set({ roomId: id }),

  queueAnimation: (move, nextState) => {
    set({ pendingAnimation: { move, nextState }, isAnimating: true });
  },

  commitAnimation: () => {
    const { pendingAnimation } = get();
    if (!pendingAnimation) return;
    set({
      state: pendingAnimation.nextState,
      pendingAnimation: null,
      isAnimating: false,
    });
  },

  reset: () =>
    set({
      state: null,
      playerSide: null,
      mode: null,
      skill: null,
      roomId: null,
      pendingAnimation: null,
      isAnimating: false,
    }),
}));
