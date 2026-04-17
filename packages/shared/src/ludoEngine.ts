import {
  LUDO_COLORS,
  LUDO_OFFSETS,
  LUDO_SAFE_SQUARES,
} from './ludoTypes.js';
import type { LudoColor, LudoGameState, LudoMove, LudoPiece, LudoPieces } from './ludoTypes.js';

// ---- helpers ----

function makePieces(): LudoPieces {
  return [{ relPos: -1 }, { relPos: -1 }, { relPos: -1 }, { relPos: -1 }];
}

/** Absolute track position (0-51) for a piece on the main track (relPos 0-50). */
export function absolutePos(color: LudoColor, relPos: number): number {
  return (LUDO_OFFSETS[color] + relPos) % 52;
}

function isSafe(color: LudoColor, relPos: number): boolean {
  if (relPos < 0 || relPos > 50) return true; // home or home column: always safe
  return LUDO_SAFE_SQUARES.has(absolutePos(color, relPos));
}

function cloneState(s: LudoGameState): LudoGameState {
  const pieces = {} as LudoGameState['pieces'];
  for (const c of LUDO_COLORS) {
    pieces[c] = s.pieces[c].map(p => ({ relPos: p.relPos })) as LudoPieces;
  }
  return { ...s, pieces, finished: [...s.finished] };
}

function isColorFinished(pieces: LudoPieces): boolean {
  return pieces.every(p => p.relPos === 56);
}

function nextColor(state: LudoGameState, from: LudoColor): LudoColor {
  const idx = LUDO_COLORS.indexOf(from);
  for (let i = 1; i <= 4; i++) {
    const candidate = LUDO_COLORS[(idx + i) % 4];
    if (!state.finished.includes(candidate)) return candidate;
  }
  return from;
}

// ---- public API ----

export function createInitialLudoState(
  playerNames: Record<LudoColor, string>,
  isBot: Record<LudoColor, boolean>,
): LudoGameState {
  const pieces = {} as LudoGameState['pieces'];
  for (const c of LUDO_COLORS) pieces[c] = makePieces();
  return {
    pieces,
    currentColor: 'RED',
    dice: null,
    sixCount: 0,
    status: 'ACTIVE',
    winner: null,
    playerNames,
    isBot,
    finished: [],
  };
}

/** All pieces the current player can legally move with the current dice roll. */
export function getLegalLudoMoves(state: LudoGameState): LudoMove[] {
  if (state.status !== 'ACTIVE' || state.dice === null) return [];
  const dice = state.dice;
  const color = state.currentColor;
  const moves: LudoMove[] = [];

  for (let i = 0; i < 4; i++) {
    const piece = state.pieces[color][i];
    const rel = piece.relPos;

    if (rel === -1) {
      // Can only exit home on a 6
      if (dice === 6) moves.push({ pieceIndex: i });
    } else if (rel <= 50) {
      const newRel = rel + dice;
      if (newRel <= 56) moves.push({ pieceIndex: i });
    } else if (rel <= 55) {
      // In home column
      const newRel = rel + dice;
      if (newRel <= 56) moves.push({ pieceIndex: i });
    }
    // rel === 56 means piece is done, can't move
  }
  return moves;
}

export function isLegalLudoMove(state: LudoGameState, move: LudoMove): boolean {
  return getLegalLudoMoves(state).some(m => m.pieceIndex === move.pieceIndex);
}

export function applyLudoRoll(state: LudoGameState, diceValue: number): LudoGameState {
  const next = cloneState(state);
  next.dice = diceValue;

  if (diceValue === 6) {
    next.sixCount += 1;
  } else {
    next.sixCount = 0;
  }

  // Three 6s in a row: forfeit turn
  if (next.sixCount >= 3) {
    next.dice = null;
    next.sixCount = 0;
    next.currentColor = nextColor(next, next.currentColor);
  } else {
    // Auto-skip if no legal moves
    const moves = getLegalLudoMoves(next);
    if (moves.length === 0) {
      next.dice = null;
      if (diceValue !== 6) {
        next.currentColor = nextColor(next, next.currentColor);
      }
      // On a 6 with no moves: get another roll (rare but possible)
    }
  }

  return next;
}

export function applyLudoMove(state: LudoGameState, move: LudoMove): LudoGameState {
  if (!isLegalLudoMove(state, move)) return state;

  const next = cloneState(state);
  const color = next.currentColor;
  const piece = next.pieces[color][move.pieceIndex];
  const dice = next.dice!;

  const oldRel = piece.relPos;
  const newRel = oldRel === -1 ? 0 : oldRel + dice;
  piece.relPos = newRel;

  // Capture: only possible on main track (newRel 0-50) and not on a safe square
  if (newRel >= 0 && newRel <= 50 && !isSafe(color, newRel)) {
    const absNew = absolutePos(color, newRel);
    for (const otherColor of LUDO_COLORS) {
      if (otherColor === color) continue;
      for (const otherPiece of next.pieces[otherColor]) {
        if (otherPiece.relPos >= 0 && otherPiece.relPos <= 50) {
          if (absolutePos(otherColor, otherPiece.relPos) === absNew) {
            otherPiece.relPos = -1; // send home
          }
        }
      }
    }
  }

  // Check if this color has finished
  if (isColorFinished(next.pieces[color]) && !next.finished.includes(color)) {
    next.finished.push(color);
  }

  // Win condition: only one active player remains (or all done)
  const activePlayers = LUDO_COLORS.filter(c => !next.finished.includes(c));
  if (activePlayers.length <= 1) {
    next.status = 'FINISHED';
    next.winner = next.finished[0];
  }

  next.dice = null;

  if (next.status === 'ACTIVE') {
    if (dice === 6 && next.sixCount < 3) {
      // Extra roll on 6 — stay on same color, just need to roll again
    } else {
      next.currentColor = nextColor(next, color);
    }
  }

  return next;
}
