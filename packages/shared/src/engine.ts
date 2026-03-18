import type { Board, GameState, Move, PlayerSide } from './types.js';

export const PITS_PER_SIDE = 6;
export const INITIAL_STONES = 4;
export const SOUTH = 0;
export const NORTH = 1;

export function sideIndex(side: PlayerSide): 0 | 1 {
  return side === 'SOUTH' ? SOUTH : NORTH;
}

export function oppositeSide(side: PlayerSide): PlayerSide {
  return side === 'SOUTH' ? 'NORTH' : 'SOUTH';
}

export function createInitialState(): GameState {
  return {
    board: {
      pits: [
        Array(PITS_PER_SIDE).fill(INITIAL_STONES),
        Array(PITS_PER_SIDE).fill(INITIAL_STONES),
      ],
      stores: [0, 0],
    },
    currentTurn: 'SOUTH',
    status: 'ACTIVE',
    winner: null,
  };
}

function cloneBoard(board: Board): Board {
  return {
    pits: [
      [...board.pits[SOUTH]],
      [...board.pits[NORTH]],
    ],
    stores: [board.stores[SOUTH], board.stores[NORTH]],
  };
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    board: cloneBoard(state.board),
  };
}

export function isLegalMove(state: GameState, move: Move): boolean {
  if (state.status !== 'ACTIVE') return false;
  if (move.side !== state.currentTurn) return false;
  if (move.pitIndex < 0 || move.pitIndex >= PITS_PER_SIDE) return false;
  const si = sideIndex(move.side);
  return state.board.pits[si][move.pitIndex] > 0;
}

export function getLegalMoves(state: GameState): Move[] {
  if (state.status !== 'ACTIVE') return [];
  const si = sideIndex(state.currentTurn);
  const moves: Move[] = [];
  for (let i = 0; i < PITS_PER_SIDE; i++) {
    if (state.board.pits[si][i] > 0) {
      moves.push({ side: state.currentTurn, pitIndex: i });
    }
  }
  return moves;
}

/**
 * Apply a move and return the new game state.
 * Does NOT mutate the input state.
 * Throws if the move is illegal.
 */
export function applyMove(state: GameState, move: Move): GameState {
  if (!isLegalMove(state, move)) {
    throw new Error(`Illegal move: ${JSON.stringify(move)}`);
  }

  const next = cloneState(state);
  const board = next.board;
  const si = sideIndex(move.side);
  const oi = si === SOUTH ? NORTH : SOUTH; // opponent index

  let stones = board.pits[si][move.pitIndex];
  board.pits[si][move.pitIndex] = 0;

  /**
   * Traversal sequence (counter-clockwise from SOUTH's perspective):
   * S0->S1->S2->S3->S4->S5->SS->N0->N1->N2->N3->N4->N5->(skip NS)->S0...
   *
   * We encode positions as:
   *   { side: 0|1, pit: 0..5 } or { side: 0|1, pit: 6 (= store) }
   * and advance counter-clockwise:
   *   SOUTH side: pit 0->1->2->3->4->5->store(6)
   *   NORTH side: pit 0->1->2->3->4->5->store(6) [but skip if opponent]
   * After SOUTH store -> NORTH pit 0; after NORTH store -> SOUTH pit 0
   */

  // Start position is the first position after the chosen pit
  let curSide = si;
  let curPit = move.pitIndex + 1; // +1 to start distributing after chosen pit

  let lastSide = si;
  let lastPit = move.pitIndex;

  while (stones > 0) {
    // Wrap within a side
    if (curPit > PITS_PER_SIDE) {
      // Past store: switch side
      curSide = curSide === SOUTH ? NORTH : SOUTH;
      curPit = 0;
    }

    if (curPit === PITS_PER_SIDE) {
      // This is a store
      if (curSide === oi) {
        // Skip opponent's store
        curSide = curSide === SOUTH ? NORTH : SOUTH;
        curPit = 0;
        continue;
      }
      // Own store: place a stone
      board.stores[curSide]++;
      stones--;
      lastSide = curSide;
      lastPit = PITS_PER_SIDE; // store marker
      curPit++;
    } else {
      // Regular pit
      board.pits[curSide][curPit]++;
      stones--;
      lastSide = curSide;
      lastPit = curPit;
      curPit++;
    }
  }

  // --- Extra turn check ---
  const landedInOwnStore = lastPit === PITS_PER_SIDE && lastSide === si;

  // --- Capture check ---
  // Last stone landed in own empty pit (it was 0 before we placed it, so now it's 1)
  const landedInOwnPit = lastSide === si && lastPit < PITS_PER_SIDE;
  const wasEmpty = board.pits[si][lastPit] === 1; // just placed into empty pit

  if (!landedInOwnStore && landedInOwnPit && wasEmpty) {
    const mirrorPit = PITS_PER_SIDE - 1 - lastPit;
    const opponentStones = board.pits[oi][mirrorPit];
    if (opponentStones > 0) {
      board.stores[si] += opponentStones + 1; // capture opponent + own stone
      board.pits[oi][mirrorPit] = 0;
      board.pits[si][lastPit] = 0;
    }
  }

  // --- Game-end check ---
  const southEmpty = board.pits[SOUTH].every(p => p === 0);
  const northEmpty = board.pits[NORTH].every(p => p === 0);

  if (southEmpty || northEmpty) {
    // Sweep remaining stones to opponent's store
    if (southEmpty) {
      board.stores[NORTH] += board.pits[NORTH].reduce((a, b) => a + b, 0);
      board.pits[NORTH].fill(0);
    } else {
      board.stores[SOUTH] += board.pits[SOUTH].reduce((a, b) => a + b, 0);
      board.pits[SOUTH].fill(0);
    }

    next.status = 'FINISHED';
    const ss = board.stores[SOUTH];
    const ns = board.stores[NORTH];
    next.winner = ss > ns ? 'SOUTH' : ns > ss ? 'NORTH' : 'DRAW';
  } else if (landedInOwnStore) {
    // Extra turn — same player goes again
    next.currentTurn = move.side;
  } else {
    next.currentTurn = oppositeSide(move.side);
  }

  return next;
}

// ---- Animation support ----

export interface DropPosition {
  side: 0 | 1;
  pit: number; // 0..PITS_PER_SIDE-1 = pit, PITS_PER_SIDE = store
}

export type DropKind = 'normal' | 'capture' | 'sweep';

export interface AnimationStep {
  board: Board;
  drop: DropPosition;
  kind: DropKind;
}

/**
 * Returns the sequence of board states produced by distributing stones one by one.
 * The source pit is emptied before the first step (the "pick up" moment).
 * Each step adds exactly one stone and records where it landed.
 * Capture and sweep transitions are appended as extra steps at the end.
 */
export function getMoveSteps(state: GameState, move: Move): AnimationStep[] {
  if (!isLegalMove(state, move)) return [];

  const steps: AnimationStep[] = [];
  const board = cloneBoard(state.board);
  const si = sideIndex(move.side);
  const oi = si === SOUTH ? NORTH : SOUTH;

  let stones = board.pits[si][move.pitIndex];
  board.pits[si][move.pitIndex] = 0;

  let curSide = si;
  let curPit = move.pitIndex + 1;
  let lastSide = si;
  let lastPit = move.pitIndex;

  while (stones > 0) {
    if (curPit > PITS_PER_SIDE) {
      curSide = curSide === SOUTH ? NORTH : SOUTH;
      curPit = 0;
    }

    if (curPit === PITS_PER_SIDE) {
      if (curSide === oi) {
        curSide = curSide === SOUTH ? NORTH : SOUTH;
        curPit = 0;
        continue;
      }
      board.stores[curSide]++;
      stones--;
      lastSide = curSide;
      lastPit = PITS_PER_SIDE;
      steps.push({ board: cloneBoard(board), drop: { side: curSide, pit: PITS_PER_SIDE }, kind: 'normal' });
      curPit++;
    } else {
      board.pits[curSide][curPit]++;
      stones--;
      lastSide = curSide;
      lastPit = curPit;
      steps.push({ board: cloneBoard(board), drop: { side: curSide, pit: curPit }, kind: 'normal' });
      curPit++;
    }
  }

  // Capture step
  const landedInOwnPit = lastSide === si && lastPit < PITS_PER_SIDE;
  if (landedInOwnPit && board.pits[si][lastPit] === 1) {
    const mirrorPit = PITS_PER_SIDE - 1 - lastPit;
    const opponentStones = board.pits[oi][mirrorPit];
    if (opponentStones > 0) {
      board.stores[si] += opponentStones + 1;
      board.pits[oi][mirrorPit] = 0;
      board.pits[si][lastPit] = 0;
      steps.push({ board: cloneBoard(board), drop: { side: si, pit: PITS_PER_SIDE }, kind: 'capture' });
    }
  }

  // Sweep step
  const southEmpty = board.pits[SOUTH].every(p => p === 0);
  const northEmpty = board.pits[NORTH].every(p => p === 0);
  if (southEmpty || northEmpty) {
    const sweepSide = southEmpty ? NORTH : SOUTH;
    if (southEmpty) {
      board.stores[NORTH] += board.pits[NORTH].reduce((a, b) => a + b, 0);
      board.pits[NORTH].fill(0);
    } else {
      board.stores[SOUTH] += board.pits[SOUTH].reduce((a, b) => a + b, 0);
      board.pits[SOUTH].fill(0);
    }
    steps.push({ board: cloneBoard(board), drop: { side: sweepSide, pit: PITS_PER_SIDE }, kind: 'sweep' });
  }

  return steps;
}

/** Total stones currently in play (should always equal PITS_PER_SIDE * 2 * INITIAL_STONES = 48) */
export function totalStones(board: Board): number {
  return (
    board.pits[SOUTH].reduce((a, b) => a + b, 0) +
    board.pits[NORTH].reduce((a, b) => a + b, 0) +
    board.stores[SOUTH] +
    board.stores[NORTH]
  );
}
