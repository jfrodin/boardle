import type { DieValue, CategoryKey, ScoreCard, YatzyState } from './engine.ts';
import {
  ALL_CATEGORIES,
  scoreCategory,
  rollDice,
  applyRoll,
  applyScoreCategory,
} from './engine.ts';

// ---- Expected value helpers ----

function counts(dice: DieValue[]): Record<number, number> {
  const c: Record<number, number> = {};
  for (const d of dice) c[d] = (c[d] ?? 0) + 1;
  return c;
}

// Decide which dice to hold to maximise expected score for a given category
function bestHoldForCategory(dice: DieValue[], category: CategoryKey): boolean[] {
  const c = counts(dice);

  switch (category) {
    case 'ones':   return dice.map(d => d === 1);
    case 'twos':   return dice.map(d => d === 2);
    case 'threes': return dice.map(d => d === 3);
    case 'fours':  return dice.map(d => d === 4);
    case 'fives':  return dice.map(d => d === 5);
    case 'sixes':  return dice.map(d => d === 6);

    case 'one_pair':
    case 'two_pairs': {
      // Hold dice that appear in pairs or better
      const pairVals = new Set(Object.keys(c).map(Number).filter(v => c[v] >= 2));
      return dice.map(d => pairVals.has(d));
    }
    case 'three_of_a_kind':
    case 'four_of_a_kind':
    case 'yatzy': {
      // Hold the most frequent value
      const best = Object.keys(c).map(Number).sort((a, b) => c[b] - c[a] || b - a)[0];
      return dice.map(d => d === best);
    }
    case 'full_house': {
      const three = Object.keys(c).map(Number).find(v => c[v] >= 3);
      const two   = Object.keys(c).map(Number).find(v => c[v] === 2 && v !== three);
      return dice.map(d => d === three || d === two);
    }
    case 'small_straight': {
      // Hold dice in 1-5
      const keep = new Set([1, 2, 3, 4, 5]);
      const held: boolean[] = [false, false, false, false, false];
      const usedIdx = new Set<number>();
      for (const v of [1, 2, 3, 4, 5]) {
        const idx = dice.findIndex((d, i) => d === v && !usedIdx.has(i));
        if (idx !== -1 && keep.has(v)) { held[idx] = true; usedIdx.add(idx); }
      }
      return held;
    }
    case 'large_straight': {
      const held: boolean[] = [false, false, false, false, false];
      const usedIdx = new Set<number>();
      for (const v of [2, 3, 4, 5, 6]) {
        const idx = dice.findIndex((d, i) => d === v && !usedIdx.has(i));
        if (idx !== -1) { held[idx] = true; usedIdx.add(idx); }
      }
      return held;
    }
    case 'chance':
      // Hold dice >= 4
      return dice.map(d => d >= 4);
    default:
      return [false, false, false, false, false];
  }
}

// Simulate expected score for a category with N rolls remaining
function expectedScore(
  dice: DieValue[],
  held: boolean[],
  category: CategoryKey,
  rollsLeft: number,
): number {
  if (rollsLeft === 0) return scoreCategory(category, dice);

  const SIMS = 120;
  let total = 0;
  for (let i = 0; i < SIMS; i++) {
    const newDice = rollDice(dice, held);
    const newHeld = bestHoldForCategory(newDice, category);
    total += expectedScore(newDice, newHeld, category, rollsLeft - 1);
  }
  return total / SIMS;
}

// Pick the best available category given current dice + rolls remaining
export function pickBestCategory(
  dice: DieValue[],
  scoreCard: ScoreCard,
  rollsLeft: number,
): CategoryKey {
  const available = ALL_CATEGORIES.filter(k => scoreCard[k] === undefined);

  let bestCat = available[0];
  let bestEV = -Infinity;

  for (const cat of available) {
    const current = scoreCategory(cat, dice);
    // If we already have a great score, just use it
    if (current > 0 && rollsLeft === 0) {
      const ev = current;
      if (ev > bestEV) { bestEV = ev; bestCat = cat; }
      continue;
    }
    const held = bestHoldForCategory(dice, cat);
    const ev = rollsLeft > 0
      ? expectedScore(dice, held, cat, rollsLeft)
      : current;
    if (ev > bestEV) { bestEV = ev; bestCat = cat; }
  }

  return bestCat;
}

// Choose which dice to hold (for bot's roll decision)
export function botChooseHold(
  dice: DieValue[],
  scoreCard: ScoreCard,
  rollsLeft: number,
): boolean[] {
  const targetCategory = pickBestCategory(dice, scoreCard, rollsLeft);
  return bestHoldForCategory(dice, targetCategory);
}

// Run a full bot turn: rolls + picks category. Returns final state.
export async function runBotTurn(
  state: YatzyState,
  onStateUpdate: (s: YatzyState) => void,
  delay = 700,
): Promise<YatzyState> {
  let s = state;

  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  // Bot gets up to 2 more rolls (first roll already happened when turn started)
  // Actually bot gets all 3 rolls — roll, maybe hold, roll, maybe hold, pick
  s = applyRoll(s);
  onStateUpdate(s);
  await sleep(delay);

  while (s.rollsLeft > 0) {
    const player = s.players[s.currentPlayerIndex];
    const held = botChooseHold(s.dice, player.scoreCard, s.rollsLeft);
    // If all dice held, no point rolling again
    const allHeld = held.every(Boolean);
    if (allHeld) break;

    // Decide if rolling again is worth it
    const currentBest = pickBestCategory(s.dice, player.scoreCard, 0);
    const currentScore = scoreCategory(currentBest, s.dice);
    const projectedBest = pickBestCategory(s.dice, player.scoreCard, s.rollsLeft);
    const projectedHeld = botChooseHold(s.dice, player.scoreCard, s.rollsLeft);
    const projectedEV = expectedScore(s.dice, projectedHeld, projectedBest, s.rollsLeft);

    if (projectedEV <= currentScore) break; // no gain from rolling

    s = { ...s, held };
    s = applyRoll(s);
    onStateUpdate(s);
    await sleep(delay);
  }

  // Pick category
  const player = s.players[s.currentPlayerIndex];
  const chosen = pickBestCategory(s.dice, player.scoreCard, 0);
  s = applyScoreCategory(s, chosen);
  onStateUpdate(s);
  return s;
}
