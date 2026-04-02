import React, { useEffect, useState, useRef } from 'react';
import type { DieValue } from '../engine.ts';

const DOTS: Record<DieValue, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
};

function randomDie(): DieValue {
  return (Math.ceil(Math.random() * 6)) as DieValue;
}

interface DieProps {
  value: DieValue;
  held: boolean;
  rolling: boolean;
  dieIndex: number;   // 0-4, used for stagger
  rollKey: number;    // increments each roll to retrigger animation
  disabled: boolean;
  onClick: () => void;
}

function Die({ value, held, rolling, dieIndex, rollKey, disabled, onClick }: DieProps): React.ReactElement {
  // Face cycling: show rapidly-changing random values while rolling,
  // settle on the real value when done.
  const [displayed, setDisplayed] = useState<DieValue>(value);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!rolling) {
      setDisplayed(value);
      return;
    }
    // Cycle through random faces every 70ms for the duration of the animation
    const CYCLE_DURATION = 420 + dieIndex * 60; // stagger end time per die
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      if (Date.now() - startTime >= CYCLE_DURATION) {
        clearInterval(intervalRef.current!);
        setDisplayed(value);
      } else {
        setDisplayed(randomDie());
      }
    }, 70);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [rolling, rollKey, value, dieIndex]);

  // Use rollKey + dieIndex to give each die unique staggered CSS animation
  const animStyle = rolling
    ? { animationDuration: `${380 + dieIndex * 55}ms`, animationDelay: `${dieIndex * 25}ms` }
    : {};

  return (
    <div className="yatzy-die-wrapper">
      <button
        className={[
          'yatzy-die',
          held ? 'yatzy-die--held' : '',
          rolling ? 'yatzy-die--rolling' : '',
          disabled ? 'yatzy-die--disabled' : '',
        ].filter(Boolean).join(' ')}
        style={animStyle}
        onClick={onClick}
        disabled={disabled}
        aria-label={`Die showing ${value}${held ? ', held' : ''}`}
        aria-pressed={held}
      >
        <div className="yatzy-die-face">
          {DOTS[displayed].map(([x, y], i) => (
            <span
              key={i}
              className="yatzy-die-dot"
              style={{ left: `${x}%`, top: `${y}%` }}
            />
          ))}
        </div>
      </button>
      {held && <span className="yatzy-held-label">HELD</span>}
    </div>
  );
}

interface DiceAreaProps {
  dice: DieValue[];
  held: boolean[];
  rolling: boolean;
  rollKey: number;
  rollsLeft: number;
  canRoll: boolean;
  isBot: boolean;
  onToggleHold: (i: number) => void;
  onRoll: () => void;
}

export function DiceArea({
  dice, held, rolling, rollKey, rollsLeft, canRoll, isBot, onToggleHold, onRoll,
}: DiceAreaProps): React.ReactElement {
  const hasRolled = rollsLeft < 3;
  const needsFirstRoll = rollsLeft === 3 && !isBot;

  return (
    <div className="yatzy-dice-area">
      <div className="yatzy-dice-row">
        {dice.map((d, i) => (
          <Die
            key={i}
            value={d}
            held={held[i]}
            rolling={rolling && !held[i]}
            dieIndex={i}
            rollKey={rollKey}
            disabled={isBot || !hasRolled}
            onClick={() => !isBot && hasRolled && onToggleHold(i)}
          />
        ))}
      </div>
      <div className="yatzy-roll-area">
        <button
          className={`primary-btn yatzy-roll-btn${needsFirstRoll ? ' yatzy-roll-btn--pulse' : ''}`}
          onClick={onRoll}
          disabled={!canRoll || isBot}
        >
          {rollsLeft === 3
            ? '🎲 Roll'
            : rollsLeft === 0
            ? 'Pick a category ↓'
            : `🎲 Roll again (${rollsLeft} left)`}
        </button>
        {hasRolled && !isBot && rollsLeft > 0 && (
          <p className="yatzy-hold-hint">Tap dice to hold them between rolls</p>
        )}
      </div>
    </div>
  );
}
