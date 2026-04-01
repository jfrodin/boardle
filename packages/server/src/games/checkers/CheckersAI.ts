import type { CheckersGameState, CheckersMove } from '@boardly/shared';
import { getLegalCheckersMoves, applyCheckersMove } from '@boardly/shared';
import type { AiSkill } from '@boardly/shared';

const DEPTH_BY_SKILL: Record<AiSkill, number> = {
  easy: 2,
  medium: 5,
  hard: 8,
};

function evaluate(state: CheckersGameState): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (!piece) continue;
      // Kings are worth 3x a regular piece
      const value = piece.isKing ? 3 : 1;
      // Advancement bonus — reward progress toward promotion
      const advance = piece.color === 'SOUTH' ? (7 - r) : r;
      const total = value + advance * 0.05;
      if (piece.color === 'SOUTH') score += total;
      else score -= total;
    }
  }
  return score;
}

function minimax(
  state: CheckersGameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number {
  if (depth === 0 || state.status === 'FINISHED') {
    if (state.status === 'FINISHED') {
      if (state.winner === 'SOUTH') return 1000;
      if (state.winner === 'NORTH') return -1000;
      return 0;
    }
    return evaluate(state);
  }

  const moves = getLegalCheckersMoves(state);
  if (moves.length === 0) {
    return maximizing ? -1000 : 1000;
  }

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      const next = applyCheckersMove(state, move);
      best = Math.max(best, minimax(next, depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      const next = applyCheckersMove(state, move);
      best = Math.min(best, minimax(next, depth - 1, alpha, beta, true));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

/** Returns the best move for the AI (always plays as NORTH). */
export function getCheckersAiMove(state: CheckersGameState, skill: AiSkill): CheckersMove {
  const depth = DEPTH_BY_SKILL[skill];
  const moves = getLegalCheckersMoves(state);
  if (moves.length === 0) throw new Error('No legal moves for AI');

  let bestMove = moves[0];
  let bestScore = Infinity; // AI is NORTH → minimizing

  for (const move of moves) {
    const next = applyCheckersMove(state, move);
    const score = minimax(next, depth - 1, -Infinity, Infinity, true); // next turn = SOUTH maximizing
    if (score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
