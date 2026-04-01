import React from 'react';
import type { CardSource, CardTarget, Suit } from '../engine.ts';
import { suitSymbol, canAutoComplete } from '../engine.ts';
import { useSolitaireStore } from '../store/gameStore.ts';
import { CardView } from './CardView.tsx';
import { useCardDimensions } from '../hooks/useCardDimensions.ts';

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];

function getCardTop(col: { faceUp: boolean }[], index: number, fdOff: number, fuOff: number): number {
  let top = 0;
  for (let i = 0; i < index; i++) {
    top += col[i].faceUp ? fuOff : fdOff;
  }
  return top;
}

function colHeight(col: { faceUp: boolean }[], fdOff: number, fuOff: number, cardH: number): number {
  if (col.length === 0) return cardH;
  return getCardTop(col, col.length - 1, fdOff, fuOff) + cardH;
}

function isTargetCol(targets: CardTarget[], col: number): boolean {
  return targets.some(t => t.area === 'tableau' && t.col === col);
}

function isTargetFoundation(targets: CardTarget[], suit: Suit): boolean {
  return targets.some(t => t.area === 'foundation' && t.suit === suit);
}

export function SolitaireBoard(): React.ReactElement {
  const { cardW, cardH, faceDownOffset, faceUpOffset, gap } = useCardDimensions();

  const gameState = useSolitaireStore(s => s.gameState);
  const selected = useSolitaireStore(s => s.selected);
  const validTargets = useSolitaireStore(s => s.validTargets);
  const newGame = useSolitaireStore(s => s.newGame);
  const clickStock = useSolitaireStore(s => s.clickStock);
  const clickCard = useSolitaireStore(s => s.clickCard);
  const clickTarget = useSolitaireStore(s => s.clickTarget);
  const autoMoveToFoundation = useSolitaireStore(s => s.autoMoveToFoundation);
  const tryAutoComplete = useSolitaireStore(s => s.tryAutoComplete);

  if (!gameState) return <></>;

  const { stock, waste, foundations, tableau, status, moves } = gameState;
  const wasteSrc: CardSource = { area: 'waste' };
  const wasteTop = waste[waste.length - 1] ?? null;
  const wasteSelected = selected?.area === 'waste';

  const wrapperStyle = {
    '--card-w': `${cardW}px`,
    '--card-h': `${cardH}px`,
    '--solitaire-gap': `${gap}px`,
  } as React.CSSProperties;

  return (
    <div className="solitaire-game-wrapper" style={wrapperStyle}>
      {/* Top row */}
      <div className="solitaire-top-row">
        {/* Stock */}
        <div className="stock-pile" onClick={clickStock}>
          {stock.length > 0 ? (
            <CardView card={{ suit: 'S', rank: 1, faceUp: false }} />
          ) : (
            <CardView isEmpty emptyLabel="↺" onClick={clickStock} />
          )}
        </div>

        {/* Waste */}
        {wasteTop ? (
          <CardView
            card={wasteTop}
            isSelected={wasteSelected}
            isTarget={false}
            onClick={() => clickCard(wasteSrc)}
            onDoubleClick={() => autoMoveToFoundation(wasteSrc)}
          />
        ) : (
          <CardView isEmpty />
        )}

        <div className="solitaire-spacer" />

        {/* Foundations */}
        {SUITS.map(suit => {
          const pile = foundations[suit];
          const top = pile[pile.length - 1] ?? null;
          const src: CardSource = { area: 'foundation', suit };
          const isTarget = isTargetFoundation(validTargets, suit);
          return top ? (
            <CardView
              key={suit}
              card={top}
              isTarget={isTarget}
              onClick={() => selected ? clickTarget({ area: 'foundation', suit }) : clickCard(src)}
            />
          ) : (
            <CardView
              key={suit}
              isEmpty
              emptyLabel={suitSymbol(suit)}
              isTarget={isTarget}
              onClick={() => selected && clickTarget({ area: 'foundation', suit })}
            />
          );
        })}
      </div>

      {/* Tableau */}
      <div className="solitaire-tableau">
        {tableau.map((col, colIdx) => {
          const isColTarget = isTargetCol(validTargets, colIdx);
          const height = colHeight(col, faceDownOffset, faceUpOffset, cardH);
          return (
            <div
              key={colIdx}
              className="tableau-col"
              style={{ height: `${height}px` }}
            >
              {col.length === 0 ? (
                <CardView
                  isEmpty
                  isTarget={isColTarget}
                  onClick={() => selected && clickTarget({ area: 'tableau', col: colIdx })}
                />
              ) : (
                col.map((card, cardIdx) => {
                  const src: CardSource = { area: 'tableau', col: colIdx, cardIndex: cardIdx };
                  const isStackSelected =
                    selected?.area === 'tableau' &&
                    selected.col === colIdx &&
                    cardIdx >= selected.cardIndex;
                  return (
                    <CardView
                      key={`${card.suit}${card.rank}`}
                      card={card}
                      isSelected={isStackSelected}
                      isTarget={isColTarget && cardIdx === col.length - 1}
                      style={{ top: `${getCardTop(col, cardIdx, faceDownOffset, faceUpOffset)}px` }}
                      className="tableau-card"
                      onClick={() => card.faceUp ? clickCard(src) : undefined}
                      onDoubleClick={() =>
                        card.faceUp && cardIdx === col.length - 1
                          ? autoMoveToFoundation(src)
                          : undefined
                      }
                    />
                  );
                })
              )}
            </div>
          );
        })}
      </div>

      {/* Auto-complete button */}
      {canAutoComplete(gameState) && (
        <button className="solitaire-autocomplete-btn" onClick={tryAutoComplete}>
          Auto-complete
        </button>
      )}

      {/* Win overlay */}
      {status === 'won' && (
        <div className="solitaire-win-overlay">
          <h2>You win!</h2>
          <p>{moves} moves</p>
          <button className="primary-btn" onClick={() => newGame(gameState.drawMode)}>
            Play again
          </button>
        </div>
      )}
    </div>
  );
}
