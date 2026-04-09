import React, { useState } from 'react';
import type { PlayerSide } from '@boardly/shared';
import { ROWS, COLS } from '@boardly/shared';
import { useConnect4Store } from '../store/gameStore.ts';
import { wsService } from '../../../shared/services/wsService.ts';

function cellClass(cell: PlayerSide | null, isWinning: boolean): string {
  let cls = 'c4-cell';
  if (cell === 'SOUTH') cls += ' c4-cell--south';
  else if (cell === 'NORTH') cls += ' c4-cell--north';
  if (isWinning) cls += ' c4-cell--winning';
  return cls;
}

function getWinningCells(board: (PlayerSide | null)[][], winner: PlayerSide | 'DRAW' | null): Set<string> {
  if (!winner || winner === 'DRAW') return new Set();
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== winner) continue;
      for (const [dr, dc] of dirs) {
        const cells: string[] = [];
        for (let i = 0; i < 4; i++) {
          const nr = r + dr * i, nc = c + dc * i;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== winner) break;
          cells.push(`${nr},${nc}`);
        }
        if (cells.length === 4) return new Set(cells);
      }
    }
  }
  return new Set();
}

export function Connect4Board(): React.ReactElement {
  const { gameState, playerSide, mode, lastMove } = useConnect4Store();
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  if (!gameState || !playerSide) return <></>;

  const { board, currentTurn, status, winner } = gameState;
  const isMyTurn = status === 'ACTIVE' && currentTurn === playerSide;
  const winningCells = getWinningCells(board, winner);

  // Determine drop row for hover preview
  function getDropRow(col: number): number {
    for (let row = ROWS - 1; row >= 0; row--) {
      if (board[row][col] === null) return row;
    }
    return -1;
  }

  function handleColClick(col: number): void {
    if (!isMyTurn) return;
    wsService.send({ type: 'CONNECT4_MOVE', col });
  }

  return (
    <div className="c4-board-wrapper">
      {/* Drop zone buttons — one per column */}
      <div className="c4-drop-row" aria-label="Choose column">
        {Array.from({ length: COLS }, (_, col) => {
          const dropRow = getDropRow(col);
          const canDrop = isMyTurn && dropRow !== -1;
          return (
            <button
              key={col}
              className={`c4-drop-btn${hoverCol === col && canDrop ? ' c4-drop-btn--active' : ''}`}
              onClick={() => handleColClick(col)}
              onMouseEnter={() => setHoverCol(col)}
              onMouseLeave={() => setHoverCol(null)}
              disabled={!canDrop}
              aria-label={`Drop in column ${col + 1}`}
            >
              {hoverCol === col && canDrop ? (
                <span className={`c4-preview c4-preview--${playerSide === 'SOUTH' ? 'south' : 'north'}`} />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="c4-board" aria-label="Connect Four board">
        {board.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            const isLast = lastMove !== null && lastMove.col === cIdx &&
              rIdx === (() => {
                // find the row of the last move
                for (let r = ROWS - 1; r >= 0; r--) {
                  if (board[r][cIdx] !== null) return r;
                }
                return -1;
              })() && cell !== null;
            const key = `${rIdx},${cIdx}`;
            return (
              <div
                key={key}
                className={cellClass(cell, winningCells.has(key))}
                data-last={isLast ? '' : undefined}
              >
                <div className="c4-disc" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
