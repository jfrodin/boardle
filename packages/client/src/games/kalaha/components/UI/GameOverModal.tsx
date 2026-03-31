import React from 'react';
import type { GameState, PlayerSide } from '@boardly/shared';
import { useGameStore } from '../../store/gameStore.ts';
import { wsService } from '../../../../shared/services/wsService.ts';
import { router } from '../../../../router.tsx';

interface GameOverModalProps {
  state: GameState;
  playerSide: PlayerSide;
}

export function GameOverModal({ state, playerSide }: GameOverModalProps): React.ReactElement {
  const reset = useGameStore(s => s.reset);

  const { winner, board } = state;
  const si = playerSide === 'SOUTH' ? 0 : 1;
  const oi = si === 0 ? 1 : 0;
  const myScore = board.stores[si];
  const theirScore = board.stores[oi];

  const resultText =
    winner === 'DRAW'
      ? "It's a draw!"
      : winner === playerSide
      ? 'You win!'
      : 'You lose!';

  const resultClass =
    winner === 'DRAW' ? 'draw' : winner === playerSide ? 'win' : 'loss';

  function handleRematch(): void {
    wsService.send({ type: 'REMATCH' });
  }

  function handleHome(): void {
    wsService.send({ type: 'LEAVE_ROOM' });
    reset();
    sessionStorage.removeItem('kalahaRoomId');
    sessionStorage.removeItem('kalahaSide');
    void router.navigate({ to: '/' });
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Game over">
      <div className={`modal game-over-modal result-${resultClass}`}>
        <h2 className="modal-title">{resultText}</h2>
        <div className="score-display">
          <div className="score-item">
            <span className="score-label">You</span>
            <span className="score-value">{myScore}</span>
          </div>
          <div className="score-divider">–</div>
          <div className="score-item">
            <span className="score-label">Opponent</span>
            <span className="score-value">{theirScore}</span>
          </div>
        </div>
        <div className="modal-actions">
          <button className="primary-btn" onClick={handleRematch}>
            Rematch
          </button>
          <button className="secondary-btn" onClick={handleHome}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
