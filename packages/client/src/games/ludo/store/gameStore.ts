import { create } from 'zustand';
import type { LudoGameState, LudoMove, LudoColor, AiSkill } from '@boardly/shared';
import { getLegalLudoMoves } from '@boardly/shared';

interface LudoGameStore {
  state: LudoGameState | null;
  myColor: LudoColor | null;
  skill: AiSkill | null;
  roomId: string | null;
  lastMove: LudoMove | null;
  legalPieceIndices: number[];

  setGame: (state: LudoGameState, myColor: LudoColor, skill: AiSkill) => void;
  setRoomId: (id: string) => void;
  applyUpdate: (state: LudoGameState, lastMove: LudoMove | null) => void;
  reset: () => void;
}

function computeLegal(state: LudoGameState, myColor: LudoColor): number[] {
  if (state.currentColor !== myColor) return [];
  return getLegalLudoMoves(state).map(m => m.pieceIndex);
}

export const useLudoStore = create<LudoGameStore>((set, get) => ({
  state: null,
  myColor: null,
  skill: null,
  roomId: null,
  lastMove: null,
  legalPieceIndices: [],

  setGame: (state, myColor, skill) =>
    set({
      state,
      myColor,
      skill,
      lastMove: null,
      legalPieceIndices: computeLegal(state, myColor),
    }),

  setRoomId: id => set({ roomId: id }),

  applyUpdate: (state, lastMove) =>
    set(prev => ({
      state,
      lastMove,
      legalPieceIndices: prev.myColor ? computeLegal(state, prev.myColor) : [],
    })),

  reset: () =>
    set({
      state: null,
      myColor: null,
      skill: null,
      roomId: null,
      lastMove: null,
      legalPieceIndices: [],
    }),
}));
