import type { LudoGameState, LudoMove, LudoColor } from '@boardly/shared';
import { getLegalLudoMoves, absolutePos, LUDO_SAFE_SQUARES } from '@boardly/shared';
import type { AiSkill } from '@boardly/shared';

function scoreMove(state: LudoGameState, color: LudoColor, move: LudoMove): number {
  const piece = state.pieces[color][move.pieceIndex];
  const dice = state.dice!;
  const oldRel = piece.relPos;
  const newRel = oldRel === -1 ? 0 : oldRel + dice;
  let score = newRel; // prefer advancing

  // Bonus: reach goal
  if (newRel === 56) score += 200;

  // Bonus: enter home column
  if (newRel >= 51 && oldRel < 51) score += 50;

  // Bonus: capture an opponent
  if (newRel >= 0 && newRel <= 50 && !LUDO_SAFE_SQUARES.has(absolutePos(color, newRel))) {
    for (const other of Object.keys(state.pieces) as LudoColor[]) {
      if (other === color) continue;
      for (const op of state.pieces[other]) {
        if (op.relPos >= 0 && op.relPos <= 50 && absolutePos(other, op.relPos) === absolutePos(color, newRel)) {
          score += 100;
        }
      }
    }
  }

  // Bonus: land on safe square
  if (newRel >= 0 && newRel <= 50 && LUDO_SAFE_SQUARES.has(absolutePos(color, newRel))) score += 10;

  // Penalty: leave a vulnerable piece (currently on non-safe square)
  if (oldRel >= 0 && oldRel <= 50 && !LUDO_SAFE_SQUARES.has(absolutePos(color, oldRel))) score += 5;

  return score;
}

export function getLudoAiMove(state: LudoGameState, skill: AiSkill): LudoMove {
  const moves = getLegalLudoMoves(state);
  if (moves.length === 0) throw new Error('No legal moves for AI');
  if (moves.length === 1) return moves[0];

  const color = state.currentColor;
  const scored = moves.map(m => ({ move: m, score: scoreMove(state, color, m) }));

  if (skill === 'easy') {
    // Random move
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if (skill === 'medium') {
    // Best move with 20% chance of random
    if (Math.random() < 0.2) return moves[Math.floor(Math.random() * moves.length)];
  }

  // hard / medium fallthrough: best scored move
  scored.sort((a, b) => b.score - a.score);
  return scored[0].move;
}
