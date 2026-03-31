import { type GameState, type Move } from '@boardly/shared';
import { getLegalMoves, applyMove, SOUTH, NORTH, PITS_PER_SIDE } from '@boardly/shared';
import { evaluate } from './Evaluator.js';

const NEG_INF = -Infinity;
const POS_INF = Infinity;

/**
 * Order moves for better alpha-beta pruning:
 * 1. Extra-turn moves first (last stone lands in own store)
 * 2. Capture moves
 * 3. Rest sorted by stone count descending
 */
function orderMoves(state: GameState, moves: Move[]): Move[] {
  const si = state.currentTurn === 'SOUTH' ? SOUTH : NORTH;

  const scored = moves.map(move => {
    const stones = state.board.pits[si][move.pitIndex];
    const distToStore = PITS_PER_SIDE - move.pitIndex;
    const isExtraTurn = stones === distToStore;
    const oi = si === SOUTH ? NORTH : SOUTH;
    // Landing pit on own side (only valid for stones that don't reach the store or wrap)
    const landingPit = move.pitIndex + stones;
    const isCapture =
      !isExtraTurn &&
      landingPit < PITS_PER_SIDE &&
      state.board.pits[si][landingPit] === 0 &&
      state.board.pits[oi][PITS_PER_SIDE - 1 - landingPit] > 0;

    let priority = stones; // base priority
    if (isExtraTurn) priority += 1000;
    else if (isCapture) priority += 500;

    return { move, priority };
  });

  scored.sort((a, b) => b.priority - a.priority);
  return scored.map(s => s.move);
}

function alphaBeta(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  deadline: number,
): number {
  if (Date.now() > deadline) {
    return evaluate(state);
  }

  if (depth === 0 || state.status !== 'ACTIVE') {
    return evaluate(state);
  }

  const moves = getLegalMoves(state);
  if (moves.length === 0) return evaluate(state);

  const ordered = orderMoves(state, moves);

  if (maximizing) {
    let value = NEG_INF;
    for (const move of ordered) {
      const child = applyMove(state, move);
      // If extra turn, same player moves again (still maximizing for SOUTH)
      const childMaximizing = child.currentTurn === 'SOUTH';
      const childVal = alphaBeta(child, depth - 1, alpha, beta, childMaximizing, deadline);
      value = Math.max(value, childVal);
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break; // beta cut-off
    }
    return value;
  } else {
    let value = POS_INF;
    for (const move of ordered) {
      const child = applyMove(state, move);
      const childMaximizing = child.currentTurn === 'SOUTH';
      const childVal = alphaBeta(child, depth - 1, alpha, beta, childMaximizing, deadline);
      value = Math.min(value, childVal);
      beta = Math.min(beta, value);
      if (beta <= alpha) break; // alpha cut-off
    }
    return value;
  }
}

export interface MinimaxConfig {
  maxDepth: number;
  timeBudgetMs: number;
}

export function getBestMove(state: GameState, config: MinimaxConfig): Move {
  const moves = getLegalMoves(state);
  if (moves.length === 0) throw new Error('No legal moves available');
  if (moves.length === 1) return moves[0];

  const deadline = Date.now() + config.timeBudgetMs;
  const maximizing = state.currentTurn === 'SOUTH';

  let bestMove = moves[0];
  let bestScore = maximizing ? NEG_INF : POS_INF;

  // Iterative deepening
  for (let depth = 1; depth <= config.maxDepth; depth++) {
    if (Date.now() > deadline) break;

    let iterBestMove = moves[0];
    let iterBestScore = maximizing ? NEG_INF : POS_INF;

    const ordered = orderMoves(state, moves);

    for (const move of ordered) {
      if (Date.now() > deadline) break;
      const child = applyMove(state, move);
      const childMaximizing = child.currentTurn === 'SOUTH';
      const score = alphaBeta(child, depth - 1, NEG_INF, POS_INF, childMaximizing, deadline);

      if (maximizing ? score > iterBestScore : score < iterBestScore) {
        iterBestScore = score;
        iterBestMove = move;
      }
    }

    // Only update if this depth completed within budget
    if (Date.now() <= deadline) {
      bestMove = iterBestMove;
      bestScore = iterBestScore;
    }
  }

  return bestMove;
}
