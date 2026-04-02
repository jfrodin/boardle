import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useYatzyStore } from './store/gameStore.ts';
import { DiceArea } from './components/DiceArea.tsx';
import { ScoreCard } from './components/ScoreCard.tsx';
import { totalScore } from './engine.ts';

export function GameScreen(): React.ReactElement {
  const navigate = useNavigate();
  const gameState = useYatzyStore(s => s.gameState);
  const botThinking = useYatzyStore(s => s.botThinking);
  const roll = useYatzyStore(s => s.roll);
  const toggleHold = useYatzyStore(s => s.toggleHold);
  const scoreCategory = useYatzyStore(s => s.scoreCategory);
  const reset = useYatzyStore(s => s.reset);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    if (!gameState) void navigate({ to: '/yatzy' });
  }, [gameState, navigate]);

  if (!gameState) return <></>;

  const { players, currentPlayerIndex, dice, held, rollsLeft, status, winnerIndex } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  const isHumanTurn = currentPlayer?.kind === 'human';
  const canRoll = rollsLeft > 0 && status === 'playing' && isHumanTurn;

  function handleRoll(): void {
    if (!canRoll) return;
    setRolling(true);
    setTimeout(() => setRolling(false), 350);
    roll();
  }

  function handleLeave(): void {
    reset();
    void navigate({ to: '/yatzy' });
  }

  return (
    <div className="screen game-screen theme-yatzy">
      <header className="game-header">
        <button className="back-btn" onClick={handleLeave}>← Menu</button>
        <span className="mode-label">
          {status === 'playing'
            ? botThinking
              ? `${currentPlayer.name} is thinking…`
              : isHumanTurn ? 'Your turn' : `${currentPlayer.name}'s turn`
            : 'Game over'}
        </span>
      </header>

      <div className="yatzy-layout">
        <DiceArea
          dice={dice}
          held={held}
          rolling={rolling || botThinking}
          rollsLeft={rollsLeft}
          canRoll={canRoll}
          isBot={!isHumanTurn || botThinking}
          onToggleHold={toggleHold}
          onRoll={handleRoll}
        />

        <ScoreCard
          players={players}
          currentPlayerIndex={currentPlayerIndex}
          dice={dice}
          rollsLeft={rollsLeft}
          onScore={scoreCategory}
          gameOver={status === 'finished'}
        />
      </div>

      {/* Game over overlay */}
      {status === 'finished' && winnerIndex !== null && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal game-over-modal result-win">
            <div className="modal-emoji">🏆</div>
            <h2 className="modal-title">{players[winnerIndex].name} wins!</h2>
            <div className="yatzy-final-scores">
              {[...players]
                .map((p, i) => ({ p, i, score: totalScore(p.scoreCard) }))
                .sort((a, b) => b.score - a.score)
                .map(({ p, i, score }) => (
                  <div key={p.id} className={`yatzy-final-row${i === winnerIndex ? ' yatzy-final-row--winner' : ''}`}>
                    <span>{p.name}</span>
                    <span>{score}</span>
                  </div>
                ))}
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={() => void navigate({ to: '/yatzy' })}>
                Play again
              </button>
              <button className="secondary-btn" onClick={() => void navigate({ to: '/' })}>
                Main menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
