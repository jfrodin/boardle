import { create } from 'zustand';
import type {
  CheckersGameState,
  CheckersMove,
  CheckersPosition,
  PlayerSide,
  GameMode,
  AiSkill,
} from '@boardly/shared';
import { getLegalCheckersMovesForPiece, getLegalCheckersMoves } from '@boardly/shared';

interface CheckersGameStore {
  displayedState: CheckersGameState | null;
  playerSide: PlayerSide | null;
  mode: GameMode | null;
  skill: AiSkill | null;
  roomId: string | null;
  opponentUsername: string | null;
  lastMove: CheckersMove | null;
  rematchRequested: boolean;

  /** Currently selected piece (null = nothing selected) */
  selectedSquare: CheckersPosition | null;
  /** Legal moves for the selected piece */
  legalMovesForSelected: CheckersMove[];
  /** All legal moves for current player (for forced-capture highlighting) */
  allLegalMoves: CheckersMove[];

  setGame: (state: CheckersGameState, side: PlayerSide, mode: GameMode, skill?: AiSkill, opponentUsername?: string) => void;
  setRoomId: (id: string) => void;
  applyStateUpdate: (state: CheckersGameState, lastMove: CheckersMove) => void;
  selectSquare: (pos: CheckersPosition | null) => void;
  setRematchRequested: (v: boolean) => void;
  reset: () => void;
}

export const useCheckersStore = create<CheckersGameStore>((set, get) => ({
  displayedState: null,
  playerSide: null,
  mode: null,
  skill: null,
  roomId: null,
  opponentUsername: null,
  lastMove: null,
  rematchRequested: false,
  selectedSquare: null,
  legalMovesForSelected: [],
  allLegalMoves: [],

  setGame: (state, side, mode, skill, opponentUsername) =>
    set({
      displayedState: state,
      playerSide: side,
      mode,
      skill: skill ?? null,
      opponentUsername: opponentUsername ?? null,
      lastMove: null,
      rematchRequested: false,
      selectedSquare: null,
      legalMovesForSelected: [],
      allLegalMoves: getLegalCheckersMoves(state),
    }),

  setRoomId: id => set({ roomId: id }),

  applyStateUpdate: (state, lastMove) =>
    set({
      displayedState: state,
      lastMove,
      selectedSquare: null,
      legalMovesForSelected: [],
      allLegalMoves: getLegalCheckersMoves(state),
    }),

  selectSquare: pos => {
    const { displayedState, playerSide } = get();
    if (!displayedState || !pos) {
      set({ selectedSquare: null, legalMovesForSelected: [] });
      return;
    }
    const moves = getLegalCheckersMovesForPiece(displayedState, pos);
    set({ selectedSquare: pos, legalMovesForSelected: moves });
  },

  setRematchRequested: v => set({ rematchRequested: v }),

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
      selectedSquare: null,
      legalMovesForSelected: [],
      allLegalMoves: [],
    }),
}));
