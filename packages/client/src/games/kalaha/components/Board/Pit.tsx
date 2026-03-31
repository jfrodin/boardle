import React from 'react';
import type { DropKind } from '@boardly/shared';

interface PitProps {
  count: number;
  isPlayable: boolean;
  isOpponent: boolean;
  isActive: boolean;
  dropKind?: DropKind;
  onClick?: () => void;
  label: string;
}

export function Pit({
  count,
  isPlayable,
  isOpponent,
  isActive,
  dropKind,
  onClick,
  label,
}: PitProps): React.ReactElement {
  const stones = Array.from({ length: Math.min(count, 48) }, (_, i) => i);

  const className = [
    'pit',
    isOpponent ? 'pit--opponent' : 'pit--player',
    isPlayable ? 'pit--playable' : '',
    count === 0 ? 'pit--empty' : '',
    isActive ? `pit--active pit--active-${dropKind ?? 'normal'}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={className}
      onClick={onClick}
      disabled={!isPlayable}
      aria-label={`${label}: ${count} stone${count !== 1 ? 's' : ''}`}
      tabIndex={isPlayable ? 0 : -1}
    >
      <div className="pit-inner">
        <div className="stones-grid">
          {stones.map(i => (
            <span key={i} className={`stone${i === stones.length - 1 && isActive ? ' stone--new' : ''}`} aria-hidden="true" />
          ))}
        </div>
        <span className="pit-count">{count}</span>
      </div>
    </button>
  );
}
