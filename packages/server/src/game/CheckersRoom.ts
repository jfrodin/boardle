import { randomUUID } from 'crypto';
import type { WebSocket } from '@fastify/websocket';
import type {
  CheckersGameState,
  CheckersMove,
  PlayerSide,
  AiSkill,
  ServerMessage,
  ClientMessage,
  GameMode,
} from '@boardly/shared';
import {
  createInitialCheckersState,
  applyCheckersMove,
  isLegalCheckersMove,
} from '@boardly/shared';
import { getCheckersAiMove } from '../games/checkers/CheckersAI.js';

const RECONNECT_GRACE_MS = 30_000;
const TURN_TIMEOUT_MS = 60_000;
const DEFAULT_AI_DELAY_MS = 600;

interface Player {
  ws: WebSocket | null;
  side: PlayerSide;
  username: string;
  opponentUsername: string;
  disconnectTimer?: ReturnType<typeof setTimeout>;
}

export class CheckersRoom {
  readonly id: string;
  readonly mode: GameMode;
  readonly skill?: AiSkill;

  private state: CheckersGameState;
  private players: Player[] = [];
  private closed = false;
  private aiDelayMs: number;
  private turnTimer?: ReturnType<typeof setTimeout>;
  private rematchVotes = new Set<PlayerSide>();
  private onEmpty?: () => void;

  constructor(mode: GameMode, skill?: AiSkill, aiDelayMs?: number) {
    this.id = randomUUID();
    this.mode = mode;
    this.skill = skill;
    this.aiDelayMs = aiDelayMs ?? DEFAULT_AI_DELAY_MS;
    this.state = createInitialCheckersState();
  }

  setOnEmpty(cb: () => void): void {
    this.onEmpty = cb;
  }

  get isFull(): boolean {
    return this.players.length >= (this.mode === 'ai' ? 1 : 2);
  }

  hasPlayer(ws: WebSocket): boolean {
    return this.players.some(p => p.ws === ws);
  }

  addPlayer(ws: WebSocket, username: string, opponentUsername: string): PlayerSide {
    if (this.isFull) throw new Error('Room is full');
    const side: PlayerSide = this.players.length === 0 ? 'SOUTH' : 'NORTH';
    this.players.push({ ws, side, username, opponentUsername });
    return side;
  }

  start(): void {
    this.state = createInitialCheckersState();
    this.rematchVotes.clear();
    for (const player of this.players) {
      if (player.ws) {
        this.send(player.ws, {
          type: 'CHECKERS_GAME_START',
          state: this.state,
          side: player.side,
          mode: this.mode,
          skill: this.skill,
          opponentUsername: player.opponentUsername,
        });
      }
    }
    if (this.mode === 'online') this.startTurnTimer();
  }

  handleMessage(ws: WebSocket, msg: ClientMessage): void {
    if (this.closed) return;
    const player = this.players.find(p => p.ws === ws);
    if (!player) return;

    if (msg.type === 'CHECKERS_MOVE') {
      this.handleMove(player, msg.move);
    } else if (msg.type === 'REMATCH') {
      this.handleRematch(player);
    } else if (msg.type === 'LEAVE_ROOM') {
      this.handleLeave(ws);
    }
  }

  private handleMove(player: Player, move: CheckersMove): void {
    if (this.state.status !== 'ACTIVE') return;
    if (player.side !== this.state.currentTurn) {
      this.send(player.ws!, { type: 'ERROR', code: 'NOT_YOUR_TURN', message: 'Not your turn' });
      return;
    }
    if (!isLegalCheckersMove(this.state, move)) {
      this.send(player.ws!, { type: 'ERROR', code: 'ILLEGAL_MOVE', message: 'Illegal move' });
      return;
    }

    this.clearTurnTimer();
    this.state = applyCheckersMove(this.state, move);

    if (this.state.status === 'FINISHED') {
      this.broadcast({ type: 'CHECKERS_GAME_OVER', state: this.state, lastMove: move });
      this.cleanupIfAi();
      return;
    }

    this.broadcast({ type: 'CHECKERS_STATE_UPDATE', state: this.state, lastMove: move });

    if (this.mode === 'ai' && this.state.currentTurn === 'NORTH') {
      this.triggerAiMove();
    } else if (this.mode === 'online') {
      this.startTurnTimer();
    }
  }

  private triggerAiMove(): void {
    setTimeout(() => {
      if (this.closed || this.state.status !== 'ACTIVE' || !this.skill) return;
      const aiMove = getCheckersAiMove(this.state, this.skill);
      this.state = applyCheckersMove(this.state, aiMove);

      if (this.state.status === 'FINISHED') {
        this.broadcast({ type: 'CHECKERS_GAME_OVER', state: this.state, lastMove: aiMove });
        this.cleanupIfAi();
        return;
      }

      this.broadcast({ type: 'CHECKERS_STATE_UPDATE', state: this.state, lastMove: aiMove });
    }, this.aiDelayMs);
  }

  private handleRematch(player: Player): void {
    if (this.mode === 'ai') {
      this.doRematch();
      return;
    }
    this.rematchVotes.add(player.side);
    if (this.rematchVotes.size < 2) {
      this.broadcastExcept(player.ws!, { type: 'REMATCH_REQUESTED' });
      return;
    }
    this.doRematch();
  }

  private doRematch(): void {
    this.clearTurnTimer();
    this.rematchVotes.clear();
    for (const player of this.players) {
      player.side = player.side === 'SOUTH' ? 'NORTH' : 'SOUTH';
    }
    this.start();
  }

  private startTurnTimer(): void {
    this.clearTurnTimer();
    this.turnTimer = setTimeout(() => {
      if (this.state.status !== 'ACTIVE') return;
      const timedOutSide = this.state.currentTurn;
      this.broadcast({ type: 'TURN_TIMEOUT', side: timedOutSide });
      this.state = {
        ...this.state,
        status: 'FINISHED',
        winner: timedOutSide === 'SOUTH' ? 'NORTH' : 'SOUTH',
      };
      this.broadcast({ type: 'CHECKERS_GAME_OVER', state: this.state });
    }, TURN_TIMEOUT_MS);
  }

  private clearTurnTimer(): void {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = undefined;
    }
  }

  private cleanupIfAi(): void {
    if (this.mode === 'ai') {
      this.closed = true;
      this.onEmpty?.();
    }
  }

  handleDisconnect(ws: WebSocket): void {
    const player = this.players.find(p => p.ws === ws);
    if (!player) return;
    player.ws = null;

    if (this.mode === 'online') {
      this.broadcastExcept(ws, { type: 'OPPONENT_DISCONNECTED' });
      player.disconnectTimer = setTimeout(() => {
        this.closed = true;
        this.clearTurnTimer();
        this.onEmpty?.();
      }, RECONNECT_GRACE_MS);
    } else {
      this.closed = true;
      this.clearTurnTimer();
      this.onEmpty?.();
    }
  }

  tryReconnect(ws: WebSocket, side: PlayerSide): boolean {
    const player = this.players.find(p => p.side === side && p.ws === null);
    if (!player) return false;
    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = undefined;
    }
    player.ws = ws;
    this.send(ws, {
      type: 'CHECKERS_GAME_START',
      state: this.state,
      side,
      mode: this.mode,
      skill: this.skill,
      opponentUsername: player.opponentUsername,
    });
    return true;
  }

  private handleLeave(ws: WebSocket): void {
    this.clearTurnTimer();
    this.closed = true;
    // End the game for the opponent rather than sending OPPONENT_DISCONNECTED
    if (this.mode === 'online' && this.state.status === 'ACTIVE') {
      const leavingPlayer = this.players.find(p => p.ws === ws);
      if (leavingPlayer) {
        const winner = leavingPlayer.side === 'SOUTH' ? 'NORTH' : 'SOUTH';
        this.state = { ...this.state, status: 'FINISHED', winner };
        this.broadcastExcept(ws, { type: 'CHECKERS_GAME_OVER', state: this.state });
      }
    }
    this.onEmpty?.();
    ws.close();
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  }

  private broadcast(msg: ServerMessage): void {
    for (const player of this.players) {
      if (player.ws) this.send(player.ws, msg);
    }
  }

  private broadcastExcept(exclude: WebSocket, msg: ServerMessage): void {
    for (const player of this.players) {
      if (player.ws && player.ws !== exclude) this.send(player.ws, msg);
    }
  }
}
