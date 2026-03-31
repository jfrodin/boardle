import { randomUUID } from 'crypto';
import type { WebSocket } from '@fastify/websocket';
import type {
  GameState,
  Move,
  PlayerSide,
  AiSkill,
  ServerMessage,
  ClientMessage,
  GameMode,
} from '@boardly/shared';
import { createInitialState, applyMove, isLegalMove } from '@boardly/shared';
import { getAiMove } from '../games/kalaha/AiPlayer.js';

const RECONNECT_GRACE_MS = 30_000;
const DEFAULT_AI_DELAY_MS = 400;

interface Player {
  ws: WebSocket | null;
  side: PlayerSide;
  username: string;
  /** Username of the opponent, sent in GAME_START */
  opponentUsername: string;
  disconnectTimer?: ReturnType<typeof setTimeout>;
}

export class GameRoom {
  readonly id: string;
  readonly mode: GameMode;
  readonly skill?: AiSkill;

  private state: GameState;
  private players: Player[] = [];
  private closed = false;
  private aiDelayMs: number;

  constructor(mode: GameMode, skill?: AiSkill, aiDelayMs?: number) {
    this.id = randomUUID();
    this.mode = mode;
    this.skill = skill;
    this.aiDelayMs = aiDelayMs ?? DEFAULT_AI_DELAY_MS;
    this.state = createInitialState();
  }

  get isFull(): boolean {
    return this.players.length >= (this.mode === 'ai' ? 1 : 2);
  }

  get playerCount(): number {
    return this.players.filter(p => p.ws !== null).length;
  }

  /**
   * Add a player to the room.
   * @param username - display name for this player
   * @param opponentUsername - display name shown to this player for their opponent
   */
  addPlayer(ws: WebSocket, username: string, opponentUsername: string): PlayerSide {
    if (this.isFull) throw new Error('Room is full');
    const side: PlayerSide = this.players.length === 0 ? 'SOUTH' : 'NORTH';
    this.players.push({ ws, side, username, opponentUsername });
    return side;
  }

  start(): void {
    this.state = createInitialState();
    for (const player of this.players) {
      if (player.ws) {
        this.send(player.ws, {
          type: 'GAME_START',
          state: this.state,
          side: player.side,
          mode: this.mode,
          skill: this.skill,
          opponentUsername: player.opponentUsername,
        });
      }
    }
  }

  handleMessage(ws: WebSocket, msg: ClientMessage): void {
    if (this.closed) return;

    const player = this.players.find(p => p.ws === ws);
    if (!player) return;

    if (msg.type === 'MAKE_MOVE') {
      this.handleMove(player, msg.move);
    } else if (msg.type === 'REMATCH') {
      this.handleRematch();
    } else if (msg.type === 'LEAVE_ROOM') {
      this.handleLeave(ws);
    }
  }

  private handleMove(player: Player, move: Move): void {
    if (this.state.status !== 'ACTIVE') return;
    if (player.side !== this.state.currentTurn) {
      this.send(player.ws!, {
        type: 'ERROR',
        code: 'NOT_YOUR_TURN',
        message: 'It is not your turn',
      });
      return;
    }
    if (!isLegalMove(this.state, move)) {
      this.send(player.ws!, {
        type: 'ERROR',
        code: 'ILLEGAL_MOVE',
        message: 'That move is not legal',
      });
      return;
    }

    this.state = applyMove(this.state, move);

    if (this.state.status === 'FINISHED') {
      this.broadcast({ type: 'GAME_OVER', state: this.state, lastMove: move });
      return;
    }

    this.broadcast({ type: 'STATE_UPDATE', state: this.state, lastMove: move });

    if (this.mode === 'ai' && this.state.currentTurn === 'NORTH') {
      this.triggerAiMoves();
    }
  }

  private triggerAiMoves(): void {
    setTimeout(() => {
      while (
        this.state.status === 'ACTIVE' &&
        this.state.currentTurn === 'NORTH' &&
        this.skill
      ) {
        const aiMove = getAiMove(this.state, this.skill);
        this.state = applyMove(this.state, aiMove);

        if (this.state.status === 'FINISHED') {
          this.broadcast({ type: 'GAME_OVER', state: this.state, lastMove: aiMove });
          return;
        }

        this.broadcast({ type: 'STATE_UPDATE', state: this.state, lastMove: aiMove });
      }
    }, this.aiDelayMs);
  }

  private handleRematch(): void {
    this.state = createInitialState();
    for (const player of this.players) {
      player.side = player.side === 'SOUTH' ? 'NORTH' : 'SOUTH';
    }
    this.start();
  }

  handleDisconnect(ws: WebSocket): void {
    const player = this.players.find(p => p.ws === ws);
    if (!player) return;
    player.ws = null;

    if (this.mode === 'online') {
      this.broadcastExcept(ws, { type: 'OPPONENT_DISCONNECTED' });
      player.disconnectTimer = setTimeout(() => {
        this.closed = true;
      }, RECONNECT_GRACE_MS);
    } else {
      this.closed = true;
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
      type: 'GAME_START',
      state: this.state,
      side,
      mode: this.mode,
      skill: this.skill,
      opponentUsername: player.opponentUsername,
    });
    return true;
  }

  private handleLeave(ws: WebSocket): void {
    this.handleDisconnect(ws);
    ws.close();
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
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
