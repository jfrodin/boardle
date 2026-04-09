import type { PlayerSide, AiSkill } from '@boardly/shared';
import {
  applyConnect4Move,
  getValidColumns,
  getDropRow,
  ROWS, COLS, WIN_LENGTH,
} from '@boardly/shared';
import type { Connect4GameState, Connect4Board } from '@boardly/shared';

const DEPTH_BY_SKILL: Record<AiSkill, number> = {
  easy: 2,
  medium: 5,
  hard: 7,
};

// --- Evaluation ---

function scoreWindow(window: (PlayerSide | null)[], side: PlayerSide): number {
  const opp = side === 'SOUTH' ? 'NORTH' : 'SOUTH';
  const mine = window.filter(c => c === side).length;
  const theirs = window.filter(c => c === opp).length;
  const empty = window.filter(c => c === null).length;
  if (theirs > 0) return 0;
  if (mine === WIN_LENGTH) return 100000;
  if (mine === 3 && empty === 1) return 10;
  if (mine === 2 && empty === 2) return 2;
  return 0;
}

function evaluate(board: Connect4Board, side: PlayerSide): number {
  let score = 0;

  // Centre column preference
  const centreCol = Math.floor(COLS / 2);
  const centreCount = board.map(r => r[centreCol]).filter(c => c === side).length;
  score += centreCount * 3;

  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - WIN_LENGTH; c++) {
      const window = board[r].slice(c, c + WIN_LENGTH);
      score += scoreWindow(window, side);
    }
  }

  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - WIN_LENGTH; r++) {
      const window = [board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]];
      score += scoreWindow(window, side);
    }
  }

  // Diagonal /
  for (let r = WIN_LENGTH - 1; r < ROWS; r++) {
    for (let c = 0; c <= COLS - WIN_LENGTH; c++) {
      const window = [board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]];
      score += scoreWindow(window, side);
    }
  }

  // Diagonal \
  for (let r = 0; r <= ROWS - WIN_LENGTH; r++) {
    for (let c = 0; c <= COLS - WIN_LENGTH; c++) {
      const window = [board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]];
      score += scoreWindow(window, side);
    }
  }

  return score;
}

function isTerminal(state: Connect4GameState): boolean {
  return state.status === 'FINISHED';
}

function minimax(
  state: Connect4GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximising: boolean,
  aiSide: PlayerSide,
): number {
  if (depth === 0 || isTerminal(state)) {
    if (state.winner === aiSide) return 100000 + depth;
    if (state.winner !== null && state.winner !== 'DRAW') return -100000 - depth;
    return evaluate(state.board, aiSide);
  }

  const cols = getValidColumns(state.board);

  if (maximising) {
    let value = -Infinity;
    for (const col of cols) {
      const next = applyConnect4Move(state, { col });
      value = Math.max(value, minimax(next, depth - 1, alpha, beta, false, aiSide));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    for (const col of cols) {
      const next = applyConnect4Move(state, { col });
      value = Math.min(value, minimax(next, depth - 1, alpha, beta, true, aiSide));
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }
}

export function getBestConnect4Move(state: Connect4GameState, skill: AiSkill): number {
  const depth = DEPTH_BY_SKILL[skill];
  const aiSide = state.currentTurn;
  const cols = getValidColumns(state.board);

  // Easy: occasionally play randomly
  if (skill === 'easy' && Math.random() < 0.4) {
    return cols[Math.floor(Math.random() * cols.length)];
  }

  // Prefer centre columns in search order
  const ordered = [...cols].sort((a, b) =>
    Math.abs(a - Math.floor(COLS / 2)) - Math.abs(b - Math.floor(COLS / 2))
  );

  let bestCol = ordered[0];
  let bestScore = -Infinity;

  for (const col of ordered) {
    const next = applyConnect4Move(state, { col });
    const score = minimax(next, depth - 1, -Infinity, Infinity, false, aiSide);
    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }

  return bestCol;
}
