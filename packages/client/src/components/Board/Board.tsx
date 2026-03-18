import React from 'react';
import type { Move } from '@kalaha/shared';
import { PITS_PER_SIDE } from '@kalaha/shared';
import { useGameStore } from '../../store/gameStore.ts';
import { useUiStore } from '../../store/uiStore.ts';
import { useAnimationQueue } from '../../hooks/useAnimationQueue.ts';
import { wsService } from '../../services/wsService.ts';
import { Pit } from './Pit.tsx';
import { Store } from './Store.tsx';
import { GameOverModal } from '../UI/GameOverModal.tsx';
import { TurnIndicator } from '../UI/TurnIndicator.tsx';

export function Board(): React.ReactElement {
  // Drive the animation queue — this hook advances frames on a timer
  useAnimationQueue();

  const { displayedState, playerSide, animationQueue, activeDrop } = useGameStore();
  const opponentDisconnected = useUiStore(s => s.opponentDisconnected);

  if (!displayedState || !playerSide) return <div className="board-loading">Loading...</div>;

  const board = displayedState.board;
  const isAnimating = animationQueue.length > 0;
  const isMyTurn =
    displayedState.currentTurn === playerSide &&
    displayedState.status === 'ACTIVE' &&
    !isAnimating;

  // SOUTH pits: left→right = index 0→5
  // NORTH pits: displayed right→left from SOUTH's perspective, so we reverse for display
  const southPits = board.pits[0];
  const northPits = [...board.pits[1]].reverse(); // display as N5..N0

  function handlePitClick(pitIndex: number): void {
    if (!isMyTurn) return;
    const move: Move = { side: playerSide!, pitIndex };
    wsService.send({ type: 'MAKE_MOVE', move });
  }

  const isNorthSouth = playerSide === 'SOUTH';

  // Compute which cell has the active drop highlight
  function isPitActive(side: 0 | 1, pit: number): boolean {
    if (!activeDrop) return false;
    return activeDrop.position.side === side && activeDrop.position.pit === pit;
  }
  function isStoreActive(side: 0 | 1): boolean {
    if (!activeDrop) return false;
    return activeDrop.position.side === side && activeDrop.position.pit === PITS_PER_SIDE;
  }

  const southStoreSide: 0 | 1 = 0;
  const northStoreSide: 0 | 1 = 1;

  return (
    <div className="game-wrapper">
      <TurnIndicator
        currentTurn={displayedState.currentTurn}
        playerSide={playerSide}
        isAnimating={isAnimating}
      />

      <div className="board" aria-label="Kalaha board">
        {/* Left store: opponent's from SOUTH's view, yours from NORTH's view */}
        <Store
          count={isNorthSouth ? board.stores[1] : board.stores[0]}
          label={isNorthSouth ? 'Opponent' : 'Your Store'}
          side="north-store"
          isActive={isNorthSouth ? isStoreActive(northStoreSide) : isStoreActive(southStoreSide)}
          dropKind={activeDrop?.kind}
        />

        <div className="pits-column">
          {/* North pits row */}
          <div className="pits-row north-pits" aria-label="Opponent pits">
            {northPits.map((count, displayIndex) => {
              // displayIndex 0 = N5, displayIndex 5 = N0
              const actualPitIndex = PITS_PER_SIDE - 1 - displayIndex;
              const isPlayable = !isNorthSouth ? isMyTurn && count > 0 : false;
              const active = isPitActive(1, actualPitIndex);
              return (
                <Pit
                  key={`north-${actualPitIndex}`}
                  count={count}
                  isPlayable={isPlayable}
                  isOpponent={isNorthSouth}
                  isActive={active}
                  dropKind={active ? activeDrop?.kind : undefined}
                  onClick={isPlayable ? () => handlePitClick(actualPitIndex) : undefined}
                  label={`Opponent pit ${actualPitIndex + 1}`}
                />
              );
            })}
          </div>

          {/* South pits row */}
          <div className="pits-row south-pits" aria-label="Your pits">
            {southPits.map((count, pitIndex) => {
              const isPlayable = isNorthSouth ? isMyTurn && count > 0 : false;
              const active = isPitActive(0, pitIndex);
              return (
                <Pit
                  key={`south-${pitIndex}`}
                  count={count}
                  isPlayable={isPlayable}
                  isOpponent={!isNorthSouth}
                  isActive={active}
                  dropKind={active ? activeDrop?.kind : undefined}
                  onClick={isPlayable ? () => handlePitClick(pitIndex) : undefined}
                  label={`Your pit ${pitIndex + 1}`}
                />
              );
            })}
          </div>
        </div>

        {/* Right store: yours from SOUTH's view, opponent's from NORTH's view */}
        <Store
          count={isNorthSouth ? board.stores[0] : board.stores[1]}
          label={isNorthSouth ? 'Your Store' : 'Opponent'}
          side="south-store"
          isActive={isNorthSouth ? isStoreActive(southStoreSide) : isStoreActive(northStoreSide)}
          dropKind={activeDrop?.kind}
        />
      </div>

      {opponentDisconnected && (
        <div className="disconnect-banner">Opponent disconnected. Waiting for reconnect...</div>
      )}

      {displayedState.status === 'FINISHED' && !isAnimating && (
        <GameOverModal state={displayedState} playerSide={playerSide} />
      )}
    </div>
  );
}
