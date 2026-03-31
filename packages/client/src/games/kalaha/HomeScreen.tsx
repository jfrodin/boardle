import React, { useState } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import type { AiSkill } from '@boardly/shared';
import { wsService } from '../../shared/services/wsService.ts';
import { useUiStore } from '../../shared/store/uiStore.ts';
import { useAuthStore } from '../../shared/store/authStore.ts';

const ANIM_DELAY: Record<string, number> = { slow: 800, normal: 400, fast: 150 };

export function HomeScreen(): React.ReactElement {
  const navigate = useNavigate();
  const [skill, setSkill] = useState<AiSkill>('medium');
  const { animSpeed } = useUiStore();
  const { user } = useAuthStore();

  function startAiGame(): void {
    wsService.connect();
    wsService.send({ type: 'START_AI_GAME', gameId: 'kalaha', skill, animDelay: ANIM_DELAY[animSpeed] });
  }

  function joinOnline(): void {
    if (!user) {
      void navigate({ to: '/login' });
      return;
    }
    wsService.connect();
    wsService.send({ type: 'JOIN_QUEUE', gameId: 'kalaha' });
  }

  return (
    <div className="screen home-screen">
      <div className="home-content">
        <Link to="/" className="back-to-portal-btn">← All Games</Link>
        <h1 className="home-title">Kalaha</h1>
        <p className="home-subtitle">The ancient stone-and-seeds game</p>

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
          <button className="primary-btn" onClick={startAiGame}>
            Play vs AI
          </button>
        </section>

        <div className="divider">or</div>

        <section className="mode-section">
          <h2>Online Multiplayer</h2>
          <p className="mode-desc">Play against another person in real time</p>
          {user ? (
            <button className="primary-btn online-btn" onClick={joinOnline}>
              Find Opponent
            </button>
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
