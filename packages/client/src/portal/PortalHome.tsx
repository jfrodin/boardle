import React from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useAuthStore } from '../shared/store/authStore.ts';

interface GameCard {
  id: string;
  title: string;
  description: string;
  players: string;
  emoji: string;
  available: boolean;
  path: string;
}

const GAMES: GameCard[] = [
  {
    id: 'kalaha',
    title: 'Mancala (Kalaha)',
    description: "Classic stone-sowing strategy. Capture your opponent's seeds and fill your store.",
    players: '1–2 players',
    emoji: '🪨',
    available: true,
    path: '/kalaha',
  },
  {
    id: 'yatzy',
    title: 'Yatzy',
    description: 'Roll five dice and score combinations. Luck meets strategy.',
    players: '1–4 players',
    emoji: '🎲',
    available: true,
    path: '/yatzy',
  },
  {
    id: 'connect4',
    title: 'Connect Four',
    description: 'Drop discs and line up four in a row before your opponent.',
    players: '1–2 players',
    emoji: '🔴',
    available: false,
    path: '/connect4',
  },
  {
    id: 'solitaire',
    title: 'Solitaire',
    description: 'The classic card patience game. Clear the tableau, one move at a time.',
    players: '1 player',
    emoji: '🃏',
    available: true,
    path: '/solitaire',
  },
  {
    id: 'backgammon',
    title: 'Backgammon',
    description: 'Race your pieces home while blocking your opponent. Dice and strategy.',
    players: '1–2 players',
    emoji: '🎯',
    available: false,
    path: '/backgammon',
  },
  {
    id: 'checkers',
    title: 'Checkers',
    description: 'Jump over your opponent\'s pieces and king your way to victory.',
    players: '1–2 players',
    emoji: '⚫',
    available: true,
    path: '/checkers',
  },
];

export function PortalHome(): React.ReactElement {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  return (
    <div className="screen portal-screen">
      <div className="portal-content">
        <header className="portal-header">
          <h1 className="portal-title">Boardle</h1>
          <p className="portal-subtitle">Classic board games, online & vs AI</p>

          <div className="portal-auth-bar">
            {user ? (
              <>
                <span className="portal-username">{user.username}</span>
                <button className="secondary-btn portal-auth-btn" onClick={logout}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="secondary-btn portal-auth-btn">Sign in</Link>
                <Link to="/register" className="primary-btn portal-auth-btn">Create account</Link>
              </>
            )}
          </div>
        </header>

        <div className="game-grid">
          {GAMES.map(game => (
            <div
              key={game.id}
              data-game={game.id}
              className={`game-card${game.available ? ' game-card--available' : ' game-card--soon'}`}
              onClick={() => game.available && void navigate({ to: game.path as '/' })}
              role={game.available ? 'button' : undefined}
              tabIndex={game.available ? 0 : undefined}
              onKeyDown={e => {
                if (game.available && (e.key === 'Enter' || e.key === ' ')) {
                  void navigate({ to: game.path as '/' });
                }
              }}
            >
              <div className="game-card-emoji">{game.emoji}</div>
              <div className="game-card-body">
                <h2 className="game-card-title">{game.title}</h2>
                <p className="game-card-desc">{game.description}</p>
                <span className="game-card-meta">{game.players}</span>
              </div>
              {!game.available && <div className="game-card-badge">Soon</div>}
            </div>
          ))}
        </div>

        <footer className="portal-footer">
          <span className="copyright">© {new Date().getFullYear()} Boardle.se &mdash; made with ♟️ by Fredagsprinsen</span>
          <a
            href="mailto:bugs.boardle@gmail.com?subject=Bug%20report%20%E2%80%94%20Boardle&body=What%20happened%3A%0A%0AWhat%20I%20expected%3A%0A%0ABrowser%2FDevice%3A"
            className="bug-report-link"
          >
            Report a bug
          </a>
        </footer>
      </div>
    </div>
  );
}
