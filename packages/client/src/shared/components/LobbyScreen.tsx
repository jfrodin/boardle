import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { wsService } from '../services/wsService.ts';

const LOBBY_TIMEOUT_MS = 120_000; // 2 minutes

export function LobbyScreen(): React.ReactElement {
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), LOBBY_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  function cancel(): void {
    wsService.send({ type: 'LEAVE_ROOM' });
    void navigate({ to: '/kalaha' });
  }

  if (timedOut) {
    return (
      <div className="screen lobby-screen">
        <div className="lobby-content">
          <h2>No opponents found</h2>
          <p>Nobody is available right now. Try again later or play against the AI.</p>
          <button className="primary-btn" onClick={cancel}>
            Back
          </button>
        </div>
      </div>
    );
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
