import React, { useState } from 'react';
import type { PlayerSide } from '@boardly/shared';
import type { Connect4GameState } from '@boardly/shared';
import { useConnect4Store } from '../store/gameStore.ts';
import { wsService } from '../../../shared/services/wsService.ts';
import { router } from '../../../router.tsx';

interface Props {
  state: Connect4GameState;
  playerSide: PlayerSide;
}

export function Connect4GameOverModal({ state, playerSide }: Props): React.ReactElement {
  const reset = useConnect4Store(s => s.reset);
  const opponentUsername = useConnect4Store(s => s.opponentUsername);
  const mode = useConnect4Store(s => s.mode);
  const rematchRequested = useConnect4Store(s => s.rematchRequested);
  const [rematchSent, setRematchSent] = useState(false);

  const { winner } = state;
  const resultText = winner === 'DRAW' ? "It's a draw!" : winner === playerSide ? 'You win!' : 'You lose!';
  const resultClass = winner === 'DRAW' ? 'draw' : winner === playerSide ? 'win' : 'loss';
  const emoji = winner === 'DRAW' ? '🤝' : winner === playerSide ? '🏆' : '💀';
  const opponentLabel = opponentUsername ?? 'Opponent';

  function handleRematch(): void {
    wsService.send({ type: 'REMATCH' });
    setRematchSent(true);
  }

  function handleHome(): void {
    wsService.send({ type: 'LEAVE_ROOM' });
    sessionStorage.removeItem('connect4RoomId');
    sessionStorage.removeItem('connect4Side');
    void router.navigate({ to: '/' }).then(() => reset());
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Game over">
      <div className={`modal game-over-modal result-${resultClass}`}>
        <div className="modal-emoji">{emoji}</div>
        <h2 className="modal-title">{resultText}</h2>
        <p className="c4-gameover-opponent">{opponentLabel}</p>
        <div className="modal-actions">
          <button className="primary-btn" onClick={handleRematch} disabled={rematchSent && !rematchRequested}>
            {mode === 'online' && rematchRequested ? 'Accept Rematch' : 'Rematch'}
          </button>
          {mode === 'online' && rematchSent && !rematchRequested && (
            <p className="rematch-hint">Waiting for opponent...</p>
          )}
          <button className="secondary-btn" onClick={handleHome}>Main Menu</button>
        </div>
      </div>
    </div>
  );
}
