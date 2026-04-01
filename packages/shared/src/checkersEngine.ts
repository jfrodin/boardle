import type {
  CheckersBoard,
  CheckersCell,
  CheckersGameState,
  CheckersMove,
  CheckersPiece,
  CheckersPosition,
} from './checkersTypes.js';

// ---- Helpers ----

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function opp(color: 'SOUTH' | 'NORTH'): 'SOUTH' | 'NORTH' {
  return color === 'SOUTH' ? 'NORTH' : 'SOUTH';
}

function cloneBoard(board: CheckersBoard): CheckersBoard {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

/** Row directions a piece can move toward (non-king) */
function rowDirs(piece: CheckersPiece): number[] {
  if (piece.isKing) return [-1, 1];
  return piece.color === 'SOUTH' ? [-1] : [1];
}

// ---- Initial state ----

export function createInitialCheckersState(): CheckersGameState {
  const board: CheckersBoard = Array.from({ length: 8 }, () => Array<CheckersCell>(8).fill(null));
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) board[r][c] = { color: 'NORTH', isKing: false };
    }
  }
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) board[r][c] = { color: 'SOUTH', isKing: false };
    }
  }
  return { board, currentTurn: 'SOUTH', status: 'ACTIVE', winner: null };
}

// ---- Legal move generation ----

interface CaptureSeq {
  path: CheckersPosition[];   // landing squares (first = immediate, last = final)
  captured: CheckersPosition[];
}

function getCaptureSeqs(
  board: CheckersBoard,
  from: CheckersPosition,
  piece: CheckersPiece,
  visitedKeys: Set<string>,
): CaptureSeq[] {
  const seqs: CaptureSeq[] = [];

  for (const dr of rowDirs(piece)) {
    for (const dc of [-1, 1]) {
      const midR = from.row + dr;
      const midC = from.col + dc;
      const toR = from.row + 2 * dr;
      const toC = from.col + 2 * dc;

      if (!inBounds(toR, toC)) continue;

      const mid = board[midR][midC];
      const to = board[toR][toC];
      const midKey = `${midR},${midC}`;

      if (mid && mid.color !== piece.color && to === null && !visitedKeys.has(midKey)) {
        const newVisited = new Set(visitedKeys);
        newVisited.add(midKey);

        // Promotion stops the multi-jump (standard English draughts rule)
        const promoted = !piece.isKing && (
          (piece.color === 'SOUTH' && toR === 0) ||
          (piece.color === 'NORTH' && toR === 7)
        );
        const movedPiece: CheckersPiece = promoted ? { ...piece, isKing: true } : piece;

        const conts = promoted ? [] : getCaptureSeqs(board, { row: toR, col: toC }, movedPiece, newVisited);

        if (conts.length === 0) {
          seqs.push({
            path: [{ row: toR, col: toC }],
            captured: [{ row: midR, col: midC }],
          });
        } else {
          for (const c of conts) {
            seqs.push({
              path: [{ row: toR, col: toC }, ...c.path],
              captured: [{ row: midR, col: midC }, ...c.captured],
            });
          }
        }
      }
    }
  }
  return seqs;
}

export function getLegalCheckersMovesForPiece(
  state: CheckersGameState,
  from: CheckersPosition,
): CheckersMove[] {
  // Delegate to the global function so forced-capture is always respected.
  // (If any piece must capture, only capture moves are returned globally — this
  //  piece may return an empty list if it cannot capture while others can.)
  return getLegalCheckersMoves(state).filter(
    m => m.from.row === from.row && m.from.col === from.col,
  );
}

export function getLegalCheckersMoves(state: CheckersGameState): CheckersMove[] {
  if (state.status !== 'ACTIVE') return [];

  const simpleMoves: CheckersMove[] = [];
  const captureMoves: CheckersMove[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (!piece || piece.color !== state.currentTurn) continue;

      const from: CheckersPosition = { row: r, col: c };
      const caps = getCaptureSeqs(state.board, from, piece, new Set());

      if (caps.length > 0) {
        for (const seq of caps) {
          captureMoves.push({
            from,
            to: seq.path[seq.path.length - 1],
            path: seq.path,
            captured: seq.captured,
          });
        }
      } else {
        for (const dr of rowDirs(piece)) {
          for (const dc of [-1, 1]) {
            const toR = r + dr;
            const toC = c + dc;
            if (inBounds(toR, toC) && state.board[toR][toC] === null) {
              simpleMoves.push({
                from,
                to: { row: toR, col: toC },
                path: [{ row: toR, col: toC }],
                captured: [],
              });
            }
          }
        }
      }
    }
  }

  // Forced capture rule: if any piece can capture, only capture moves are legal
  return captureMoves.length > 0 ? captureMoves : simpleMoves;
}

export function isLegalCheckersMove(state: CheckersGameState, move: CheckersMove): boolean {
  const legal = getLegalCheckersMoves(state);
  return legal.some(
    m =>
      m.from.row === move.from.row &&
      m.from.col === move.from.col &&
      m.to.row === move.to.row &&
      m.to.col === move.to.col &&
      m.captured.length === move.captured.length &&
      m.captured.every((cap, i) => cap.row === move.captured[i].row && cap.col === move.captured[i].col),
  );
}

// ---- Apply move ----

export function applyCheckersMove(state: CheckersGameState, move: CheckersMove): CheckersGameState {
  const board = cloneBoard(state.board);
  const piece = { ...board[move.from.row][move.from.col]! };

  board[move.from.row][move.from.col] = null;
  for (const cap of move.captured) {
    board[cap.row][cap.col] = null;
  }

  const promoted =
    !piece.isKing &&
    ((piece.color === 'SOUTH' && move.to.row === 0) ||
      (piece.color === 'NORTH' && move.to.row === 7));

  board[move.to.row][move.to.col] = promoted ? { ...piece, isKing: true } : piece;

  const nextTurn = state.currentTurn === 'SOUTH' ? 'NORTH' : 'SOUTH';
  const next: CheckersGameState = { board, currentTurn: nextTurn, status: 'ACTIVE', winner: null };

  // Check if the next player has any legal moves — if not, current player wins
  const nextMoves = getLegalCheckersMoves(next);
  if (nextMoves.length === 0) {
    return { ...next, status: 'FINISHED', winner: state.currentTurn };
  }

  return next;
}
