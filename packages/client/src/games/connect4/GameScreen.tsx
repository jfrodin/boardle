import React, { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useConnect4Store } from './store/gameStore.ts';
import { useUiStore } from '../../shared/store/uiStore.ts';
import { wsService } from '../../shared/services/wsService.ts';
import { Connect4Board } from './components/Board.tsx';
import { Connect4GameOverModal } from './components/GameOverModal.tsx';
import { useConnect4ServerMessages } from './hooks/useServerMessages.ts';

export function Connect4GameScreen(): React.ReactElement {
  const navigate = useNavigate();
  const { gameState, playerSide, mode, skill, opponentUsername, reset } = useConnect4Store();
  const { opponentDisconnected, reconnected } = useUiStore();

  useConnect4ServerMessages();

  useEffect(() => {
    if (!gameState) void navigate({ to: '/connect4' });
  }, [gameState, navigate]);

  function handleLeave(): void {
    wsService.send({ type: 'LEAVE_ROOM' });
    sessionStorage.removeItem('connect4RoomId');
    sessionStorage.removeItem('connect4Side');
    void navigate({ to: '/' }).then(() => reset());
  }

  if (!gameState || !playerSide) return <></>;

  const modeLabel = mode === 'ai'
    ? `vs ${opponentUsername ?? `AI (${skill ?? 'medium'})`}`
    : `Online vs ${opponentUsername ?? 'Opponent'}`;

  const turnLabel = gameState.status === 'ACTIVE'
    ? (gameState.currentTurn === playerSide ? 'Your turn' : "Opponent's turn")
    : '';

  return (
    <div className="screen game-screen theme-connect4">
      <header className="game-header">
        <button className="back-btn" onClick={handleLeave} aria-label="Back to menu">← Menu</button>
        <span className="mode-label">{modeLabel}</span>
        <span className="c4-turn-label">{turnLabel}</span>
      </header>

      {reconnected && (
        <div className="status-banner status-banner--reconnected" role="status">Reconnected</div>
      )}
      {opponentDisconnected && (
        <div className="status-banner status-banner--disconnected" role="status">
          Opponent disconnected — waiting for them to return…
        </div>
      )}

      <Connect4Board />

      {gameState.status === 'FINISHED' && (
        <Connect4GameOverModal state={gameState} playerSide={playerSide} />
      )}
    </div>
  );
}
