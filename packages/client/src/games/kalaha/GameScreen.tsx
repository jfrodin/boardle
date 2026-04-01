import React, { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Board } from './components/Board/Board.tsx';
import { useGameStore } from './store/gameStore.ts';
import { useUiStore } from '../../shared/store/uiStore.ts';
import { wsService } from '../../shared/services/wsService.ts';
import type { AnimSpeed } from '../../shared/store/uiStore.ts';

const SPEEDS: { value: AnimSpeed; label: string }[] = [
  { value: 'slow',   label: '🐢' },
  { value: 'normal', label: '🚶' },
  { value: 'fast',   label: '⚡' },
];

export function GameScreen(): React.ReactElement {
  const navigate = useNavigate();
  const { mode, skill, reset, displayedState, opponentUsername } = useGameStore();
  const { animSpeed, setAnimSpeed, opponentDisconnected, reconnected, turnTimedOut } = useUiStore();

  // Guard: if no active game, redirect back to game home
  useEffect(() => {
    if (!displayedState) {
      void navigate({ to: '/kalaha' });
    }
  }, [displayedState, navigate]);

  function handleLeave(): void {
    wsService.send({ type: 'LEAVE_ROOM' });
    reset();
    sessionStorage.removeItem('kalahaRoomId');
    sessionStorage.removeItem('kalahaSide');
    void navigate({ to: '/' });
  }

  const modeLabel = mode === 'ai'
    ? `vs ${opponentUsername ?? `AI (${skill ?? 'medium'})`}`
    : `Online vs ${opponentUsername ?? 'Opponent'}`;

  if (!displayedState) return <></>;

  return (
    <div className="screen game-screen">
      <header className="game-header">
        <button className="back-btn" onClick={handleLeave} aria-label="Back to menu">
          ← Menu
        </button>
        <span className="mode-label">{modeLabel}</span>
        <div className="speed-selector" aria-label="Animation speed">
          {SPEEDS.map(s => (
            <button
              key={s.value}
              className={`speed-btn${animSpeed === s.value ? ' active' : ''}`}
              onClick={() => setAnimSpeed(s.value)}
              title={s.value.charAt(0).toUpperCase() + s.value.slice(1)}
              aria-pressed={animSpeed === s.value}
            >
              {s.label}
            </button>
          ))}
        </div>
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
      <Board />
    </div>
  );
}
