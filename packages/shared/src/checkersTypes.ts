import type { PlayerSide, GameMode, AiSkill } from './types.js';

export type { PlayerSide };

export interface CheckersPiece {
  color: PlayerSide;
  isKing: boolean;
}

export type CheckersCell = CheckersPiece | null;

/** [row][col], 8×8. Dark squares (row+col odd) are playable. */
export type CheckersBoard = CheckersCell[][];

export interface CheckersPosition {
  row: number;
  col: number;
}

export interface CheckersMove {
  from: CheckersPosition;
  to: CheckersPosition;
  /** Intermediate landing squares for multi-jump animation */
  path: CheckersPosition[];
  /** Positions of captured pieces (in order) */
  captured: CheckersPosition[];
}

export interface CheckersGameState {
  board: CheckersBoard;
  currentTurn: PlayerSide;
  status: 'ACTIVE' | 'FINISHED';
  winner: PlayerSide | 'DRAW' | null;
}

// ---- WS messages ----

export type CheckersClientMessage =
  | { type: 'CHECKERS_MOVE'; move: CheckersMove };

export type CheckersServerMessage =
  | { type: 'CHECKERS_GAME_START'; state: CheckersGameState; side: PlayerSide; mode: GameMode; skill?: AiSkill; opponentUsername?: string }
  | { type: 'CHECKERS_STATE_UPDATE'; state: CheckersGameState; lastMove: CheckersMove }
  | { type: 'CHECKERS_GAME_OVER'; state: CheckersGameState; lastMove?: CheckersMove };
