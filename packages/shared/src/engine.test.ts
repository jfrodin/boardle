import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  applyMove,
  getLegalMoves,
  isLegalMove,
  totalStones,
  PITS_PER_SIDE,
  INITIAL_STONES,
} from './engine.js';
import type { GameState, Move } from './types.js';

const TOTAL = PITS_PER_SIDE * 2 * INITIAL_STONES; // 48

describe('createInitialState', () => {
  it('creates a valid board', () => {
    const s = createInitialState();
    expect(s.status).toBe('ACTIVE');
    expect(s.currentTurn).toBe('SOUTH');
    expect(s.board.stores).toEqual([0, 0]);
    expect(s.board.pits[0]).toEqual([4, 4, 4, 4, 4, 4]);
    expect(s.board.pits[1]).toEqual([4, 4, 4, 4, 4, 4]);
    expect(totalStones(s.board)).toBe(TOTAL);
  });
});

describe('isLegalMove', () => {
  it('rejects move from wrong side', () => {
    const s = createInitialState();
    expect(isLegalMove(s, { side: 'NORTH', pitIndex: 0 })).toBe(false);
  });
  it('rejects move from empty pit', () => {
    const s = createInitialState();
    // Manually empty a pit
    const state: GameState = {
      ...s,
      board: { ...s.board, pits: [[0, 4, 4, 4, 4, 4], [...s.board.pits[1]]] },
    };
    expect(isLegalMove(state, { side: 'SOUTH', pitIndex: 0 })).toBe(false);
  });
  it('accepts legal move', () => {
    const s = createInitialState();
    expect(isLegalMove(s, { side: 'SOUTH', pitIndex: 3 })).toBe(true);
  });
});

describe('applyMove - basic distribution', () => {
  it('distributes stones counter-clockwise', () => {
    const s = createInitialState();
    // Pick S5 (4 stones): goes to SS, N0, N1, N2
    const next = applyMove(s, { side: 'SOUTH', pitIndex: 5 });
    expect(next.board.pits[0][5]).toBe(0);
    expect(next.board.stores[0]).toBe(1); // SOUTH store gets 1
    expect(next.board.pits[1][0]).toBe(5); // N0 gets extra stone
    expect(next.board.pits[1][1]).toBe(5); // N1 gets extra stone
    expect(next.board.pits[1][2]).toBe(5); // N2 gets extra stone
    expect(totalStones(next.board)).toBe(TOTAL);
  });

  it('does not mutate input state', () => {
    const s = createInitialState();
    const original = JSON.stringify(s);
    applyMove(s, { side: 'SOUTH', pitIndex: 2 });
    expect(JSON.stringify(s)).toBe(original);
  });
});

describe('applyMove - extra turn', () => {
  it('grants extra turn when last stone lands in own store', () => {
    // S2 has 3 stones: S3, S4, S5 -> wait, we need exactly pitIndex+1 stones to reach store
    // S pit index 5 with distance to store = 1 stone needed
    // Build a state where S5 has exactly 1 stone
    const s = createInitialState();
    const state: GameState = {
      ...s,
      board: {
        pits: [[4, 4, 4, 4, 4, 1], [...s.board.pits[1]]],
        stores: [0, 0],
      },
    };
    const next = applyMove(state, { side: 'SOUTH', pitIndex: 5 });
    expect(next.currentTurn).toBe('SOUTH'); // extra turn
    expect(next.board.stores[0]).toBe(1);
    expect(totalStones(next.board)).toBe(totalStones(state.board));
  });
});

describe('applyMove - capture', () => {
  it('captures opponent stones when landing in own empty pit', () => {
    const s = createInitialState();
    // Set S0 to 0 (empty), N5 (mirror of S0) to 3
    const state: GameState = {
      ...s,
      board: {
        pits: [[0, 4, 4, 4, 4, 1], [4, 4, 4, 4, 4, 3]],
        stores: [0, 0],
      },
    };
    // S5 has 1 stone -> lands in SS? No, 1 stone from S5 -> SS (store). Not a capture.
    // We need a state where last stone lands in S0 (empty)
    // S1 has 4 stones -> S2, S3, S4, S5. Not S0.
    // We need to land in S0. Let's use NORTH's turn to set up, or build state directly.
    // Put 6 stones in S5: goes to SS, N0, N1, N2, N3, N4 — nope.
    // Better: put stones in S1 so they reach S0 by going around.
    // Actually for south: S[i] distributes to S[i+1]...S[5], SS, N[0]...N[5], S[0]...
    // For S5 with 7 stones: SS, N0, N1, N2, N3, N4, N5, S0 — last in S0!
    // But N5 mirrors S0 (PITS_PER_SIDE-1-0 = 5).
    // Actually mirror of S[pitIndex] = N[PITS_PER_SIDE-1-pitIndex]
    // mirror of S0 = N[5], mirror of S5 = N[0]

    const state2: GameState = {
      ...s,
      board: {
        pits: [[0, 4, 4, 4, 4, 7], [4, 4, 4, 4, 4, 6]],
        stores: [0, 0],
      },
    };
    // S5 with 7 stones: distributes to SS(1), N0(1), N1(1), N2(1), N3(1), N4(1), N5(1) -- 7 stones, last at N5
    // That's north side. Not a capture for south.
    // Let me think again: from S5, 8 stones would be: SS, N0, N1, N2, N3, N4, N5, (skip NS), S0
    // Last stone lands in S0 which is empty -> capture N5 stones.
    const state3: GameState = {
      ...s,
      board: {
        pits: [[0, 0, 0, 0, 0, 8], [0, 0, 0, 0, 0, 5]],
        stores: [0, 0],
      },
    };
    const next = applyMove(state3, { side: 'SOUTH', pitIndex: 5 });
    // Capture: S0 stone (1) + N5 stones (5) = 6 added to SOUTH store
    // Plus the 1 stone that went into SS during distribution
    // SS gets 1 stone during distribution.
    // N5 starts at 5, gets 1 stone during distribution (becomes 6), then S0 gets last stone.
    // Capture: S0 stone (1) + N5 stones (6) = 7 captured into SOUTH store.
    // Total SOUTH store: 1 (SS) + 7 (capture) = 8.
    expect(next.board.stores[0]).toBe(8); // SS stone + capture
    expect(next.board.pits[0][0]).toBe(0);
    expect(next.board.pits[1][5]).toBe(0);
    expect(totalStones(next.board)).toBe(totalStones(state3.board));
  });
});

describe('applyMove - game end', () => {
  it('sweeps remaining stones and declares winner', () => {
    // SOUTH has 1 stone in S0, NORTH is almost empty with 1 in N0
    const state: GameState = {
      ...createInitialState(),
      board: {
        pits: [[1, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]],
        stores: [20, 15],
      },
    };
    const next = applyMove(state, { side: 'SOUTH', pitIndex: 0 });
    expect(next.status).toBe('FINISHED');
    expect(next.board.pits[0].every(p => p === 0)).toBe(true);
    expect(next.board.pits[1].every(p => p === 0)).toBe(true);
    expect(totalStones(next.board)).toBe(totalStones(state.board));
    // SOUTH store gets the last stone: 20+1=21, NORTH has 15 -> SOUTH wins
    expect(next.winner).toBe('SOUTH');
  });
});

describe('turn alternation', () => {
  it('switches turn after normal move', () => {
    const s = createInitialState();
    // S0 has 4 stones -> distributes to S1,S2,S3,S4. Last stone at S4, not store -> switch turn.
    const next = applyMove(s, { side: 'SOUTH', pitIndex: 0 });
    expect(next.currentTurn).toBe('NORTH');
  });
});

describe('getLegalMoves', () => {
  it('returns all non-empty pits for current player', () => {
    const s = createInitialState();
    const moves = getLegalMoves(s);
    expect(moves.length).toBe(6);
    moves.forEach(m => expect(m.side).toBe('SOUTH'));
  });

  it('returns empty array when game is finished', () => {
    const s = createInitialState();
    const finished: GameState = { ...s, status: 'FINISHED', winner: 'SOUTH' };
    expect(getLegalMoves(finished)).toEqual([]);
  });
});
