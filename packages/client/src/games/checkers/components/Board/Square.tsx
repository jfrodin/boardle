import React from 'react';
import type { CheckersCell } from '@boardly/shared';

interface SquareProps {
  row: number;
  col: number;
  isDark: boolean;
  piece: CheckersCell;
  isSelected: boolean;
  isLegalTarget: boolean;
  isMustMove: boolean;
  isLastMove: boolean;
  onClick?: () => void;
}

export function Square({
  isDark,
  piece,
  isSelected,
  isLegalTarget,
  isMustMove,
  isLastMove,
  onClick,
}: SquareProps): React.ReactElement {
  const classes = [
    'checkers-square',
    isDark ? 'checkers-square--dark' : 'checkers-square--light',
    isSelected ? 'checkers-square--selected' : '',
    isLegalTarget ? 'checkers-square--target' : '',
    isMustMove ? 'checkers-square--must-move' : '',
    isLastMove && isDark ? 'checkers-square--last-move' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={classes}
      onClick={onClick}
      disabled={!onClick}
      aria-label={piece ? `${piece.color} ${piece.isKing ? 'king' : 'piece'}` : undefined}
    >
      {piece && (
        <div
          className={[
            'checkers-piece',
            `checkers-piece--${piece.color.toLowerCase()}`,
            piece.isKing ? 'checkers-piece--king' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        >
          {piece.isKing && <span className="checkers-piece-crown">♛</span>}
        </div>
      )}
      {isLegalTarget && !piece && <div className="checkers-dot" aria-hidden="true" />}
    </button>
  );
}
