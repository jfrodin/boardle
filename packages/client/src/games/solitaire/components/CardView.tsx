import React from 'react';
import type { Card, Rank, Suit } from '../engine.ts';
import { rankLabel, suitSymbol, isRed } from '../engine.ts';

// Classic pip positions [left%, top%] within the card interior
const PIP_LAYOUT: Record<number, Array<[number, number]>> = {
  1:  [[50, 50]],
  2:  [[50, 23], [50, 77]],
  3:  [[50, 18], [50, 50], [50, 82]],
  4:  [[28, 23], [72, 23], [28, 77], [72, 77]],
  5:  [[28, 23], [72, 23], [50, 50], [28, 77], [72, 77]],
  6:  [[28, 20], [72, 20], [28, 50], [72, 50], [28, 80], [72, 80]],
  7:  [[28, 18], [72, 18], [50, 34], [28, 52], [72, 52], [28, 82], [72, 82]],
  8:  [[28, 18], [72, 18], [50, 32], [28, 50], [72, 50], [50, 68], [28, 82], [72, 82]],
  9:  [[28, 16], [72, 16], [28, 38], [72, 38], [50, 50], [28, 62], [72, 62], [28, 84], [72, 84]],
  10: [[28, 16], [72, 16], [50, 28], [28, 40], [72, 40], [28, 60], [72, 60], [50, 72], [28, 84], [72, 84]],
};

function CardPips({ suit, rank }: { suit: Suit; rank: Rank }): React.ReactElement {
  const sym = suitSymbol(suit);

  if (rank >= 11) {
    // Face card — large centered letter
    return (
      <div className="card-face-center" aria-hidden="true">
        {rankLabel(rank)}
      </div>
    );
  }

  const positions = PIP_LAYOUT[rank];

  return (
    <div className={`card-pips${rank === 1 ? ' card-pips--ace' : ''}`} aria-hidden="true">
      {positions.map(([left, top], i) => (
        <span
          key={i}
          className={`card-pip${top > 50 ? ' card-pip--inv' : ''}`}
          style={{ left: `${left}%`, top: `${top}%` }}
        >
          {sym}
        </span>
      ))}
    </div>
  );
}

interface Props {
  card?: Card | null;
  isSelected?: boolean;
  isTarget?: boolean;
  isEmpty?: boolean;
  emptyLabel?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onDragStart?: React.DragEventHandler<HTMLButtonElement>;
  onDragEnd?: React.DragEventHandler<HTMLButtonElement>;
  onDragOver?: React.DragEventHandler<HTMLButtonElement>;
  onDrop?: React.DragEventHandler<HTMLButtonElement>;
  style?: React.CSSProperties;
  className?: string;
}

export function CardView({
  card,
  isSelected = false,
  isTarget = false,
  isEmpty = false,
  emptyLabel = '',
  onClick,
  onDoubleClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  style,
  className = '',
}: Props): React.ReactElement {
  if (isEmpty) {
    return (
      <button
        className={`card card--empty${isTarget ? ' card--empty-target' : ''} ${className}`}
        style={style}
        onClick={onClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        disabled={!onClick && !onDragOver}
        aria-label={isTarget ? 'Place card here' : 'Empty slot'}
      >
        {emptyLabel}
      </button>
    );
  }

  if (!card) return <></>;

  if (!card.faceUp) {
    return (
      <button
        className={`card card--back${isTarget ? ' card--target' : ''} ${className}`}
        style={style}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        aria-label="Face-down card"
      />
    );
  }

  const red = isRed(card.suit);
  const rank = rankLabel(card.rank);
  const suit = suitSymbol(card.suit);

  return (
    <button
      className={[
        'card',
        'card--front',
        red ? 'card--red' : 'card--black',
        isSelected ? 'card--selected' : '',
        isTarget ? 'card--target' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={style}
      draggable={!!onDragStart}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      aria-label={`${rank} of ${card.suit}`}
    >
      <div className="card-corner card-corner--tl">
        <span className="card-rank">{rank}</span>
        <span className="card-suit-sm">{suit}</span>
      </div>
      <CardPips suit={card.suit} rank={card.rank} />
      <div className="card-corner card-corner--br" aria-hidden="true">
        <span className="card-rank">{rank}</span>
        <span className="card-suit-sm">{suit}</span>
      </div>
    </button>
  );
}
