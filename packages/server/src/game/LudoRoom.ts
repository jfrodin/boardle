import { randomUUID } from 'crypto';
import type { WebSocket } from '@fastify/websocket';
import type {
  LudoGameState,
  LudoMove,
  LudoColor,
  AiSkill,
  ServerMessage,
  ClientMessage,
} from '@boardly/shared';
import {
  LUDO_COLORS,
  createInitialLudoState,
  applyLudoRoll,
  applyLudoMove,
  isLegalLudoMove,
  getLegalLudoMoves,
} from '@boardly/shared';
import { getLudoAiMove } from '../games/ludo/LudoAI.js';

const RECONNECT_GRACE_MS = 30_000;
const TURN_TIMEOUT_MS = 90_000;
const AI_ROLL_DELAY_MS = 600;
const AI_MOVE_DELAY_MS = 400;
const QUEUE_START_TIMEOUT_MS = 15_000;

interface HumanSlot {
  kind: 'human';
  ws: WebSocket | null;
  color: LudoColor;
  username: string;
  disconnectTimer?: ReturnType<typeof setTimeout>;
}

interface BotSlot {
  kind: 'bot';
  color: LudoColor;
  username: string;
}

type Slot = HumanSlot | BotSlot;

const BOT_NAMES: Record<LudoColor, string> = {
  RED: 'Bot Red',
  GREEN: 'Bot Green',
  YELLOW: 'Bot Yellow',
  BLUE: 'Bot Blue',
};

export class LudoRoom {
  readonly id: string;
  readonly skill: AiSkill;

  private state!: LudoGameState;
  private slots: Slot[] = [];
  private closed = false;
  private turnTimer?: ReturnType<typeof setTimeout>;
  private startTimer?: ReturnType<typeof setTimeout>;
  private onEmpty?: () => void;

  constructor(skill: AiSkill) {
    this.id = randomUUID();
    this.skill = skill;
  }

  setOnEmpty(cb: () => void): void {
    this.onEmpty = cb;
  }

  get humanCount(): number {
    return this.slots.filter(s => s.kind === 'human').length;
  }

  get isFull(): boolean {
    return this.humanCount >= 4;
  }

  hasPlayer(ws: WebSocket): boolean {
    return this.slots.some(s => s.kind === 'human' && s.ws === ws);
  }

  /** Add a human player; returns their assigned color, or throws if full. */
  addHuman(ws: WebSocket, username: string): LudoColor {
    if (this.isFull) throw new Error('Room is full');
    const usedColors = new Set(this.slots.map(s => s.color));
    const color = LUDO_COLORS.find(c => !usedColors.has(c))!;
    this.slots.push({ kind: 'human', ws, color, username });
    return color;
  }

  /**
   * Schedule auto-start: fill remaining slots with bots after timeout.
   * Called after the first human joins.
   */
  scheduleStart(): void {
    this.startTimer = setTimeout(() => {
      this.fillWithBots();
      this.start();
    }, QUEUE_START_TIMEOUT_MS);
  }

  cancelStartTimer(): void {
    if (this.startTimer) {
      clearTimeout(this.startTimer);
      this.startTimer = undefined;
    }
  }

  private fillWithBots(): void {
    const usedColors = new Set(this.slots.map(s => s.color));
    for (const color of LUDO_COLORS) {
      if (!usedColors.has(color)) {
        this.slots.push({ kind: 'bot', color, username: BOT_NAMES[color] });
      }
    }
  }

  start(): void {
    this.cancelStartTimer();
    // Ensure all 4 slots filled
    this.fillWithBots();

    const playerNames = {} as Record<LudoColor, string>;
    const isBot = {} as Record<LudoColor, boolean>;
    for (const slot of this.slots) {
      playerNames[slot.color] = slot.username;
      isBot[slot.color] = slot.kind === 'bot';
    }

    this.state = createInitialLudoState(playerNames, isBot);

    for (const slot of this.slots) {
      if (slot.kind === 'human' && slot.ws) {
        this.send(slot.ws, {
          type: 'LUDO_GAME_START',
          state: this.state,
          myColor: slot.color,
          skill: this.skill,
          roomId: this.id,
        });
      }
    }

    this.startTurnTimer();
    this.maybeRunBots();
  }

  handleMessage(ws: WebSocket, msg: ClientMessage): void {
    if (this.closed) return;
    const slot = this.slots.find(s => s.kind === 'human' && s.ws === ws) as HumanSlot | undefined;
    if (!slot) return;

    if (msg.type === 'LUDO_ROLL') {
      if (slot.color !== this.state.currentColor) return;
      if (this.state.dice !== null) return;
      this.doRoll();
    } else if (msg.type === 'LUDO_MOVE') {
      if (slot.color !== this.state.currentColor) return;
      if (this.state.dice === null) return;
      this.handleMove({ pieceIndex: msg.pieceIndex });
    } else if (msg.type === 'LEAVE_ROOM') {
      this.handleLeave(ws);
    }
  }

  private doRoll(): void {
    const dice = Math.floor(Math.random() * 6) + 1;
    this.state = applyLudoRoll(this.state, dice);
    this.broadcast({ type: 'LUDO_STATE_UPDATE', state: this.state, lastMove: null });

    if (this.state.status === 'FINISHED') {
      this.broadcast({ type: 'LUDO_GAME_OVER', state: this.state });
      this.clearTurnTimer();
      return;
    }

    // If after rolling it's auto-passed to next player, check bots
    this.resetTurnTimer();
    this.maybeRunBots();
  }

  private handleMove(move: LudoMove): void {
    if (this.state.status !== 'ACTIVE') return;
    if (!isLegalLudoMove(this.state, move)) {
      return;
    }

    this.clearTurnTimer();
    this.state = applyLudoMove(this.state, move);

    if (this.state.status === 'FINISHED') {
      this.broadcast({ type: 'LUDO_GAME_OVER', state: this.state });
      return;
    }

    this.broadcast({ type: 'LUDO_STATE_UPDATE', state: this.state, lastMove: move });
    this.startTurnTimer();
    this.maybeRunBots();
  }

  private maybeRunBots(): void {
    if (this.closed || this.state.status !== 'ACTIVE') return;
    const currentSlot = this.slots.find(s => s.color === this.state.currentColor);
    if (!currentSlot || currentSlot.kind !== 'bot') return;

    if (this.state.dice === null) {
      // Bot needs to roll
      setTimeout(() => {
        if (this.closed || this.state.status !== 'ACTIVE') return;
        if (this.state.currentColor !== currentSlot.color) return;
        this.doRoll();
      }, AI_ROLL_DELAY_MS);
    } else {
      // Bot needs to move
      setTimeout(() => {
        if (this.closed || this.state.status !== 'ACTIVE') return;
        if (this.state.currentColor !== currentSlot.color) return;
        const moves = getLegalLudoMoves(this.state);
        if (moves.length === 0) return;
        const move = getLudoAiMove(this.state, this.skill);
        this.handleMove(move);
      }, AI_MOVE_DELAY_MS);
    }
  }

  private startTurnTimer(): void {
    this.clearTurnTimer();
    // Only time out human turns
    const currentSlot = this.slots.find(s => s.color === this.state.currentColor);
    if (!currentSlot || currentSlot.kind !== 'human') return;

    this.turnTimer = setTimeout(() => {
      if (this.state.status !== 'ACTIVE') return;
      // Auto-roll then auto-skip for timed-out player
      if (this.state.dice === null) {
        const dice = Math.floor(Math.random() * 6) + 1;
        this.state = applyLudoRoll(this.state, dice);
      }
      // Skip move — advance turn
      this.state = { ...this.state, dice: null, currentColor: this.nextActiveColor() };
      this.broadcast({ type: 'LUDO_STATE_UPDATE', state: this.state, lastMove: null });
      this.startTurnTimer();
      this.maybeRunBots();
    }, TURN_TIMEOUT_MS);
  }

  private resetTurnTimer(): void {
    this.clearTurnTimer();
    this.startTurnTimer();
  }

  private clearTurnTimer(): void {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = undefined;
    }
  }

  private nextActiveColor(): LudoColor {
    const idx = LUDO_COLORS.indexOf(this.state.currentColor);
    for (let i = 1; i <= 4; i++) {
      const c = LUDO_COLORS[(idx + i) % 4];
      if (!this.state.finished.includes(c)) return c;
    }
    return this.state.currentColor;
  }

  handleDisconnect(ws: WebSocket): void {
    const slot = this.slots.find(s => s.kind === 'human' && s.ws === ws) as HumanSlot | undefined;
    if (!slot) return;
    slot.ws = null;

    this.broadcast({ type: 'OPPONENT_DISCONNECTED' });

    slot.disconnectTimer = setTimeout(() => {
      // Replace disconnected player with a bot
      const idx = this.slots.indexOf(slot);
      this.slots[idx] = { kind: 'bot', color: slot.color, username: `Bot (${slot.color})` };
      // Update isBot in state
      if (this.state) {
        this.state = { ...this.state, isBot: { ...this.state.isBot, [slot.color]: true } };
        this.broadcast({ type: 'LUDO_STATE_UPDATE', state: this.state, lastMove: null });
      }
      if (this.humanCount === 0) {
        this.closed = true;
        this.clearTurnTimer();
        this.onEmpty?.();
      }
    }, RECONNECT_GRACE_MS);
  }

  tryReconnect(ws: WebSocket, color: LudoColor): boolean {
    const slot = this.slots.find(s => s.kind === 'human' && s.color === color && s.ws === null) as HumanSlot | undefined;
    if (!slot) return false;
    if (slot.disconnectTimer) {
      clearTimeout(slot.disconnectTimer);
      slot.disconnectTimer = undefined;
    }
    slot.ws = ws;
    this.send(ws, {
      type: 'LUDO_GAME_START',
      state: this.state,
      myColor: color,
      skill: this.skill,
      roomId: this.id,
    });
    return true;
  }

  private handleLeave(ws: WebSocket): void {
    this.clearTurnTimer();
    this.cancelStartTimer();
    this.closed = true;
    this.onEmpty?.();
    ws.close();
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  }

  private broadcast(msg: ServerMessage): void {
    for (const slot of this.slots) {
      if (slot.kind === 'human' && slot.ws) this.send(slot.ws, msg);
    }
  }
}
