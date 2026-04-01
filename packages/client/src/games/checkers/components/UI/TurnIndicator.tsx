import React from 'react';
import type { PlayerSide } from '@boardly/shared';

interface TurnIndicatorProps {
  currentTurn: PlayerSide;
  playerSide: PlayerSide;
}

export function TurnIndicator({ currentTurn, playerSide }: TurnIndicatorProps): React.ReactElement {
  const isMyTurn = currentTurn === playerSide;
  return (
    <div className={`turn-indicator ${isMyTurn ? 'turn-indicator--yours' : 'turn-indicator--theirs'}`}>
      <div className="turn-dot" />
      {isMyTurn ? 'Your turn' : "Opponent's turn"}
    </div>
  );
}
