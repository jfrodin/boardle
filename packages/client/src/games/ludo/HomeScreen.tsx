import React, { useState } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import type { AiSkill } from '@boardly/shared';
import { wsService } from '../../shared/services/wsService.ts';
import { useAuthStore } from '../../shared/store/authStore.ts';
import { HowToPlay } from '../../shared/components/HowToPlay.tsx';

const RULES = [
  'Roll a 6 to move a piece out of your home base onto the track.',
  'Race all four of your pieces around the board and into the goal.',
  'Landing on an opponent sends their piece back to their home base.',
  'Pieces on coloured start squares and star squares are safe from capture.',
  'Rolling a 6 earns you an extra roll. First to get all four pieces to the goal wins.',
];

export function HomeScreen(): React.ReactElement {
  const navigate = useNavigate();
  const [skill, setSkill] = useState<AiSkill>('medium');
  const { user } = useAuthStore();

  function startAiGame(): void {
    wsService.connect();
    wsService.send({ type: 'START_AI_GAME', gameId: 'ludo', skill });
  }

  function joinOnline(): void {
    if (!user) {
      void navigate({ to: '/login' });
      return;
    }
    wsService.connect();
    wsService.send({ type: 'JOIN_QUEUE', gameId: 'ludo' });
  }

  return (
    <div className="screen home-screen theme-ludo">
      <div className="home-content">
        <Link to="/" className="back-to-portal-btn">← All Games</Link>
        <h1 className="home-title">Ludo</h1>
        <HowToPlay rules={RULES} />

        <section className="mode-section">
          <h2>vs Computer</h2>
          <div className="skill-selector">
            {(['easy', 'medium', 'hard'] as AiSkill[]).map(s => (
              <button
                key={s}
                className={`skill-btn ${skill === s ? 'active' : ''}`}
                onClick={() => setSkill(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <button className="primary-btn" onClick={startAiGame}>Play vs AI</button>
        </section>

        <div className="divider">or</div>

        <section className="mode-section">
          <h2>Online Multiplayer</h2>
          <p className="mode-desc">Play against up to 3 others — empty seats filled by AI</p>
          {user ? (
            <button className="primary-btn online-btn" onClick={joinOnline}>Find Game</button>
          ) : (
            <div className="auth-required-block">
              <p className="auth-required-text">Sign in to play online</p>
              <div className="auth-required-actions">
                <Link to="/login" className="primary-btn online-btn">Sign in</Link>
                <Link to="/register" className="secondary-btn">Create account</Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
