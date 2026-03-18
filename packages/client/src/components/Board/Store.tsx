import React from 'react';

interface StoreProps {
  count: number;
  label: string;
  side: 'north-store' | 'south-store';
}

export function Store({ count, label, side }: StoreProps): React.ReactElement {
  return (
    <div className={`store ${side}`} aria-label={`${label}: ${count} stones`}>
      <div className="store-label">{label}</div>
      <div className="store-count">{count}</div>
      <div className="store-stones">
        {Array.from({ length: Math.min(count, 48) }, (_, i) => (
          <span key={i} className="stone" aria-hidden="true" />
        ))}
      </div>
    </div>
  );
}
