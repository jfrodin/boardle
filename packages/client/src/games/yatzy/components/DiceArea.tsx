import React from 'react';
import type { DieValue } from '../engine.ts';

const DOTS: Record<DieValue, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
};

interface DieProps {
  value: DieValue;
  held: boolean;
  rolling: boolean;
  disabled: boolean;
  onClick: () => void;
}

function Die({ value, held, rolling, disabled, onClick }: DieProps): React.ReactElement {
  return (
    <button
      className={[
        'yatzy-die',
        held ? 'yatzy-die--held' : '',
        rolling ? 'yatzy-die--rolling' : '',
        disabled ? 'yatzy-die--disabled' : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Die showing ${value}${held ? ', held' : ''}`}
      aria-pressed={held}
    >
      <div className="yatzy-die-face">
        {DOTS[value].map(([x, y], i) => (
          <span
            key={i}
            className="yatzy-die-dot"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        ))}
      </div>
    </button>
  );
}

interface DiceAreaProps {
  dice: DieValue[];
  held: boolean[];
  rolling: boolean;
  rollsLeft: number;
  canRoll: boolean;
  isBot: boolean;
  onToggleHold: (i: number) => void;
  onRoll: () => void;
}

export function DiceArea({
  dice, held, rolling, rollsLeft, canRoll, isBot, onToggleHold, onRoll,
}: DiceAreaProps): React.ReactElement {
  const hasRolled = rollsLeft < 3;

  return (
    <div className="yatzy-dice-area">
      <div className="yatzy-dice-row">
        {dice.map((d, i) => (
          <Die
            key={i}
            value={d}
            held={held[i]}
            rolling={rolling && !held[i]}
            disabled={isBot || !hasRolled}
            onClick={() => !isBot && hasRolled && onToggleHold(i)}
          />
        ))}
      </div>
      <div className="yatzy-roll-area">
        <button
          className="primary-btn yatzy-roll-btn"
          onClick={onRoll}
          disabled={!canRoll || isBot}
        >
          {rollsLeft === 3 ? 'Roll' : rollsLeft === 0 ? 'No rolls left' : `Roll again (${rollsLeft} left)`}
        </button>
        {hasRolled && !isBot && rollsLeft > 0 && (
          <p className="yatzy-hold-hint">Tap dice to hold</p>
        )}
      </div>
    </div>
  );
}
