import type { PlayerSide, GameStatus, GameMode, AiSkill } from './types.js';

export type Connect4Cell = PlayerSide | null;

/** board[row][col], row 0 = top, row 5 = bottom. 6 rows × 7 cols. */
export type Connect4Board = Connect4Cell[][];

export interface Connect4GameState {
  board: Connect4Board;
  currentTurn: PlayerSide;
  status: GameStatus;
  winner: PlayerSide | 'DRAW' | null;
}

export interface Connect4Move {
  col: number; // 0–6
}

export type Connect4ServerMessage =
  | { type: 'CONNECT4_GAME_START'; state: Connect4GameState; side: PlayerSide; mode: GameMode; skill?: AiSkill; opponentUsername?: string; roomId?: string }
  | { type: 'CONNECT4_STATE_UPDATE'; state: Connect4GameState; lastMove: Connect4Move }
  | { type: 'CONNECT4_GAME_OVER'; state: Connect4GameState; lastMove?: Connect4Move };
