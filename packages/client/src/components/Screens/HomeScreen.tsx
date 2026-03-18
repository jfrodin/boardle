import React, { useState } from 'react';
import type { AiSkill } from '@kalaha/shared';
import { wsService } from '../../services/wsService.ts';

export function HomeScreen(): React.ReactElement {
  const [skill, setSkill] = useState<AiSkill>('medium');

  function startAiGame(): void {
    wsService.connect();
    wsService.send({ type: 'START_AI_GAME', skill });
  }

  function joinOnline(): void {
    wsService.connect();
    wsService.send({ type: 'JOIN_QUEUE' });
  }

  return (
    <div className="screen home-screen">
      <div className="home-content">
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
          <button className="primary-btn online-btn" onClick={joinOnline}>
            Find Opponent
          </button>
        </section>

        <p className="copyright">© {new Date().getFullYear()} Fredagsprinsen</p>
      </div>
    </div>
  );
}
