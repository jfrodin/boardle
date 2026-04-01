export type PlayerSide = 'SOUTH' | 'NORTH';
export type AiSkill = 'easy' | 'medium' | 'hard';
export type GameStatus = 'WAITING' | 'ACTIVE' | 'FINISHED';
export type GameMode = 'ai' | 'online';

/**
 * Board layout:
 *   NORTH pits: indices 0-5 (pit 0 is closest to NORTH's store on the right)
 *   SOUTH pits: indices 0-5 (pit 0 is on SOUTH's left)
 *
 * Visual:
 *   [N5][N4][N3][N2][N1][N0]
 * [NS]                      [SS]
 *   [S0][S1][S2][S3][S4][S5]
 *
 * Distribution order (counter-clockwise from SOUTH's perspective):
 *   S0 -> S1 -> S2 -> S3 -> S4 -> S5 -> SS -> N0 -> N1 -> N2 -> N3 -> N4 -> N5 -> S0 ...
 *   (skip opponent's store)
 */
export interface Board {
  /** pits[0] = SOUTH pits array (0-5), pits[1] = NORTH pits array (0-5) */
  pits: [number[], number[]];
  /** stores[0] = SOUTH store, stores[1] = NORTH store */
  stores: [number, number];
}

export interface GameState {
  board: Board;
  currentTurn: PlayerSide;
  status: GameStatus;
  winner: PlayerSide | 'DRAW' | null;
}

export interface Move {
  side: PlayerSide;
  pitIndex: number; // 0-5
}

// ---- WebSocket protocol ----

/** Game identifier — used to route messages when multiple games share one server */
export type GameId = 'kalaha';

export type ClientMessage =
  | { type: 'AUTH'; token: string }
  | { type: 'JOIN_QUEUE'; gameId: GameId }
  | { type: 'JOIN_ROOM'; roomId: string; playerSide?: PlayerSide }
  | { type: 'START_AI_GAME'; gameId: GameId; skill: AiSkill; animDelay?: number }
  | { type: 'MAKE_MOVE'; move: Move }
  | { type: 'LEAVE_ROOM' }
  | { type: 'REMATCH' };

export type ServerMessage =
  | { type: 'AUTH_OK'; username: string }
  | { type: 'ROOM_JOINED'; roomId: string; side: PlayerSide }
  | { type: 'GAME_START'; state: GameState; side: PlayerSide; mode: GameMode; skill?: AiSkill; opponentUsername?: string }
  | { type: 'STATE_UPDATE'; state: GameState; lastMove: Move }
  | { type: 'GAME_OVER'; state: GameState; lastMove?: Move }
  | { type: 'OPPONENT_DISCONNECTED' }
  | { type: 'WAITING_FOR_OPPONENT' }
  | { type: 'TURN_TIMEOUT'; side: PlayerSide }
  | { type: 'REMATCH_REQUESTED' }
  | { type: 'ERROR'; code: string; message: string }
  | { type: 'AUTH_ERROR'; message: string };
