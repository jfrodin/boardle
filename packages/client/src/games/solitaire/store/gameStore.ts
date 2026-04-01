import { create } from 'zustand';
import {
  type Card,
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
  canAutoComplete,
} from '../engine.ts';

interface SolitaireStore {
  gameState: SolitaireState | null;
  selected: CardSource | null;
  validTargets: CardTarget[];

  newGame: (drawMode?: 1 | 3) => void;
  clickStock: () => void;
  clickCard: (src: CardSource) => void;
  clickTarget: (target: CardTarget) => void;
  autoMoveToFoundation: (src: CardSource) => void;
  tryAutoComplete: () => void;
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

export const useSolitaireStore = create<SolitaireStore>((set, get) => ({
  gameState: null,
  selected: null,
  validTargets: [],

  newGame: (drawMode = 1) =>
    set({ gameState: createInitialState(drawMode), selected: null, validTargets: [] }),

  clickStock: () => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: drawFromStock(gameState), selected: null, validTargets: [] });
  },

  clickCard: (src) => {
    const { gameState, selected } = get();
    if (!gameState) return;

    // If something is selected, try to move it to where we just clicked
    if (selected) {
      const target = deriveTarget(src);
      if (target && isValidMove(gameState, selected, target)) {
        set({ gameState: applyMove(gameState, selected, target), selected: null, validTargets: [] });
        return;
      }
    }

    // Try to select the clicked card
    if (isSourcePlayable(gameState, src)) {
      const targets = getValidTargets(gameState, src);
      // If clicking the already-selected card, deselect
      if (
        selected &&
        selected.area === src.area &&
        (src.area !== 'tableau' || (selected.area === 'tableau' && selected.col === src.col && selected.cardIndex === src.cardIndex))
      ) {
        set({ selected: null, validTargets: [] });
        return;
      }
      set({ selected: src, validTargets: targets });
    } else {
      set({ selected: null, validTargets: [] });
    }
  },

  clickTarget: (target) => {
    const { gameState, selected } = get();
    if (!gameState || !selected) return;
    if (isValidMove(gameState, selected, target)) {
      set({ gameState: applyMove(gameState, selected, target), selected: null, validTargets: [] });
    }
  },

  autoMoveToFoundation: (src) => {
    const { gameState } = get();
    if (!gameState) return;
    const move = findAutoMoveToFoundation({ ...gameState });
    // Only auto-move if the src card matches what would be moved
    if (!move) return;
    const srcCard = src.area === 'waste'
      ? gameState.waste[gameState.waste.length - 1]
      : src.area === 'tableau'
        ? gameState.tableau[src.col][src.cardIndex]
        : null;
    const moveCard = move.src.area === 'waste'
      ? gameState.waste[gameState.waste.length - 1]
      : move.src.area === 'tableau'
        ? gameState.tableau[(move.src as { area: 'tableau'; col: number; cardIndex: number }).col][(move.src as { area: 'tableau'; col: number; cardIndex: number }).cardIndex]
        : null;
    if (srcCard && moveCard && srcCard.suit === moveCard.suit && srcCard.rank === moveCard.rank) {
      set({ gameState: applyMove(gameState, move.src, move.target), selected: null, validTargets: [] });
    }
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
    set({ gameState: state, selected: null, validTargets: [] });
  },
}));
