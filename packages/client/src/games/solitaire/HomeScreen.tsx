import React, { useState } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useSolitaireStore } from './store/gameStore.ts';

export function HomeScreen(): React.ReactElement {
  const navigate = useNavigate();
  const [drawMode, setDrawMode] = useState<1 | 3>(1);
  const newGame = useSolitaireStore(s => s.newGame);

  function startGame(): void {
    newGame(drawMode);
    void navigate({ to: '/solitaire/game' });
  }

  return (
    <div className="screen home-screen theme-solitaire">
      <div className="home-content">
        <Link to="/" className="back-to-portal-btn">← All Games</Link>
        <h1 className="home-title">Solitaire</h1>

        <section className="mode-section">
          <h2>Draw mode</h2>
          <div className="skill-selector">
            {([1, 3] as const).map(d => (
              <button
                key={d}
                className={`skill-btn ${drawMode === d ? 'active' : ''}`}
                onClick={() => setDrawMode(d)}
              >
                Draw {d}
              </button>
            ))}
          </div>
          <p className="mode-desc">
            {drawMode === 1
              ? 'Flip one card at a time — easier'
              : 'Flip three cards at a time — harder'}
          </p>
          <button className="primary-btn" onClick={startGame}>
            Play
          </button>
        </section>
      </div>
    </div>
  );
}
