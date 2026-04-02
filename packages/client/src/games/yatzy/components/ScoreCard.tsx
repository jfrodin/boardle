import React from 'react';
import type { Player, DieValue, CategoryKey } from '../engine.ts';
import {
  UPPER_CATEGORIES,
  LOWER_CATEGORIES,
  CATEGORY_LABELS,
  scoreCategory,
  upperScore,
  hasUpperBonus,
  totalScore,
} from '../engine.ts';

interface ScoreCardProps {
  players: Player[];
  currentPlayerIndex: number;
  dice: DieValue[];
  rollsLeft: number;
  onScore: (category: CategoryKey) => void;
  gameOver: boolean;
}

export function ScoreCard({
  players, currentPlayerIndex, dice, rollsLeft, onScore, gameOver,
}: ScoreCardProps): React.ReactElement {
  const canScore = rollsLeft < 3 && !gameOver;
  const currentPlayer = players[currentPlayerIndex];
  const isHumanTurn = currentPlayer?.kind === 'human' && canScore;

  function renderCell(player: Player, category: CategoryKey, isCurrentPlayer: boolean): React.ReactNode {
    const scored = player.scoreCard[category];
    if (scored !== undefined) {
      return <span className="score-cell score-cell--scored">{scored}</span>;
    }
    if (isCurrentPlayer && isHumanTurn) {
      const preview = scoreCategory(category, dice);
      return (
        <button
          className="score-cell score-cell--preview"
          onClick={() => onScore(category)}
          title={`Score ${preview} in ${CATEGORY_LABELS[category]}`}
        >
          {preview > 0 ? preview : <span className="score-cell--zero">0</span>}
        </button>
      );
    }
    return <span className="score-cell score-cell--empty">—</span>;
  }

  return (
    <div className="yatzy-scorecard-wrapper">
      <table className="yatzy-scorecard">
        <thead>
          <tr>
            <th className="scorecard-label-col">Category</th>
            {players.map((p, i) => (
              <th
                key={p.id}
                className={`scorecard-player-col${i === currentPlayerIndex && !gameOver ? ' scorecard-player-col--active' : ''}`}
              >
                <span className="scorecard-player-name">{p.name}</span>
                {p.kind === 'bot' && <span className="scorecard-bot-tag">🤖</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Upper section */}
          <tr className="scorecard-section-header">
            <td colSpan={players.length + 1}>Upper Section</td>
          </tr>
          {UPPER_CATEGORIES.map(cat => (
            <tr key={cat} className="scorecard-row">
              <td className="scorecard-label">{CATEGORY_LABELS[cat]}</td>
              {players.map((p, i) => (
                <td key={p.id} className="scorecard-cell">
                  {renderCell(p, cat, i === currentPlayerIndex)}
                </td>
              ))}
            </tr>
          ))}
          {/* Bonus row */}
          <tr className="scorecard-row scorecard-bonus-row">
            <td className="scorecard-label">Bonus (+50)</td>
            {players.map(p => {
              const us = upperScore(p.scoreCard);
              const done = UPPER_CATEGORIES.every(k => p.scoreCard[k] !== undefined);
              const bonus = hasUpperBonus(p.scoreCard) ? 50 : 0;
              return (
                <td key={p.id} className="scorecard-cell">
                  <span className={`score-cell${bonus ? ' score-cell--bonus' : ''}`}>
                    {done ? (bonus || '–') : `${us}/63`}
                  </span>
                </td>
              );
            })}
          </tr>

          {/* Lower section */}
          <tr className="scorecard-section-header">
            <td colSpan={players.length + 1}>Lower Section</td>
          </tr>
          {LOWER_CATEGORIES.map(cat => (
            <tr key={cat} className="scorecard-row">
              <td className="scorecard-label">{CATEGORY_LABELS[cat]}</td>
              {players.map((p, i) => (
                <td key={p.id} className="scorecard-cell">
                  {renderCell(p, cat, i === currentPlayerIndex)}
                </td>
              ))}
            </tr>
          ))}

          {/* Total */}
          <tr className="scorecard-row scorecard-total-row">
            <td className="scorecard-label">Total</td>
            {players.map(p => (
              <td key={p.id} className="scorecard-cell">
                <span className="score-cell score-cell--total">{totalScore(p.scoreCard)}</span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
