import { type GameState, type PlayerSide } from '@kalaha/shared';
import { SOUTH, NORTH, PITS_PER_SIDE, getLegalMoves, applyMove } from '@kalaha/shared';

/**
 * Returns a heuristic score from SOUTH's perspective.
 * Positive = good for SOUTH, negative = good for NORTH.
 */
export function evaluate(state: GameState): number {
  if (state.status === 'FINISHED') {
    const diff = state.board.stores[SOUTH] - state.board.stores[NORTH];
    // Large score for win/loss
    if (diff > 0) return 10000;
    if (diff < 0) return -10000;
    return 0;
  }

  const storeDiff = state.board.stores[SOUTH] - state.board.stores[NORTH];

  // Tempo: stones on your side = potential future points
  const southPits = state.board.pits[SOUTH].reduce((a, b) => a + b, 0);
  const northPits = state.board.pits[NORTH].reduce((a, b) => a + b, 0);
  const tempoDiff = (southPits - northPits) * 0.1;

  // Extra-turn opportunities: count moves that would land in own store
  let extraTurnBonus = 0;
  for (let i = 0; i < PITS_PER_SIDE; i++) {
    const stones = state.board.pits[SOUTH][i];
    // Distance from pit i to SOUTH store = PITS_PER_SIDE - i
    if (stones === PITS_PER_SIDE - i) extraTurnBonus += 0.5;
    const stonesN = state.board.pits[NORTH][i];
    if (stonesN === PITS_PER_SIDE - i) extraTurnBonus -= 0.5;
  }

  // Capture opportunities: count moves landing in own empty pit opposite non-empty opponent pit
  let captureBonus = 0;
  for (let i = 0; i < PITS_PER_SIDE; i++) {
    const stones = state.board.pits[SOUTH][i];
    if (stones === 0) continue;
    // Would this distribute such that last stone goes to an empty own pit?
    // Simplified: give a small bonus for each empty south pit that has stones opposite
    if (state.board.pits[SOUTH][i] === 0) {
      const mirrorStones = state.board.pits[NORTH][PITS_PER_SIDE - 1 - i];
      if (mirrorStones > 0) captureBonus += 0.3;
    }
  }

  return storeDiff + tempoDiff + extraTurnBonus + captureBonus;
}

/** Score for a given player's perspective */
export function evaluateFor(state: GameState, side: PlayerSide): number {
  const raw = evaluate(state);
  return side === 'SOUTH' ? raw : -raw;
}
