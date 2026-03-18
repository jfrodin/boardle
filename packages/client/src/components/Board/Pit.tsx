import React from 'react';

interface PitProps {
  count: number;
  isPlayable: boolean;
  isOpponent: boolean;
  onClick?: () => void;
  label: string;
}

export function Pit({ count, isPlayable, isOpponent, onClick, label }: PitProps): React.ReactElement {
  const stones = Array.from({ length: Math.min(count, 48) }, (_, i) => i);

  return (
    <button
      className={[
        'pit',
        isOpponent ? 'pit--opponent' : 'pit--player',
        isPlayable ? 'pit--playable' : '',
        count === 0 ? 'pit--empty' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      disabled={!isPlayable}
      aria-label={`${label}: ${count} stone${count !== 1 ? 's' : ''}`}
      tabIndex={isPlayable ? 0 : -1}
    >
      <div className="pit-inner">
        <div className="stones-grid">
          {stones.map(i => (
            <span key={i} className="stone" aria-hidden="true" />
          ))}
        </div>
        <span className="pit-count">{count}</span>
      </div>
    </button>
  );
}
