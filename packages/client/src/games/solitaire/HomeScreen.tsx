import React, { useState } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useSolitaireStore } from './store/gameStore.ts';
import { HowToPlay } from '../../shared/components/HowToPlay.tsx';

const RULES = [
  'Deal 7 tableau columns (1–7 cards each, top card face-up). Remaining cards form the stock.',
  'Build tableau columns in descending order, alternating red and black (e.g. black 9 on red 10).',
  'Click the stock to flip cards to the waste pile. The top waste card is always playable.',
  'Move cards to the four foundation piles, building each suit from Ace up to King.',
  'An empty tableau column can only be filled with a King.',
  'You win when all 52 cards are on the foundations.',
];

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
        <HowToPlay rules={RULES} />

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
