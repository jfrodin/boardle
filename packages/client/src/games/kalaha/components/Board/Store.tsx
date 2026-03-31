import React from 'react';
import type { DropKind } from '@boardly/shared';

interface StoreProps {
  count: number;
  label: string;
  side: 'north-store' | 'south-store';
  isActive: boolean;
  dropKind?: DropKind;
}

export function Store({ count, label, side, isActive, dropKind }: StoreProps): React.ReactElement {
  const className = [
    'store',
    side,
    isActive ? `store--active store--active-${dropKind ?? 'normal'}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} aria-label={`${label}: ${count} stones`}>
      <div className="store-label">{label}</div>
      <div className="store-count">{count}</div>
      <div className="store-stones">
        {Array.from({ length: Math.min(count, 48) }, (_, i) => (
          <span
            key={i}
            className={`stone${i === count - 1 && isActive ? ' stone--new' : ''}`}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
