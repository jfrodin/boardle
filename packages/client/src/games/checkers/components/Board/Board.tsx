import React from 'react';
import type { CheckersMove, CheckersPosition } from '@boardly/shared';
import { useCheckersStore } from '../../store/gameStore.ts';
import { wsService } from '../../../../shared/services/wsService.ts';
import { Square } from './Square.tsx';
import { GameOverModal } from '../UI/GameOverModal.tsx';
import { TurnIndicator } from '../UI/TurnIndicator.tsx';

export function CheckersBoard(): React.ReactElement {
  const {
    displayedState,
    playerSide,
    selectedSquare,
    legalMovesForSelected,
    allLegalMoves,
    lastMove,
    selectSquare,
  } = useCheckersStore();

  if (!displayedState || !playerSide) return <div className="board-loading">Loading...</div>;

  const isMyTurn = displayedState.currentTurn === playerSide && displayedState.status === 'ACTIVE';

  // Flip board for NORTH player so their pieces appear at bottom
  const flip = playerSide === 'NORTH';

  // Sets for quick lookup
  const legalToSet = new Set(legalMovesForSelected.map(m => `${m.to.row},${m.to.col}`));
  const mustMoveFromSet = new Set(allLegalMoves.map(m => `${m.from.row},${m.from.col}`));
  const lastMoveSquares = lastMove
    ? new Set([
        `${lastMove.from.row},${lastMove.from.col}`,
        `${lastMove.to.row},${lastMove.to.col}`,
        ...lastMove.captured.map(c => `${c.row},${c.col}`),
      ])
    : new Set<string>();

  function handleSquareClick(dataRow: number, dataCol: number): void {
    if (!isMyTurn) return;

    const clickedKey = `${dataRow},${dataCol}`;
    const piece = displayedState!.board[dataRow][dataCol];

    // Clicking a legal landing square — make the move
    if (selectedSquare && legalToSet.has(clickedKey)) {
      const move = legalMovesForSelected.find(
        m => m.to.row === dataRow && m.to.col === dataCol,
      );
      if (move) {
        wsService.send({ type: 'CHECKERS_MOVE', move });
        selectSquare(null);
        return;
      }
    }

    // Clicking own piece — select it
    if (piece && piece.color === playerSide) {
      if (selectedSquare?.row === dataRow && selectedSquare?.col === dataCol) {
        selectSquare(null); // deselect
      } else {
        selectSquare({ row: dataRow, col: dataCol });
      }
      return;
    }

    // Clicking empty/opponent square without a valid move — deselect
    selectSquare(null);
  }

  const rows = Array.from({ length: 8 }, (_, i) => (flip ? 7 - i : i));
  const cols = Array.from({ length: 8 }, (_, i) => (flip ? 7 - i : i));

  return (
    <div className="checkers-game-wrapper">
      <TurnIndicator currentTurn={displayedState.currentTurn} playerSide={playerSide} />

      <div className="checkers-board" aria-label="Checkers board">
        {rows.map(r =>
          cols.map(c => {
            const isDark = (r + c) % 2 === 1;
            const piece = displayedState.board[r][c];
            const key = `${r},${c}`;
            const isSelected = selectedSquare?.row === r && selectedSquare?.col === c;
            const isLegalTarget = isDark && legalToSet.has(key);
            const isMustMove = isDark && isMyTurn && mustMoveFromSet.has(key) && !selectedSquare;
            const isLastMove = lastMoveSquares.has(key);

            return (
              <Square
                key={key}
                row={r}
                col={c}
                isDark={isDark}
                piece={piece}
                isSelected={isSelected}
                isLegalTarget={isLegalTarget}
                isMustMove={isMustMove}
                isLastMove={isLastMove}
                onClick={isDark ? () => handleSquareClick(r, c) : undefined}
              />
            );
          }),
        )}
      </div>

      {displayedState.status === 'FINISHED' && (
        <GameOverModal state={displayedState} playerSide={playerSide} />
      )}
    </div>
  );
}
