import { useEffect, useRef } from 'react';
import { getMoveSteps } from '@kalaha/shared';
import { useGameStore } from '../store/gameStore.ts';
import { useUiStore } from '../store/uiStore.ts';
import type { ActiveDrop } from '../store/gameStore.ts';
import type { AnimSpeed } from '../store/uiStore.ts';

interface SpeedConfig {
  /** Base ms per stone drop */
  base: number;
  /** Multiplier applied when there are many stones (>8) */
  manyStoneBase: number;
  /** Pause before first stone (source pit empties) */
  pickup: number;
  /** Pause after a capture or sweep step */
  special: number;
}

const SPEED_CONFIG: Record<AnimSpeed, SpeedConfig> = {
  slow:   { base: 380, manyStoneBase: 280, pickup: 200, special: 700 },
  normal: { base: 220, manyStoneBase: 170, pickup: 120, special: 450 },
  fast:   { base: 100, manyStoneBase:  80, pickup:  60, special: 220 },
};

function stepDelay(totalSteps: number, cfg: SpeedConfig): number {
  return totalSteps <= 8 ? cfg.base : cfg.manyStoneBase;
}

export function useAnimationQueue(): void {
  const { animationQueue, setDisplayedBoard, dequeueAnimation } = useGameStore();
  const animSpeed = useUiStore(s => s.animSpeed);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeItemRef = useRef<(typeof animationQueue)[0] | null>(null);

  useEffect(() => {
    const current = animationQueue[0];
    if (!current) return;
    if (activeItemRef.current === current) return;
    activeItemRef.current = current;

    if (timerRef.current) clearTimeout(timerRef.current);

    const steps = getMoveSteps(current.startState, current.move);

    if (steps.length === 0) {
      dequeueAnimation();
      activeItemRef.current = null;
      return;
    }

    const cfg = SPEED_CONFIG[animSpeed];
    const delay = stepDelay(steps.length, cfg);
    let i = 0;

    function runStep() {
      if (i >= steps.length) {
        dequeueAnimation();
        activeItemRef.current = null;
        return;
      }

      const step = steps[i];
      const isSpecial = step.kind === 'capture' || step.kind === 'sweep';
      const drop: ActiveDrop = { position: step.drop, kind: step.kind };

      setDisplayedBoard(step.board, drop);
      i++;

      timerRef.current = setTimeout(runStep, isSpecial ? cfg.special : delay);
    }

    timerRef.current = setTimeout(runStep, cfg.pickup);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationQueue[0], animSpeed]);
}
