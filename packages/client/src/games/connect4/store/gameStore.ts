import { create } from 'zustand';
import type { PlayerSide, GameMode, AiSkill } from '@boardly/shared';
import type { Connect4GameState, Connect4Move } from '@boardly/shared';

interface Connect4Store {
  gameState: Connect4GameState | null;
  playerSide: PlayerSide | null;
  mode: GameMode | null;
  skill: AiSkill | null;
  roomId: string | null;
  opponentUsername: string | null;
  lastMove: Connect4Move | null;
  rematchRequested: boolean;

  setGame: (state: Connect4GameState, side: PlayerSide, mode: GameMode, skill?: AiSkill, opponentUsername?: string) => void;
  setRoomId: (id: string) => void;
  applyUpdate: (state: Connect4GameState, lastMove: Connect4Move) => void;
  setRematchRequested: (v: boolean) => void;
  reset: () => void;
}

export const useConnect4Store = create<Connect4Store>((set) => ({
  gameState: null,
  playerSide: null,
  mode: null,
  skill: null,
  roomId: null,
  opponentUsername: null,
  lastMove: null,
  rematchRequested: false,

  setGame: (gameState, playerSide, mode, skill, opponentUsername) =>
    set({ gameState, playerSide, mode, skill: skill ?? null, opponentUsername: opponentUsername ?? null, lastMove: null, rematchRequested: false }),

  setRoomId: id => set({ roomId: id }),

  applyUpdate: (gameState, lastMove) => set({ gameState, lastMove }),

  setRematchRequested: v => set({ rematchRequested: v }),

  reset: () => set({
    gameState: null, playerSide: null, mode: null, skill: null,
    roomId: null, opponentUsername: null, lastMove: null, rematchRequested: false,
  }),
}));
