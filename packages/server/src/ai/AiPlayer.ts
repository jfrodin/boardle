import type { GameState, Move, AiSkill } from '@kalaha/shared';
import { getLegalMoves } from '@kalaha/shared';
import { getBestMove, type MinimaxConfig } from './Minimax.js';

const SKILL_CONFIG: Record<AiSkill, MinimaxConfig> = {
  easy: { maxDepth: 2, timeBudgetMs: 500 },
  medium: { maxDepth: 5, timeBudgetMs: 300 },
  hard: { maxDepth: 12, timeBudgetMs: 1000 },
};

export function getAiMove(state: GameState, skill: AiSkill): Move {
  const moves = getLegalMoves(state);
  if (moves.length === 0) throw new Error('No legal moves');

  if (skill === 'easy') {
    // Easy: pick a random legal move (ignores minimax)
    return moves[Math.floor(Math.random() * moves.length)];
  }

  return getBestMove(state, SKILL_CONFIG[skill]);
}
