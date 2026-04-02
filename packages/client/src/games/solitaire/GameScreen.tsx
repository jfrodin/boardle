import React, { useEffect } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { SolitaireBoard } from './components/Board.tsx';
import { useSolitaireStore } from './store/gameStore.ts';

export function GameScreen(): React.ReactElement {
  const navigate = useNavigate();
  const gameState = useSolitaireStore(s => s.gameState);
  const history = useSolitaireStore(s => s.history);
  const newGame = useSolitaireStore(s => s.newGame);
  const undo = useSolitaireStore(s => s.undo);
  const showHint = useSolitaireStore(s => s.showHint);

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
        <div className="game-header-actions">
          <button
            className="header-icon-btn"
            onClick={showHint}
            title="Hint"
            disabled={gameState.status === 'won'}
          >
            💡
          </button>
          <button
            className="header-icon-btn"
            onClick={undo}
            title="Undo"
            disabled={history.length === 0}
          >
            ↩
          </button>
          <button
            className="back-btn"
            onClick={() => newGame(gameState.drawMode)}
          >
            New
          </button>
        </div>
      </header>
      <SolitaireBoard />
    </div>
  );
}
