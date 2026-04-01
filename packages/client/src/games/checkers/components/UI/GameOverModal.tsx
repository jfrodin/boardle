import React from 'react';
import type { CheckersGameState, PlayerSide } from '@boardly/shared';
import { useCheckersStore } from '../../store/gameStore.ts';
import { wsService } from '../../../../shared/services/wsService.ts';
import { router } from '../../../../router.tsx';

interface GameOverModalProps {
  state: CheckersGameState;
  playerSide: PlayerSide;
}

export function GameOverModal({ state, playerSide }: GameOverModalProps): React.ReactElement {
  const reset = useCheckersStore(s => s.reset);
  const opponentUsername = useCheckersStore(s => s.opponentUsername);
  const mode = useCheckersStore(s => s.mode);
  const rematchRequested = useCheckersStore(s => s.rematchRequested);

  const { winner } = state;
  const opponentLabel = opponentUsername ?? 'Opponent';

  const resultText =
    winner === 'DRAW' ? "It's a draw!" : winner === playerSide ? 'You win!' : 'You lose!';
  const resultClass = winner === 'DRAW' ? 'draw' : winner === playerSide ? 'win' : 'loss';

  function handleRematch(): void {
    wsService.send({ type: 'REMATCH' });
  }

  function handleHome(): void {
    wsService.send({ type: 'LEAVE_ROOM' });
    reset();
    sessionStorage.removeItem('checkersRoomId');
    sessionStorage.removeItem('checkersSide');
    void router.navigate({ to: '/' });
  }

  // Count pieces
  let myPieces = 0;
  let theirPieces = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      if (p.color === playerSide) myPieces++;
      else theirPieces++;
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Game over">
      <div className={`modal game-over-modal result-${resultClass}`}>
        <h2 className="modal-title">{resultText}</h2>
        <div className="score-display">
          <div className="score-item">
            <span className="score-label">You</span>
            <span className="score-value">{myPieces}</span>
          </div>
          <div className="score-divider">–</div>
          <div className="score-item">
            <span className="score-label">{opponentLabel}</span>
            <span className="score-value">{theirPieces}</span>
          </div>
        </div>
        <div className="modal-actions">
          <button className="primary-btn" onClick={handleRematch}>
            {mode === 'online' && rematchRequested ? 'Accept Rematch' : 'Rematch'}
          </button>
          <button className="secondary-btn" onClick={handleHome}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
