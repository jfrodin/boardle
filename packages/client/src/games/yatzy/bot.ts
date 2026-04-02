import type { DieValue, CategoryKey, ScoreCard, YatzyState } from './engine.ts';
import {
  UPPER_CATEGORIES,
  ALL_CATEGORIES,
  scoreCategory,
  upperScore,
  rollDice,
  applyRoll,
  applyScoreCategory,
} from './engine.ts';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ---- Helpers ----

// How many upper categories are still unscored
function upperRemaining(scoreCard: ScoreCard): number {
  return UPPER_CATEGORIES.filter(k => scoreCard[k] === undefined).length;
}

// Estimated upper score needed per remaining upper category to hit bonus
// Returns how many points behind pace the bot is (positive = behind)
function upperBonusDeficit(scoreCard: ScoreCard): number {
  const scored = upperScore(scoreCard);
  const remaining = upperRemaining(scoreCard);
  if (remaining === 0) return 0;
  // Need 63 total. Average needed per remaining slot = (63 - scored) / remaining
  // Ideal pace is ~10.5 per slot. Deficit per slot = needed - 10.5
  const needed = Math.max(0, 63 - scored);
  return needed / remaining - 10.5;
}

// Weight to add to a category score based on strategic value
function categoryWeight(
  category: CategoryKey,
  score: number,
  scoreCard: ScoreCard,
  availableCount: number,
): number {
  let weight = 0;

  // Upper bonus pressure: reward upper categories when behind pace
  if (UPPER_CATEGORIES.includes(category)) {
    const deficit = upperBonusDeficit(scoreCard);
    if (deficit > 0) weight += deficit * 1.5; // behind pace — prioritise upper
  }

  // Chance: penalise using it early (save it as a dump for bad turns)
  if (category === 'chance' && availableCount > 4) {
    weight -= 8;
  }

  // Yatzy: strongly reward — 50 pts + it's rare, don't waste a shot
  if (category === 'yatzy' && score === 50) {
    weight += 20;
  }

  return weight;
}

// Best score across all available categories for a given dice roll
function bestAvailableScore(dice: DieValue[], scoreCard: ScoreCard): number {
  const available = ALL_CATEGORIES.filter(k => scoreCard[k] === undefined);
  if (available.length === 0) return 0;

  let best = -Infinity;
  for (const cat of available) {
    const s = scoreCategory(cat, dice) + categoryWeight(cat, scoreCategory(cat, dice), scoreCard, available.length);
    if (s > best) best = s;
  }
  return best;
}

// ---- Core: evaluate a hold pattern ----
// Simulates SIMS rolls from the given hold and returns the average
// best-available-category score across all simulations.
function evalHold(
  dice: DieValue[],
  held: boolean[],
  scoreCard: ScoreCard,
  rollsRemaining: number,
  sims: number,
): number {
  if (rollsRemaining === 0) {
    return bestAvailableScore(dice, scoreCard);
  }

  let total = 0;
  for (let i = 0; i < sims; i++) {
    const newDice = rollDice(dice, held);
    // For the last roll, just evaluate; for intermediate rolls, pick best hold greedily
    if (rollsRemaining === 1) {
      total += bestAvailableScore(newDice, scoreCard);
    } else {
      const bestHeld = greedyBestHold(newDice, scoreCard, rollsRemaining - 1, Math.max(10, Math.floor(sims / 4)));
      total += evalHold(newDice, bestHeld, scoreCard, rollsRemaining - 1, Math.max(10, Math.floor(sims / 4)));
    }
  }
  return total / sims;
}

// ---- Find best hold by trying all 32 patterns ----
function greedyBestHold(
  dice: DieValue[],
  scoreCard: ScoreCard,
  rollsRemaining: number,
  sims = 40,
): boolean[] {
  let bestHeld: boolean[] = [false, false, false, false, false];
  let bestEV = -Infinity;

  // Try all 32 hold combinations
  for (let mask = 0; mask < 32; mask++) {
    const held = dice.map((_, i) => Boolean(mask & (1 << i)));
    const ev = evalHold(dice, held, scoreCard, rollsRemaining, sims);
    if (ev > bestEV) {
      bestEV = ev;
      bestHeld = held;
    }
  }

  return bestHeld;
}

// ---- Public: pick best category to score ----
export function pickBestCategory(
  dice: DieValue[],
  scoreCard: ScoreCard,
): CategoryKey {
  const available = ALL_CATEGORIES.filter(k => scoreCard[k] === undefined);
  if (available.length === 0) return 'chance'; // fallback, shouldn't happen

  let bestCat = available[0];
  let bestValue = -Infinity;

  for (const cat of available) {
    const score = scoreCategory(cat, dice);
    const weighted = score + categoryWeight(cat, score, scoreCard, available.length);
    if (weighted > bestValue) {
      bestValue = weighted;
      bestCat = cat;
    }
  }

  return bestCat;
}

// ---- Public: choose hold ----
export function botChooseHold(
  dice: DieValue[],
  scoreCard: ScoreCard,
  rollsLeft: number,
): boolean[] {
  return greedyBestHold(dice, scoreCard, rollsLeft, 40);
}

// ---- Run a full bot turn ----
export async function runBotTurn(
  state: YatzyState,
  onStateUpdate: (s: YatzyState) => void,
  delay = 700,
): Promise<YatzyState> {
  let s = state;

  // First roll
  s = applyRoll(s);
  onStateUpdate(s);
  await sleep(delay);

  // Up to 2 more rolls
  while (s.rollsLeft > 0) {
    const player = s.players[s.currentPlayerIndex];

    // Find the best hold given rolls remaining
    const held = botChooseHold(s.dice, player.scoreCard, s.rollsLeft);

    // Is it worth rolling? Compare best score now vs EV of rolling with this hold
    const currentBestScore = scoreCategory(pickBestCategory(s.dice, player.scoreCard), s.dice);
    const ev = evalHold(s.dice, held, player.scoreCard, s.rollsLeft, 40);

    if (ev <= currentBestScore || held.every(Boolean)) break;

    s = { ...s, held };
    s = applyRoll(s);
    onStateUpdate(s);
    await sleep(delay);
  }

  // Score the best available category
  const player = s.players[s.currentPlayerIndex];
  const chosen = pickBestCategory(s.dice, player.scoreCard);
  s = applyScoreCategory(s, chosen);
  onStateUpdate(s);
  return s;
}
