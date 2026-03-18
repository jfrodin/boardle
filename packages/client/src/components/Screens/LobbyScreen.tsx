import React from 'react';
import { useUiStore } from '../../store/uiStore.ts';
import { wsService } from '../../services/wsService.ts';

export function LobbyScreen(): React.ReactElement {
  const setScreen = useUiStore(s => s.setScreen);

  function cancel(): void {
    wsService.send({ type: 'LEAVE_ROOM' });
    setScreen('home');
  }

  return (
    <div className="screen lobby-screen">
      <div className="lobby-content">
        <div className="spinner" aria-label="Loading" />
        <h2>Finding an opponent...</h2>
        <p>You'll be matched as soon as another player is available.</p>
        <button className="secondary-btn" onClick={cancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
