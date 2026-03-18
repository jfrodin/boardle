import React, { useEffect } from 'react';
import type { Move } from '@kalaha/shared';
import { useGameStore } from '../../store/gameStore.ts';
import { useUiStore } from '../../store/uiStore.ts';
import { wsService } from '../../services/wsService.ts';
import { Pit } from './Pit.tsx';
import { Store } from './Store.tsx';
import { GameOverModal } from '../UI/GameOverModal.tsx';
import { TurnIndicator } from '../UI/TurnIndicator.tsx';

export function Board(): React.ReactElement {
  const { state, playerSide, isAnimating, pendingAnimation, commitAnimation } = useGameStore();
  const opponentDisconnected = useUiStore(s => s.opponentDisconnected);

  // Commit animation after a short delay so the UI can show the move
  useEffect(() => {
    if (!pendingAnimation) return;
    const timer = setTimeout(() => {
      commitAnimation();
    }, 350);
    return () => clearTimeout(timer);
  }, [pendingAnimation, commitAnimation]);

  if (!state || !playerSide) return <div className="board-loading">Loading...</div>;

  const board = state.board;
  const isMyTurn = state.currentTurn === playerSide && state.status === 'ACTIVE' && !isAnimating;

  // SOUTH pits are indices 0-5 (left to right from SOUTH's view)
  // NORTH pits are indices 5-0 (left to right from SOUTH's view, so reversed)
  const southPits = board.pits[0]; // [0..5]
  const northPits = [...board.pits[1]].reverse(); // display N5..N0 left to right

  function handlePitClick(pitIndex: number): void {
    if (!isMyTurn) return;
    const move: Move = { side: playerSide!, pitIndex };
    wsService.send({ type: 'MAKE_MOVE', move });
  }

  const isNorthSouth = playerSide === 'SOUTH';

  return (
    <div className="game-wrapper">
      <TurnIndicator currentTurn={state.currentTurn} playerSide={playerSide} isAnimating={isAnimating} />

      <div className="board" aria-label="Kalaha board">
        {/* North store (left side from SOUTH's view) */}
        <Store
          count={isNorthSouth ? board.stores[1] : board.stores[0]}
          label={isNorthSouth ? 'Opponent' : 'Your Store'}
          side="north-store"
        />

        {/* Pits area */}
        <div className="pits-column">
          {/* North pits (opponent from SOUTH's perspective) */}
          <div className="pits-row north-pits" aria-label="Opponent pits">
            {northPits.map((count, displayIndex) => {
              // displayIndex 0 = N5, displayIndex 5 = N0
              const actualPitIndex = PITS_PER_SIDE - 1 - displayIndex;
              const isPlayable = !isNorthSouth
                ? isMyTurn && count > 0
                : false;
              return (
                <Pit
                  key={`north-${actualPitIndex}`}
                  count={count}
                  isPlayable={isPlayable}
                  isOpponent={isNorthSouth}
                  onClick={isPlayable ? () => handlePitClick(actualPitIndex) : undefined}
                  label={`Opponent pit ${actualPitIndex + 1}`}
                />
              );
            })}
          </div>

          {/* South pits (your pits from SOUTH's perspective) */}
          <div className="pits-row south-pits" aria-label="Your pits">
            {southPits.map((count, pitIndex) => {
              const isPlayable = isNorthSouth
                ? isMyTurn && count > 0
                : false;
              return (
                <Pit
                  key={`south-${pitIndex}`}
                  count={count}
                  isPlayable={isPlayable}
                  isOpponent={!isNorthSouth}
                  onClick={isPlayable ? () => handlePitClick(pitIndex) : undefined}
                  label={`Your pit ${pitIndex + 1}`}
                />
              );
            })}
          </div>
        </div>

        {/* South store (right side from SOUTH's view) */}
        <Store
          count={isNorthSouth ? board.stores[0] : board.stores[1]}
          label={isNorthSouth ? 'Your Store' : 'Opponent'}
          side="south-store"
        />
      </div>

      {opponentDisconnected && (
        <div className="disconnect-banner">Opponent disconnected. Waiting for reconnect...</div>
      )}

      {state.status === 'FINISHED' && <GameOverModal state={state} playerSide={playerSide} />}
    </div>
  );
}

const PITS_PER_SIDE = 6;
