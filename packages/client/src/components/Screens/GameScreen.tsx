import React from 'react';
import { Board } from '../Board/Board.tsx';
import { useGameStore } from '../../store/gameStore.ts';
import { useUiStore } from '../../store/uiStore.ts';
import { wsService } from '../../services/wsService.ts';
import type { AnimSpeed } from '../../store/uiStore.ts';

const SPEEDS: { value: AnimSpeed; label: string }[] = [
  { value: 'slow',   label: '🐢' },
  { value: 'normal', label: '🚶' },
  { value: 'fast',   label: '⚡' },
];

export function GameScreen(): React.ReactElement {
  const { mode, skill, reset } = useGameStore();
  const { setScreen, animSpeed, setAnimSpeed } = useUiStore();

  function handleLeave(): void {
    wsService.send({ type: 'LEAVE_ROOM' });
    reset();
    sessionStorage.removeItem('kalahaRoomId');
    sessionStorage.removeItem('kalahaSide');
    setScreen('home');
  }

  const modeLabel = mode === 'ai' ? `vs AI (${skill ?? 'medium'})` : 'Online';

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
      <Board />
    </div>
  );
}
