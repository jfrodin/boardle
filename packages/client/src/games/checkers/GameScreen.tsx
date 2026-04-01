import React, { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { CheckersBoard } from './components/Board/Board.tsx';
import { useCheckersStore } from './store/gameStore.ts';
import { useUiStore } from '../../shared/store/uiStore.ts';
import { wsService } from '../../shared/services/wsService.ts';

export function GameScreen(): React.ReactElement {
  const navigate = useNavigate();
  const mode = useCheckersStore(s => s.mode);
  const skill = useCheckersStore(s => s.skill);
  const reset = useCheckersStore(s => s.reset);
  const displayedState = useCheckersStore(s => s.displayedState);
  const opponentUsername = useCheckersStore(s => s.opponentUsername);
  const { opponentDisconnected, reconnected, turnTimedOut } = useUiStore();
  const leavingRef = React.useRef(false);

  useEffect(() => {
    if (!displayedState && !leavingRef.current) {
      void navigate({ to: '/checkers' });
    }
  }, [displayedState, navigate]);

  function handleLeave(): void {
    leavingRef.current = true;
    wsService.send({ type: 'LEAVE_ROOM' });
    reset();
    sessionStorage.removeItem('checkersRoomId');
    sessionStorage.removeItem('checkersSide');
    void navigate({ to: '/' });
  }

  const modeLabel = mode === 'ai'
    ? `vs ${opponentUsername ?? `AI (${skill ?? 'medium'})`}`
    : `Online vs ${opponentUsername ?? 'Opponent'}`;

  if (!displayedState) return <></>;

  return (
    <div className="screen game-screen theme-checkers">
      <header className="game-header">
        <button className="back-btn" onClick={handleLeave} aria-label="Back to menu">
          ← Menu
        </button>
        <span className="mode-label">{modeLabel}</span>
      </header>
      {reconnected && (
        <div className="status-banner status-banner--reconnected" role="status">
          Reconnected
        </div>
      )}
      {opponentDisconnected && (
        <div className="status-banner status-banner--disconnected" role="status">
          Opponent disconnected — waiting for them to return…
        </div>
      )}
      {turnTimedOut && (
        <div className="status-banner status-banner--timeout" role="status">
          Time's up — turn timed out!
        </div>
      )}
      <CheckersBoard />
    </div>
  );
}
