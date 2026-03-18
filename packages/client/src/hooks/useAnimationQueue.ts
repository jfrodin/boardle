import { useEffect, useRef } from 'react';
import { getMoveSteps } from '@kalaha/shared';
import { useGameStore } from '../store/gameStore.ts';
import type { ActiveDrop } from '../store/gameStore.ts';

/** ms between each stone drop. Scales down slightly for many-stone moves. */
function stepDelay(totalSteps: number): number {
  if (totalSteps <= 4) return 200;
  if (totalSteps <= 8) return 160;
  return 120;
}

/** Longer pause before committing a capture or sweep so the player can notice it. */
const CAPTURE_PAUSE_MS = 450;
const PICKUP_PAUSE_MS = 120; // pause after emptying source pit, before first drop

export function useAnimationQueue(): void {
  const { animationQueue, setDisplayedBoard, dequeueAnimation } = useGameStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeItemRef = useRef<(typeof animationQueue)[0] | null>(null);

  useEffect(() => {
    const current = animationQueue[0];
    if (!current) return;

    // Don't re-animate if the same item is already being animated
    if (activeItemRef.current === current) return;
    activeItemRef.current = current;

    // Clear any running timer
    if (timerRef.current) clearTimeout(timerRef.current);

    const steps = getMoveSteps(current.startState, current.move);

    if (steps.length === 0) {
      // No steps to animate — commit immediately
      dequeueAnimation();
      activeItemRef.current = null;
      return;
    }

    const delay = stepDelay(steps.length);
    let i = 0;

    function runStep() {
      if (i >= steps.length) {
        // All steps done — commit the server's authoritative final state
        dequeueAnimation();
        activeItemRef.current = null;
        return;
      }

      const step = steps[i];
      const isSpecial = step.kind === 'capture' || step.kind === 'sweep';
      const drop: ActiveDrop = { position: step.drop, kind: step.kind };

      setDisplayedBoard(step.board, drop);
      i++;

      // Give extra time for capture/sweep so the player notices
      const nextDelay = isSpecial ? CAPTURE_PAUSE_MS : delay;
      timerRef.current = setTimeout(runStep, nextDelay);
    }

    // Brief pause first so the source pit visually empties ("pick up")
    timerRef.current = setTimeout(runStep, PICKUP_PAUSE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // We intentionally only re-run when the first item in the queue changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationQueue[0]]);
}
