import { create } from 'zustand';
import type { GameState, PlayerSide, Move, GameMode, AiSkill, Board } from '@kalaha/shared';
import type { DropPosition, DropKind } from '@kalaha/shared';

export interface ActiveDrop {
  position: DropPosition;
  kind: DropKind;
}

interface QueuedAnimation {
  /** Board state at the moment this animation starts — used to compute step-by-step frames */
  startState: GameState;
  move: Move;
  /** Server-authoritative final state to commit after animation completes */
  finalState: GameState;
}

interface GameStore {
  /** What the board renders — updated frame-by-frame during animation */
  displayedState: GameState | null;
  playerSide: PlayerSide | null;
  mode: GameMode | null;
  skill: AiSkill | null;
  roomId: string | null;

  activeDrop: ActiveDrop | null;
  animationQueue: QueuedAnimation[];

  setGame: (state: GameState, side: PlayerSide, mode: GameMode, skill?: AiSkill) => void;
  setRoomId: (id: string) => void;

  /** Enqueue an animation. startState is inferred from last queued finalState or current displayedState. */
  enqueueAnimation: (move: Move, finalState: GameState) => void;

  /** Called by the animation hook to advance the displayed board one frame */
  setDisplayedBoard: (board: Board, drop: ActiveDrop | null) => void;

  /** Pop the first animation off the queue and commit its finalState as displayedState */
  dequeueAnimation: () => void;

  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  displayedState: null,
  playerSide: null,
  mode: null,
  skill: null,
  roomId: null,
  activeDrop: null,
  animationQueue: [],

  setGame: (state, side, mode, skill) =>
    set({ displayedState: state, playerSide: side, mode, skill: skill ?? null, animationQueue: [], activeDrop: null }),

  setRoomId: id => set({ roomId: id }),

  enqueueAnimation: (move, finalState) => {
    set(s => {
      const queue = s.animationQueue;
      // startState for this animation = finalState of the previous queued item, or current displayedState
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
        activeDrop: null,
      };
    });
  },

  reset: () =>
    set({
      displayedState: null,
      playerSide: null,
      mode: null,
      skill: null,
      roomId: null,
      activeDrop: null,
      animationQueue: [],
    }),
}));
