import { create } from 'zustand';
import type { YatzyState, CategoryKey, PlayerKind } from '../engine.ts';
import {
  createInitialState,
  applyRoll,
  applyToggleHold,
  applyScoreCategory,
  createPlayer,
} from '../engine.ts';
import { runBotTurn } from '../bot.ts';

export type BotSpeed = 'fast' | 'normal' | 'slow';
const BOT_DELAYS: Record<BotSpeed, number> = { fast: 300, normal: 700, slow: 1400 };

interface YatzyStore {
  gameState: YatzyState | null;
  botThinking: boolean;
  botSpeed: BotSpeed;

  startGame: (players: { name: string; kind: PlayerKind }[]) => void;
  roll: () => void;
  toggleHold: (index: number) => void;
  scoreCategory: (category: CategoryKey) => void;
  setBotSpeed: (speed: BotSpeed) => void;
  reset: () => void;
}

async function runBotsUntilHuman(
  state: YatzyState,
  setState: (s: YatzyState) => void,
  setBotThinking: (v: boolean) => void,
  delay: number,
): Promise<void> {
  let s = state;
  while (s.status === 'playing' && s.players[s.currentPlayerIndex].kind === 'bot') {
    setBotThinking(true);
    s = await runBotTurn(s, setState, delay);
    setState(s);
  }
  setBotThinking(false);
}

export const useYatzyStore = create<YatzyStore>((set, get) => ({
  gameState: null,
  botThinking: false,
  botSpeed: 'normal',

  startGame: (players) => {
    const playerList = players.map((p, i) => createPlayer(`p${i}`, p.name, p.kind));
    const state = createInitialState(playerList);
    const delay = BOT_DELAYS[get().botSpeed];
    set({ gameState: state, botThinking: false });
    if (playerList[0].kind === 'bot') {
      void runBotsUntilHuman(
        state,
        (s) => set({ gameState: s }),
        (v) => set({ botThinking: v }),
        delay,
      );
    }
  },

  roll: () => {
    const { gameState } = get();
    if (!gameState || gameState.rollsLeft === 0 || gameState.status === 'finished') return;
    set({ gameState: applyRoll(gameState) });
  },

  toggleHold: (index) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: applyToggleHold(gameState, index) });
  },

  scoreCategory: (category) => {
    const { gameState } = get();
    if (!gameState || gameState.status === 'finished') return;
    const player = gameState.players[gameState.currentPlayerIndex];
    if (player.kind !== 'human') return;
    if (player.scoreCard[category] !== undefined) return;
    if (gameState.rollsLeft === 3) return;

    const next = applyScoreCategory(gameState, category);
    const delay = BOT_DELAYS[get().botSpeed];
    set({ gameState: next });

    if (next.status === 'playing') {
      void runBotsUntilHuman(
        next,
        (s) => set({ gameState: s }),
        (v) => set({ botThinking: v }),
        delay,
      );
    }
  },

  setBotSpeed: (speed) => set({ botSpeed: speed }),

  reset: () => set({ gameState: null, botThinking: false }),
}));
