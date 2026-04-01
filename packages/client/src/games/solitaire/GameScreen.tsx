import React, { useEffect } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { SolitaireBoard } from './components/Board.tsx';
import { useSolitaireStore } from './store/gameStore.ts';

export function GameScreen(): React.ReactElement {
  const navigate = useNavigate();
  const gameState = useSolitaireStore(s => s.gameState);
  const newGame = useSolitaireStore(s => s.newGame);

  useEffect(() => {
    if (!gameState) void navigate({ to: '/solitaire' });
  }, [gameState, navigate]);

  if (!gameState) return <></>;

  return (
    <div className="screen game-screen theme-solitaire">
      <header className="game-header">
        <Link to="/solitaire" className="back-btn">← Menu</Link>
        <span className="mode-label">
          {gameState.moves} moves · Draw {gameState.drawMode}
        </span>
        <button
          className="back-btn"
          onClick={() => newGame(gameState.drawMode)}
          title="New game"
        >
          New
        </button>
      </header>
      <SolitaireBoard />
    </div>
  );
}
