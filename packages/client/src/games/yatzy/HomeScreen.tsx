import React, { useState } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import type { PlayerKind } from './engine.ts';
import { useYatzyStore } from './store/gameStore.ts';
import { HowToPlay } from '../../shared/components/HowToPlay.tsx';

const RULES = [
  'Each turn you get up to 3 rolls. After the first roll, hold any dice you want to keep.',
  'After rolling, choose a category on the scorecard to record your score.',
  'Upper section (1s–6s): score the sum of the matching dice. Hit 63+ to earn a +50 bonus.',
  'One Pair / Two Pairs: score the sum of the highest pair(s).',
  'Three/Four of a Kind: score the sum of those dice.',
  'Small Straight (1–5) = 15 pts. Large Straight (2–6) = 20 pts.',
  'Full House (three + two): score the sum of all five dice.',
  'Chance: score the sum of all dice — use it as a dump for a bad roll.',
  'Yatzy (five of a kind) = 50 pts.',
  'Each category can only be scored once. The player with the highest total wins.',
];

interface PlayerSetup {
  name: string;
  kind: PlayerKind;
}

const BOT_NAMES = ['Bot Alex', 'Bot Sam', 'Bot Jordan'];

export function HomeScreen(): React.ReactElement {
  const navigate = useNavigate();
  const startGame = useYatzyStore(s => s.startGame);

  const [players, setPlayers] = useState<PlayerSetup[]>([
    { name: 'You', kind: 'human' },
    { name: BOT_NAMES[0], kind: 'bot' },
  ]);

  function addPlayer(): void {
    if (players.length >= 4) return;
    const botCount = players.filter(p => p.kind === 'bot').length;
    setPlayers([...players, { name: BOT_NAMES[botCount % 3], kind: 'bot' }]);
  }

  function removePlayer(index: number): void {
    if (players.length <= 1) return;
    setPlayers(players.filter((_, i) => i !== index));
  }

  function toggleKind(index: number): void {
    setPlayers(players.map((p, i) => {
      if (i !== index) return p;
      const kind: PlayerKind = p.kind === 'human' ? 'bot' : 'human';
      const botCount = players.filter((pp, pi) => pi !== index && pp.kind === 'bot').length;
      const name = kind === 'bot' ? BOT_NAMES[botCount % 3] : `Player ${index + 1}`;
      return { ...p, kind, name };
    }));
  }

  function updateName(index: number, name: string): void {
    setPlayers(players.map((p, i) => i === index ? { ...p, name } : p));
  }

  function play(): void {
    startGame(players);
    void navigate({ to: '/yatzy/game' });
  }

  return (
    <div className="screen home-screen theme-yatzy">
      <div className="home-content">
        <Link to="/" className="back-to-portal-btn">← All Games</Link>
        <h1 className="home-title">Yatzy</h1>
        <HowToPlay rules={RULES} />

        <section className="mode-section">
          <h2>Players</h2>
          <div className="yatzy-player-list">
            {players.map((player, i) => (
              <div key={i} className="yatzy-player-row">
                <button
                  className={`yatzy-kind-btn${player.kind === 'human' ? ' active' : ''}`}
                  onClick={() => toggleKind(i)}
                  title={player.kind === 'human' ? 'Human player' : 'Bot player'}
                >
                  {player.kind === 'human' ? '👤' : '🤖'}
                </button>
                <input
                  className="yatzy-name-input"
                  value={player.name}
                  onChange={e => updateName(i, e.target.value)}
                  maxLength={16}
                  aria-label={`Player ${i + 1} name`}
                />
                {players.length > 1 && (
                  <button
                    className="yatzy-remove-btn"
                    onClick={() => removePlayer(i)}
                    aria-label={`Remove ${player.name}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {players.length < 4 && (
            <button className="secondary-btn" onClick={addPlayer}>
              + Add player
            </button>
          )}
          <button className="primary-btn" onClick={play}>
            Play
          </button>
        </section>
      </div>
    </div>
  );
}
