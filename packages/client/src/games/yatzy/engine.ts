// ---- Types ----

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

export type CategoryKey =
  | 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes'
  | 'one_pair' | 'two_pairs' | 'three_of_a_kind' | 'four_of_a_kind'
  | 'small_straight' | 'large_straight' | 'full_house' | 'chance' | 'yatzy';

export const UPPER_CATEGORIES: CategoryKey[] = [
  'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
];

export const LOWER_CATEGORIES: CategoryKey[] = [
  'one_pair', 'two_pairs', 'three_of_a_kind', 'four_of_a_kind',
  'small_straight', 'large_straight', 'full_house', 'chance', 'yatzy',
];

export const ALL_CATEGORIES: CategoryKey[] = [...UPPER_CATEGORIES, ...LOWER_CATEGORIES];

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  ones: '1s',
  twos: '2s',
  threes: '3s',
  fours: '4s',
  fives: '5s',
  sixes: '6s',
  one_pair: 'One Pair',
  two_pairs: 'Two Pairs',
  three_of_a_kind: 'Three of a Kind',
  four_of_a_kind: 'Four of a Kind',
  small_straight: 'Small Straight',
  large_straight: 'Large Straight',
  full_house: 'Full House',
  chance: 'Chance',
  yatzy: 'Yatzy',
};

export type ScoreCard = Partial<Record<CategoryKey, number>>;

export type PlayerKind = 'human' | 'bot';

export interface Player {
  id: string;
  name: string;
  kind: PlayerKind;
  scoreCard: ScoreCard;
}

export interface YatzyState {
  players: Player[];
  currentPlayerIndex: number;
  dice: DieValue[];
  held: boolean[]; // which dice are held between rolls
  rollsLeft: number; // 3 at start of turn, counts down
  status: 'playing' | 'finished';
  winnerIndex: number | null;
}

// ---- Scoring ----

function counts(dice: DieValue[]): Record<number, number> {
  const c: Record<number, number> = {};
  for (const d of dice) c[d] = (c[d] ?? 0) + 1;
  return c;
}

export function scoreCategory(category: CategoryKey, dice: DieValue[]): number {
  const c = counts(dice);
  const vals = Object.keys(c).map(Number).sort((a, b) => b - a);

  switch (category) {
    case 'ones':   return (c[1] ?? 0) * 1;
    case 'twos':   return (c[2] ?? 0) * 2;
    case 'threes': return (c[3] ?? 0) * 3;
    case 'fours':  return (c[4] ?? 0) * 4;
    case 'fives':  return (c[5] ?? 0) * 5;
    case 'sixes':  return (c[6] ?? 0) * 6;

    case 'one_pair': {
      const pairs = vals.filter(v => c[v] >= 2);
      return pairs.length > 0 ? pairs[0] * 2 : 0;
    }
    case 'two_pairs': {
      const pairs = vals.filter(v => c[v] >= 2);
      if (pairs.length >= 2) return pairs[0] * 2 + pairs[1] * 2;
      // four-of-a-kind counts as two pairs of the same value
      if (pairs.length === 1 && c[pairs[0]] >= 4) return pairs[0] * 4;
      return 0;
    }
    case 'three_of_a_kind': {
      const trip = vals.find(v => c[v] >= 3);
      return trip ? trip * 3 : 0;
    }
    case 'four_of_a_kind': {
      const quad = vals.find(v => c[v] >= 4);
      return quad ? quad * 4 : 0;
    }
    case 'small_straight': {
      const sorted = [...new Set(dice)].sort((a, b) => a - b);
      const isSmall = [1,2,3,4,5].every(v => sorted.includes(v as DieValue));
      return isSmall ? 15 : 0;
    }
    case 'large_straight': {
      const sorted = [...new Set(dice)].sort((a, b) => a - b);
      const isLarge = [2,3,4,5,6].every(v => sorted.includes(v as DieValue));
      return isLarge ? 20 : 0;
    }
    case 'full_house': {
      const hasThree = vals.find(v => c[v] === 3);
      const hasTwo = vals.find(v => c[v] === 2);
      if (hasThree && hasTwo) return hasThree * 3 + hasTwo * 2;
      return 0;
    }
    case 'chance':
      return dice.reduce((a, b) => a + b, 0);
    case 'yatzy':
      return Object.values(c).some(n => n === 5) ? 50 : 0;
  }
}

export function upperScore(scoreCard: ScoreCard): number {
  return UPPER_CATEGORIES.reduce((sum, k) => sum + (scoreCard[k] ?? 0), 0);
}

export function hasUpperBonus(scoreCard: ScoreCard): boolean {
  return upperScore(scoreCard) >= 63;
}

export function totalScore(scoreCard: ScoreCard): number {
  const upper = upperScore(scoreCard);
  const bonus = upper >= 63 ? 50 : 0;
  const lower = LOWER_CATEGORIES.reduce((sum, k) => sum + (scoreCard[k] ?? 0), 0);
  return upper + bonus + lower;
}

export function isScoreCardComplete(scoreCard: ScoreCard): boolean {
  return ALL_CATEGORIES.every(k => scoreCard[k] !== undefined);
}

// ---- Init ----

export function rollDice(current: DieValue[], held: boolean[]): DieValue[] {
  return current.map((d, i) =>
    held[i] ? d : (Math.ceil(Math.random() * 6) as DieValue)
  );
}

export function createInitialDice(): DieValue[] {
  return [1, 1, 1, 1, 1];
}

export function createPlayer(id: string, name: string, kind: PlayerKind): Player {
  return { id, name, kind, scoreCard: {} };
}

export function createInitialState(players: Omit<Player, 'scoreCard'>[]): YatzyState {
  return {
    players: players.map(p => ({ ...p, scoreCard: {} })),
    currentPlayerIndex: 0,
    dice: createInitialDice(),
    held: [false, false, false, false, false],
    rollsLeft: 3,
    status: 'playing',
    winnerIndex: null,
  };
}

// ---- Mutations (pure) ----

export function applyRoll(state: YatzyState): YatzyState {
  if (state.rollsLeft === 0) return state;
  const newDice = rollDice(state.dice, state.held);
  return { ...state, dice: newDice, rollsLeft: state.rollsLeft - 1 };
}

export function applyToggleHold(state: YatzyState, index: number): YatzyState {
  if (state.rollsLeft === 3) return state; // haven't rolled yet
  const held = [...state.held];
  held[index] = !held[index];
  return { ...state, held };
}

export function applyScoreCategory(state: YatzyState, category: CategoryKey): YatzyState {
  const player = state.players[state.currentPlayerIndex];
  if (player.scoreCard[category] !== undefined) return state; // already scored

  const score = scoreCategory(category, state.dice);
  const updatedPlayer: Player = {
    ...player,
    scoreCard: { ...player.scoreCard, [category]: score },
  };

  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? updatedPlayer : p
  );

  // Check if game is over
  const allDone = newPlayers.every(p => isScoreCardComplete(p.scoreCard));
  if (allDone) {
    const scores = newPlayers.map(p => totalScore(p.scoreCard));
    const max = Math.max(...scores);
    const winnerIndex = scores.indexOf(max);
    return {
      ...state,
      players: newPlayers,
      status: 'finished',
      winnerIndex,
    };
  }

  // Advance to next player
  const nextPlayerIndex = (state.currentPlayerIndex + 1) % newPlayers.length;
  return {
    ...state,
    players: newPlayers,
    currentPlayerIndex: nextPlayerIndex,
    dice: createInitialDice(),
    held: [false, false, false, false, false],
    rollsLeft: 3,
  };
}
