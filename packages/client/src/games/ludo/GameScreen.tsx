import React, { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useLudoStore } from './store/gameStore.ts';
import { wsService } from '../../shared/services/wsService.ts';
import { LudoBoard } from './components/LudoBoard.tsx';

export function LudoGameScreen(): React.ReactElement {
  const navigate = useNavigate();
  const state = useLudoStore(s => s.state);
  const reset = useLudoStore(s => s.reset);
  const leavingRef = React.useRef(false);

  useEffect(() => {
    if (!state && !leavingRef.current) {
      void navigate({ to: '/ludo' });
    }
  }, [state, navigate]);

  function handleLeave(): void {
    leavingRef.current = true;
    wsService.send({ type: 'LEAVE_ROOM' });
    reset();
    sessionStorage.removeItem('ludoRoomId');
    sessionStorage.removeItem('ludoColor');
    void navigate({ to: '/' });
  }

  if (!state) return <></>;

  return (
    <div className="screen game-screen theme-ludo">
      <header className="game-header">
        <button className="back-btn" onClick={handleLeave} aria-label="Back to menu">
          ← Menu
        </button>
        <span className="mode-label">Ludo</span>
      </header>
      <LudoBoard />
    </div>
  );
}
