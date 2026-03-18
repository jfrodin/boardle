import React from 'react';
import type { PlayerSide } from '@kalaha/shared';

interface TurnIndicatorProps {
  currentTurn: PlayerSide;
  playerSide: PlayerSide;
  isAnimating: boolean;
}

export function TurnIndicator({ currentTurn, playerSide, isAnimating }: TurnIndicatorProps): React.ReactElement {
  const isMyTurn = currentTurn === playerSide;
  const label = isAnimating ? 'Moving...' : isMyTurn ? 'Your turn' : "Opponent's turn";

  return (
    <div className={`turn-indicator ${isMyTurn && !isAnimating ? 'turn-indicator--yours' : 'turn-indicator--theirs'}`}>
      <div className={`turn-dot ${isAnimating ? 'turn-dot--animating' : ''}`} />
      <span>{label}</span>
    </div>
  );
}
