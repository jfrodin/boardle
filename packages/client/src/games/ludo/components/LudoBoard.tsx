import React from 'react';
import type { LudoColor, LudoGameState } from '@boardly/shared';
import { absolutePos, LUDO_SAFE_SQUARES, LUDO_COLORS } from '@boardly/shared';
import { useLudoStore } from '../store/gameStore.ts';
import { wsService } from '../../../shared/services/wsService.ts';

// ---- board geometry ----
// Standard Ludo: 15×15 grid of cells.
// Main track cells mapped to grid coordinates (col, row), 0-indexed.

const TRACK_CELLS: [number, number][] = [
  // Bottom-left area going right (row 14→6 or col 0→14)
  // We map absolute positions 0-51 to grid positions.
  // Standard layout (clockwise from RED start at bottom-left):
  [6,14],[6,13],[6,12],[6,11],[6,10],  // 0-4  RED column going up
  [6,9],                                // 5    left of center row
  [5,8],[4,8],[3,8],[2,8],[1,8],[0,8], // 6-11 top-left going left
  [0,7],[0,6],                         // 12-13
  [1,6],[2,6],[3,6],[4,6],[5,6],       // 14-18 GREEN column going right
  [6,5],                                // 19
  [6,4],[6,3],[6,2],[6,1],[6,0],       // 20-24 going up
  [7,0],                                // 25
  [8,0],[8,1],[8,2],[8,3],[8,4],       // 26-30 YELLOW column going down
  [8,5],                                // 31
  [9,6],[10,6],[11,6],[12,6],[13,6],[14,6], // 32-37 going right
  [14,7],[14,8],                        // 38-39
  [13,8],[12,8],[11,8],[10,8],[9,8],   // 40-44 BLUE column going left
  [8,9],                                // 45
  [8,10],[8,11],[8,12],[8,13],[8,14],  // 46-50 going down
  [7,14],                               // 51 = entry to RED home column
];

// Home column cells per color (relative pos 51-55, then goal at center)
const HOME_COL_CELLS: Record<LudoColor, [number, number][]> = {
  RED:    [[7,13],[7,12],[7,11],[7,10],[7,9]],
  GREEN:  [[1,7],[2,7],[3,7],[4,7],[5,7]],
  YELLOW: [[7,1],[7,2],[7,3],[7,4],[7,5]],
  BLUE:   [[13,7],[12,7],[11,7],[10,7],[9,7]],
};

// Home base cell positions per color
const HOME_BASE_CELLS: Record<LudoColor, [number, number][]> = {
  RED:    [[1,11],[2,11],[1,12],[2,12]],
  GREEN:  [[1,2],[2,2],[1,3],[2,3]],
  YELLOW: [[11,2],[12,2],[11,3],[12,3]],
  BLUE:   [[11,11],[12,11],[11,12],[12,12]],
};

const COLOR_HEX: Record<LudoColor, string> = {
  RED: '#ef4444',
  GREEN: '#22c55e',
  YELLOW: '#eab308',
  BLUE: '#3b82f6',
};

const COLOR_LIGHT: Record<LudoColor, string> = {
  RED: '#fecaca',
  GREEN: '#bbf7d0',
  YELLOW: '#fef08a',
  BLUE: '#bfdbfe',
};

function cellKey(col: number, row: number): string { return `${col},${row}`; }

export function LudoBoard(): React.ReactElement {
  const state = useLudoStore(s => s.state);
  const myColor = useLudoStore(s => s.myColor);
  const legalPieceIndices = useLudoStore(s => s.legalPieceIndices);

  if (!state) return <></>;

  const isMyTurn = state.currentColor === myColor;
  const needsRoll = state.dice === null && isMyTurn && !state.isBot[state.currentColor];

  function handleRoll(): void {
    if (!needsRoll) return;
    wsService.send({ type: 'LUDO_ROLL' });
  }

  function handlePieceClick(color: LudoColor, pieceIdx: number): void {
    if (color !== myColor) return;
    if (!legalPieceIndices.includes(pieceIdx)) return;
    wsService.send({ type: 'LUDO_MOVE', pieceIndex: pieceIdx });
  }

  // Build a lookup: "col,row" → pieces on that cell
  const cellPieces: Map<string, { color: LudoColor; pieceIdx: number }[]> = new Map();

  for (const color of LUDO_COLORS) {
    for (let i = 0; i < 4; i++) {
      const rel = state.pieces[color][i].relPos;
      let cell: [number, number] | null = null;

      if (rel === -1) {
        cell = HOME_BASE_CELLS[color][i];
      } else if (rel >= 0 && rel <= 50) {
        cell = TRACK_CELLS[absolutePos(color, rel)];
      } else if (rel >= 51 && rel <= 55) {
        cell = HOME_COL_CELLS[color][rel - 51];
      }
      // rel === 56 = goal center, skip for now

      if (cell) {
        const key = cellKey(...cell);
        if (!cellPieces.has(key)) cellPieces.set(key, []);
        cellPieces.get(key)!.push({ color, pieceIdx: i });
      }
    }
  }

  const CELL_SIZE = 40;
  const GRID = 15;
  const SIZE = GRID * CELL_SIZE;

  return (
    <div className="ludo-board-wrapper">
      <svg
        className="ludo-board"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ width: '100%', maxWidth: 600, display: 'block', margin: '0 auto' }}
      >
        {/* Background */}
        <rect width={SIZE} height={SIZE} fill="#1a1a2e" rx={8} />

        {/* Home base zones */}
        {(Object.entries(HOME_BASE_CELLS) as [LudoColor, [number,number][]][]).map(([color, cells]) => {
          const minCol = Math.min(...cells.map(c => c[0]));
          const minRow = Math.min(...cells.map(c => c[1]));
          return (
            <rect
              key={color}
              x={minCol * CELL_SIZE}
              y={minRow * CELL_SIZE}
              width={2 * CELL_SIZE}
              height={2 * CELL_SIZE}
              fill={COLOR_LIGHT[color]}
              opacity={0.3}
              rx={4}
            />
          );
        })}

        {/* Goal center */}
        <polygon
          points={`${7*CELL_SIZE},${7*CELL_SIZE} ${8*CELL_SIZE},${7*CELL_SIZE} ${8*CELL_SIZE},${8*CELL_SIZE} ${7*CELL_SIZE},${8*CELL_SIZE}`}
          fill="#e5e7eb"
          opacity={0.2}
        />

        {/* Track cells */}
        {TRACK_CELLS.map(([col, row], absPos) => {
          const isSafe = LUDO_SAFE_SQUARES.has(absPos);
          return (
            <rect
              key={absPos}
              x={col * CELL_SIZE + 1}
              y={row * CELL_SIZE + 1}
              width={CELL_SIZE - 2}
              height={CELL_SIZE - 2}
              fill={isSafe ? '#374151' : '#1f2937'}
              stroke="#374151"
              strokeWidth={1}
              rx={2}
            />
          );
        })}

        {/* Home column cells */}
        {(Object.entries(HOME_COL_CELLS) as [LudoColor, [number,number][]][]).map(([color, cells]) =>
          cells.map(([col, row], i) => (
            <rect
              key={`${color}-hc-${i}`}
              x={col * CELL_SIZE + 1}
              y={row * CELL_SIZE + 1}
              width={CELL_SIZE - 2}
              height={CELL_SIZE - 2}
              fill={COLOR_HEX[color]}
              opacity={0.25}
              stroke={COLOR_HEX[color]}
              strokeWidth={1}
              rx={2}
            />
          ))
        )}

        {/* Pieces */}
        {(Object.entries(cellPieces) as [string, { color: LudoColor; pieceIdx: number }[]][]).map(([key, pieces]) => {
          const [col, row] = key.split(',').map(Number);
          return pieces.map(({ color, pieceIdx }, stackIdx) => {
            const isLegal = color === myColor && legalPieceIndices.includes(pieceIdx);
            const offsetX = (stackIdx % 2) * 10 - 5;
            const offsetY = Math.floor(stackIdx / 2) * 10 - 5;
            const cx = col * CELL_SIZE + CELL_SIZE / 2 + offsetX;
            const cy = row * CELL_SIZE + CELL_SIZE / 2 + offsetY;
            return (
              <g
                key={`${color}-${pieceIdx}`}
                onClick={() => handlePieceClick(color, pieceIdx)}
                style={{ cursor: isLegal ? 'pointer' : 'default' }}
              >
                <circle
                  cx={cx} cy={cy} r={isLegal ? 10 : 8}
                  fill={COLOR_HEX[color]}
                  stroke={isLegal ? '#fff' : '#00000066'}
                  strokeWidth={isLegal ? 2.5 : 1}
                  opacity={0.95}
                />
                <text
                  x={cx} y={cy + 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#fff"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {pieceIdx + 1}
                </text>
              </g>
            );
          });
        })}

        {/* Goal pieces (rel === 56) */}
        {LUDO_COLORS.map(color =>
          state.pieces[color]
            .map((p, i) => ({ p, i }))
            .filter(({ p }) => p.relPos === 56)
            .map(({ i }, stackIdx) => (
              <circle
                key={`goal-${color}-${i}`}
                cx={7.5 * CELL_SIZE + (stackIdx % 2) * 10 - 5}
                cy={7.5 * CELL_SIZE + Math.floor(stackIdx / 2) * 10 - 5}
                r={7}
                fill={COLOR_HEX[color]}
                opacity={0.85}
              />
            ))
        )}
      </svg>

      {/* Controls */}
      <div className="ludo-controls">
        {isMyTurn && state.status === 'ACTIVE' && (
          <div className="ludo-turn-info">
            {state.dice === null ? (
              <button className="primary-btn ludo-roll-btn" onClick={handleRoll}>
                🎲 Roll
              </button>
            ) : (
              <div className="ludo-dice-result">
                Rolled: <strong>{state.dice}</strong>
                {legalPieceIndices.length === 0 && <span> — no moves, skipping…</span>}
                {legalPieceIndices.length > 0 && <span> — pick a piece</span>}
              </div>
            )}
          </div>
        )}
        {!isMyTurn && state.status === 'ACTIVE' && (
          <div className="ludo-waiting">
            {state.playerNames[state.currentColor]}'s turn
            {state.dice !== null && <span> — rolled {state.dice}</span>}
          </div>
        )}
        {state.status === 'FINISHED' && state.winner && (
          <div className="ludo-winner">
            🏆 {state.playerNames[state.winner]} wins!
          </div>
        )}
      </div>

      {/* Player status */}
      <div className="ludo-players">
        {LUDO_COLORS.map(color => {
          const pieces = state.pieces[color];
          const inGoal = pieces.filter(p => p.relPos === 56).length;
          const onBoard = pieces.filter(p => p.relPos >= 0 && p.relPos < 56).length;
          const inHome = pieces.filter(p => p.relPos === -1).length;
          const isActive = state.currentColor === color;
          const isFinished = state.finished.includes(color);
          return (
            <div
              key={color}
              className={`ludo-player ${isActive ? 'ludo-player--active' : ''} ${isFinished ? 'ludo-player--finished' : ''}`}
              style={{ borderColor: isActive ? COLOR_HEX[color] : 'transparent' }}
            >
              <span className="ludo-player-dot" style={{ background: COLOR_HEX[color] }} />
              <span className="ludo-player-name">
                {state.playerNames[color]}
                {state.isBot[color] && ' 🤖'}
                {color === myColor && ' (you)'}
              </span>
              <span className="ludo-player-pieces">
                {'●'.repeat(inGoal)}{'○'.repeat(onBoard)}{'·'.repeat(inHome)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
