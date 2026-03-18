import React from 'react';
import { Board } from '../Board/Board.tsx';
import { useGameStore } from '../../store/gameStore.ts';
import { useUiStore } from '../../store/uiStore.ts';
import { wsService } from '../../services/wsService.ts';

export function GameScreen(): React.ReactElement {
  const { mode, skill, reset } = useGameStore();
  const setScreen = useUiStore(s => s.setScreen);

  function handleLeave(): void {
    wsService.send({ type: 'LEAVE_ROOM' });
    reset();
    sessionStorage.removeItem('kalahaRoomId');
    sessionStorage.removeItem('kalahaSide');
    setScreen('home');
  }

  const modeLabel =
    mode === 'ai'
      ? `vs AI (${skill ?? 'medium'})`
      : 'Online Multiplayer';

  return (
    <div className="screen game-screen">
      <header className="game-header">
        <button className="back-btn" onClick={handleLeave} aria-label="Back to menu">
          ← Menu
        </button>
        <span className="mode-label">{modeLabel}</span>
      </header>
      <Board />
    </div>
  );
}
