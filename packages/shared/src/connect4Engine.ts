import type { PlayerSide } from './types.js';
import type { Connect4Board, Connect4GameState, Connect4Move } from './connect4Types.js';

export const ROWS = 6;
export const COLS = 7;
export const WIN_LENGTH = 4;

export function createInitialConnect4State(): Connect4GameState {
  return {
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
    currentTurn: 'SOUTH',
    status: 'ACTIVE',
    winner: null,
  };
}

/** Returns the row index where a piece lands in the given column, or -1 if full. */
export function getDropRow(board: Connect4Board, col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === null) return row;
  }
  return -1;
}

export function getValidColumns(board: Connect4Board): number[] {
  const cols: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === null) cols.push(c);
  }
  return cols;
}

function checkWin(board: Connect4Board, row: number, col: number, side: PlayerSide): boolean {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of directions) {
    let count = 1;
    for (let i = 1; i < WIN_LENGTH; i++) {
      const r = row + dr * i, c = col + dc * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== side) break;
      count++;
    }
    for (let i = 1; i < WIN_LENGTH; i++) {
      const r = row - dr * i, c = col - dc * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== side) break;
      count++;
    }
    if (count >= WIN_LENGTH) return true;
  }
  return false;
}

function isBoardFull(board: Connect4Board): boolean {
  return board[0].every(cell => cell !== null);
}

export function applyConnect4Move(state: Connect4GameState, move: Connect4Move): Connect4GameState {
  const { col } = move;
  const row = getDropRow(state.board, col);
  if (row === -1 || state.status !== 'ACTIVE') return state;

  const board: Connect4Board = state.board.map(r => [...r]);
  board[row][col] = state.currentTurn;

  const won = checkWin(board, row, col, state.currentTurn);
  const draw = !won && isBoardFull(board);

  return {
    board,
    currentTurn: state.currentTurn === 'SOUTH' ? 'NORTH' : 'SOUTH',
    status: won || draw ? 'FINISHED' : 'ACTIVE',
    winner: won ? state.currentTurn : draw ? 'DRAW' : null,
  };
}
