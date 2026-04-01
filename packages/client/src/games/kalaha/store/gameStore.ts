import { create } from 'zustand';
import type { GameState, PlayerSide, Move, GameMode, AiSkill, Board } from '@boardly/shared';
import type { DropPosition, DropKind } from '@boardly/shared';

export interface ActiveDrop {
  position: DropPosition;
  kind: DropKind;
}

interface QueuedAnimation {
  startState: GameState;
  move: Move;
  finalState: GameState;
}

interface GameStore {
  displayedState: GameState | null;
  playerSide: PlayerSide | null;
  mode: GameMode | null;
  skill: AiSkill | null;
  roomId: string | null;
  opponentUsername: string | null;
  lastMove: Move | null;
  rematchRequested: boolean;

  activeDrop: ActiveDrop | null;
  animationQueue: QueuedAnimation[];

  setGame: (state: GameState, side: PlayerSide, mode: GameMode, skill?: AiSkill, opponentUsername?: string) => void;
  setRoomId: (id: string) => void;
  enqueueAnimation: (move: Move, finalState: GameState) => void;
  setDisplayedBoard: (board: Board, drop: ActiveDrop | null) => void;
  dequeueAnimation: () => void;
  setRematchRequested: (v: boolean) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  displayedState: null,
  playerSide: null,
  mode: null,
  skill: null,
  roomId: null,
  opponentUsername: null,
  lastMove: null,
  rematchRequested: false,
  activeDrop: null,
  animationQueue: [],

  setGame: (state, side, mode, skill, opponentUsername) =>
    set({
      displayedState: state,
      playerSide: side,
      mode,
      skill: skill ?? null,
      opponentUsername: opponentUsername ?? null,
      lastMove: null,
      rematchRequested: false,
      animationQueue: [],
      activeDrop: null,
    }),

  setRoomId: id => set({ roomId: id }),

  enqueueAnimation: (move, finalState) => {
    set(s => {
      const queue = s.animationQueue;
      const startState =
        queue.length > 0
          ? queue[queue.length - 1].finalState
          : s.displayedState ?? finalState;
      return { animationQueue: [...queue, { startState, move, finalState }] };
    });
  },

  setDisplayedBoard: (board, drop) => {
    set(s => ({
      displayedState: s.displayedState ? { ...s.displayedState, board } : null,
      activeDrop: drop,
    }));
  },

  dequeueAnimation: () => {
    set(s => {
      const [done, ...rest] = s.animationQueue;
      if (!done) return {};
      return {
        animationQueue: rest,
        displayedState: done.finalState,
        lastMove: done.move,
        activeDrop: null,
      };
    });
  },

  setRematchRequested: (v) => set({ rematchRequested: v }),

  reset: () =>
    set({
      displayedState: null,
      playerSide: null,
      mode: null,
      skill: null,
      roomId: null,
      opponentUsername: null,
      lastMove: null,
      rematchRequested: false,
      activeDrop: null,
      animationQueue: [],
    }),
}));
