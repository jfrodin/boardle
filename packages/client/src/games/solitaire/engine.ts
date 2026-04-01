export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export interface SolitaireState {
  stock: Card[];                   // top = last element
  waste: Card[];                   // top = last element
  foundations: Record<Suit, Card[]>; // top = last element
  tableau: Card[][];               // 7 columns; top = last element
  status: 'playing' | 'won';
  moves: number;
  drawMode: 1 | 3;
}

export type CardSource =
  | { area: 'waste' }
  | { area: 'foundation'; suit: Suit }
  | { area: 'tableau'; col: number; cardIndex: number };

export type CardTarget =
  | { area: 'foundation'; suit: Suit }
  | { area: 'tableau'; col: number };

// ---- Helpers ----

export function isRed(suit: Suit): boolean {
  return suit === 'H' || suit === 'D';
}

export function rankLabel(rank: Rank): string {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

export function suitSymbol(suit: Suit): string {
  return { S: '♠', H: '♥', D: '♦', C: '♣' }[suit];
}

function createDeck(): Card[] {
  const suits: Suit[] = ['S', 'H', 'D', 'C'];
  const cards: Card[] = [];
  for (const suit of suits) {
    for (let r = 1; r <= 13; r++) {
      cards.push({ suit, rank: r as Rank, faceUp: false });
    }
  }
  return cards;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cloneState(s: SolitaireState): SolitaireState {
  return {
    stock: [...s.stock],
    waste: [...s.waste],
    foundations: { S: [...s.foundations.S], H: [...s.foundations.H], D: [...s.foundations.D], C: [...s.foundations.C] },
    tableau: s.tableau.map(col => col.map(c => ({ ...c }))),
    status: s.status,
    moves: s.moves,
    drawMode: s.drawMode,
  };
}

// ---- Init ----

export function createInitialState(drawMode: 1 | 3 = 1): SolitaireState {
  const deck = shuffle(createDeck());
  const tableau: Card[][] = [];
  let idx = 0;
  for (let col = 0; col < 7; col++) {
    const pile: Card[] = [];
    for (let i = 0; i <= col; i++) {
      pile.push({ ...deck[idx++], faceUp: i === col });
    }
    tableau.push(pile);
  }
  const stock = deck.slice(idx).map(c => ({ ...c, faceUp: false }));
  return { stock, waste: [], foundations: { S: [], H: [], D: [], C: [] }, tableau, status: 'playing', moves: 0, drawMode };
}

// ---- Placement rules ----

export function canPlaceOnFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) return card.rank === 1;
  const top = foundation[foundation.length - 1];
  return top.suit === card.suit && card.rank === top.rank + 1;
}

export function canPlaceOnTableau(card: Card, pile: Card[]): boolean {
  if (pile.length === 0) return card.rank === 13;
  const top = pile[pile.length - 1];
  if (!top.faceUp) return false;
  return isRed(top.suit) !== isRed(card.suit) && card.rank === top.rank - 1;
}

// ---- Source cards ----

function getSourceCards(state: SolitaireState, src: CardSource): Card[] {
  switch (src.area) {
    case 'waste': {
      const top = state.waste[state.waste.length - 1];
      return top ? [top] : [];
    }
    case 'foundation':
      return state.foundations[src.suit].slice(-1);
    case 'tableau':
      return state.tableau[src.col].slice(src.cardIndex);
  }
}

// ---- Move validation ----

export function isValidMove(state: SolitaireState, src: CardSource, target: CardTarget): boolean {
  const cards = getSourceCards(state, src);
  if (cards.length === 0) return false;
  const card = cards[0];

  if (target.area === 'foundation') {
    if (cards.length > 1) return false;
    return canPlaceOnFoundation(card, state.foundations[target.suit]);
  }

  if (target.area === 'tableau') {
    if (src.area === 'tableau' && src.col === target.col) return false;
    return canPlaceOnTableau(card, state.tableau[target.col]);
  }

  return false;
}

export function getValidTargets(state: SolitaireState, src: CardSource): CardTarget[] {
  const targets: CardTarget[] = [];
  const suits: Suit[] = ['S', 'H', 'D', 'C'];
  for (const suit of suits) {
    if (isValidMove(state, src, { area: 'foundation', suit })) {
      targets.push({ area: 'foundation', suit });
    }
  }
  for (let col = 0; col < 7; col++) {
    if (isValidMove(state, src, { area: 'tableau', col })) {
      targets.push({ area: 'tableau', col });
    }
  }
  return targets;
}

// ---- Apply move ----

export function applyMove(state: SolitaireState, src: CardSource, target: CardTarget): SolitaireState {
  const next = cloneState(state);
  const cards = getSourceCards(state, src).map(c => ({ ...c, faceUp: true }));

  // Remove from source
  if (src.area === 'waste') {
    next.waste.pop();
  } else if (src.area === 'foundation') {
    next.foundations[src.suit].pop();
  } else {
    next.tableau[src.col] = next.tableau[src.col].slice(0, src.cardIndex);
    // Flip newly exposed top card
    const col = next.tableau[src.col];
    if (col.length > 0 && !col[col.length - 1].faceUp) {
      col[col.length - 1] = { ...col[col.length - 1], faceUp: true };
    }
  }

  // Place at target
  if (target.area === 'foundation') {
    next.foundations[target.suit].push(...cards);
  } else {
    next.tableau[target.col].push(...cards);
  }

  next.moves++;

  // Check win
  if ((['S', 'H', 'D', 'C'] as Suit[]).every(s => next.foundations[s].length === 13)) {
    next.status = 'won';
  }

  return next;
}

// ---- Draw from stock ----

export function drawFromStock(state: SolitaireState): SolitaireState {
  const next = cloneState(state);
  if (next.stock.length === 0) {
    // Recycle waste back to stock
    next.stock = next.waste.reverse().map(c => ({ ...c, faceUp: false }));
    next.waste = [];
  } else {
    const count = Math.min(next.drawMode, next.stock.length);
    for (let i = 0; i < count; i++) {
      const card = next.stock.pop()!;
      next.waste.push({ ...card, faceUp: true });
    }
  }
  next.moves++;
  return next;
}

// ---- Auto-move helpers ----

export function findAutoMoveToFoundation(state: SolitaireState): { src: CardSource; target: CardTarget } | null {
  const suits: Suit[] = ['S', 'H', 'D', 'C'];

  // Check waste top
  if (state.waste.length > 0) {
    const card = state.waste[state.waste.length - 1];
    for (const suit of suits) {
      if (card.suit === suit && canPlaceOnFoundation(card, state.foundations[suit])) {
        return { src: { area: 'waste' }, target: { area: 'foundation', suit } };
      }
    }
  }

  // Check tableau tops
  for (let col = 0; col < 7; col++) {
    const pile = state.tableau[col];
    if (pile.length === 0) continue;
    const card = pile[pile.length - 1];
    if (!card.faceUp) continue;
    for (const suit of suits) {
      if (card.suit === suit && canPlaceOnFoundation(card, state.foundations[suit])) {
        return { src: { area: 'tableau', col, cardIndex: pile.length - 1 }, target: { area: 'foundation', suit } };
      }
    }
  }

  return null;
}

export function canAutoComplete(state: SolitaireState): boolean {
  if (state.status !== 'playing') return false;
  if (state.stock.length > 0 || state.waste.length > 0) return false;
  return state.tableau.every(col => col.every(c => c.faceUp));
}
