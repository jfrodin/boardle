import { create } from 'zustand';
import {
  type CardSource,
  type CardTarget,
  type Suit,
  type SolitaireState,
  createInitialState,
  drawFromStock,
  applyMove,
  getValidTargets,
  isValidMove,
  findAutoMoveToFoundation,
  findHint,
  canAutoComplete,
} from '../engine.ts';

interface SolitaireStore {
  gameState: SolitaireState | null;
  selected: CardSource | null;
  validTargets: CardTarget[];
  history: SolitaireState[];
  hint: { src: CardSource; target: CardTarget } | null;

  newGame: (drawMode?: 1 | 3) => void;
  clickStock: () => void;
  clickCard: (src: CardSource) => void;
  clickTarget: (target: CardTarget) => void;
  autoMoveToFoundation: (src: CardSource) => void;
  directMove: (src: CardSource, target: CardTarget) => void;
  tryAutoComplete: () => void;
  undo: () => void;
  showHint: () => void;
}

function deriveTarget(src: CardSource): CardTarget | null {
  if (src.area === 'foundation') return { area: 'foundation', suit: src.suit };
  if (src.area === 'tableau') return { area: 'tableau', col: src.col };
  return null;
}

function isSourcePlayable(state: SolitaireState, src: CardSource): boolean {
  if (src.area === 'waste') return state.waste.length > 0;
  if (src.area === 'foundation') {
    return state.foundations[src.suit as Suit].length > 0;
  }
  if (src.area === 'tableau') {
    const card = state.tableau[src.col][src.cardIndex];
    return !!card?.faceUp;
  }
  return false;
}

function pushHistory(current: SolitaireState, history: SolitaireState[]): SolitaireState[] {
  return [...history.slice(-29), current];
}

export const useSolitaireStore = create<SolitaireStore>((set, get) => ({
  gameState: null,
  selected: null,
  validTargets: [],
  history: [],
  hint: null,

  newGame: (drawMode = 1) =>
    set({ gameState: createInitialState(drawMode), selected: null, validTargets: [], history: [], hint: null }),

  clickStock: () => {
    const { gameState, history } = get();
    if (!gameState) return;
    set({
      gameState: drawFromStock(gameState),
      history: pushHistory(gameState, history),
      selected: null,
      validTargets: [],
      hint: null,
    });
  },

  clickCard: (src) => {
    const { gameState, selected, history } = get();
    if (!gameState) return;

    if (selected) {
      const target = deriveTarget(src);
      if (target && isValidMove(gameState, selected, target)) {
        set({
          gameState: applyMove(gameState, selected, target),
          history: pushHistory(gameState, history),
          selected: null,
          validTargets: [],
          hint: null,
        });
        return;
      }
    }

    if (isSourcePlayable(gameState, src)) {
      const targets = getValidTargets(gameState, src);
      if (
        selected &&
        selected.area === src.area &&
        (src.area !== 'tableau' || (selected.area === 'tableau' && selected.col === src.col && selected.cardIndex === src.cardIndex))
      ) {
        set({ selected: null, validTargets: [], hint: null });
        return;
      }
      set({ selected: src, validTargets: targets, hint: null });
    } else {
      set({ selected: null, validTargets: [], hint: null });
    }
  },

  clickTarget: (target) => {
    const { gameState, selected, history } = get();
    if (!gameState || !selected) return;
    if (isValidMove(gameState, selected, target)) {
      set({
        gameState: applyMove(gameState, selected, target),
        history: pushHistory(gameState, history),
        selected: null,
        validTargets: [],
        hint: null,
      });
    }
  },

  autoMoveToFoundation: (src) => {
    const { gameState, history } = get();
    if (!gameState) return;

    // Get the specific card from the given source
    let card = null;
    if (src.area === 'waste') {
      card = gameState.waste[gameState.waste.length - 1] ?? null;
    } else if (src.area === 'tableau') {
      card = gameState.tableau[src.col][src.cardIndex] ?? null;
    }
    if (!card?.faceUp) return;

    // Try to move directly to this card's foundation pile
    const target: CardTarget = { area: 'foundation', suit: card.suit };
    if (!isValidMove(gameState, src, target)) return;

    set({
      gameState: applyMove(gameState, src, target),
      history: pushHistory(gameState, history),
      selected: null,
      validTargets: [],
      hint: null,
    });
  },

  directMove: (src, target) => {
    const { gameState, history } = get();
    if (!gameState) return;
    if (!isValidMove(gameState, src, target)) return;
    set({
      gameState: applyMove(gameState, src, target),
      history: pushHistory(gameState, history),
      selected: null,
      validTargets: [],
      hint: null,
    });
  },

  tryAutoComplete: () => {
    const { gameState } = get();
    if (!gameState || !canAutoComplete(gameState)) return;
    let state = gameState;
    while (true) {
      const move = findAutoMoveToFoundation(state);
      if (!move) break;
      state = applyMove(state, move.src, move.target);
    }
    set({ gameState: state, selected: null, validTargets: [], history: [], hint: null });
  },

  undo: () => {
    const { history } = get();
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    set({ gameState: prev, history: history.slice(0, -1), selected: null, validTargets: [], hint: null });
  },

  showHint: () => {
    const { gameState } = get();
    if (!gameState || gameState.status === 'won') return;
    const hint = findHint(gameState);
    set({ hint });
    setTimeout(() => set({ hint: null }), 2500);
  },
}));
