import type { AiSkill } from './types.js';

export type LudoColor = 'RED' | 'GREEN' | 'YELLOW' | 'BLUE';

export const LUDO_COLORS: LudoColor[] = ['RED', 'GREEN', 'YELLOW', 'BLUE'];

// Where each color enters the main track (absolute position 0-51)
export const LUDO_OFFSETS: Record<LudoColor, number> = {
  RED: 0,
  GREEN: 13,
  YELLOW: 26,
  BLUE: 39,
};

// Absolute positions that are safe from capture (start squares + star squares)
export const LUDO_SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Piece relative position:
//   -1       = home base (not yet on board)
//   0 - 50   = main track (relative to player's start offset)
//   51 - 55  = player's private home column
//   56       = goal (finished)
export interface LudoPiece {
  relPos: number;
}

export type LudoPieces = [LudoPiece, LudoPiece, LudoPiece, LudoPiece];

export interface LudoGameState {
  pieces: Record<LudoColor, LudoPieces>;
  currentColor: LudoColor;
  /** null = player must roll; number = player must pick a piece (or auto-skip) */
  dice: number | null;
  /** consecutive 6s; reaching 3 forfeits extra roll */
  sixCount: number;
  status: 'ACTIVE' | 'FINISHED';
  winner: LudoColor | null;
  playerNames: Record<LudoColor, string>;
  isBot: Record<LudoColor, boolean>;
  /** Colours that have finished (all pieces at goal), in order */
  finished: LudoColor[];
}

export interface LudoMove {
  pieceIndex: number; // 0-3
}

// ---- WS messages ----

export type LudoClientMessage =
  | { type: 'LUDO_ROLL' }
  | { type: 'LUDO_MOVE'; pieceIndex: number };

export type LudoServerMessage =
  | {
      type: 'LUDO_GAME_START';
      state: LudoGameState;
      myColor: LudoColor;
      skill: AiSkill;
      roomId: string;
    }
  | { type: 'LUDO_STATE_UPDATE'; state: LudoGameState; lastMove: LudoMove | null }
  | { type: 'LUDO_GAME_OVER'; state: LudoGameState };
