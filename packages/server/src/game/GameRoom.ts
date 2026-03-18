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
} from '@kalaha/shared';
import { createInitialState, applyMove, isLegalMove } from '@kalaha/shared';
import { getAiMove } from '../ai/AiPlayer.js';

const RECONNECT_GRACE_MS = 30_000;

interface Player {
  ws: WebSocket | null;
  side: PlayerSide;
  disconnectTimer?: ReturnType<typeof setTimeout>;
}

export class GameRoom {
  readonly id: string;
  readonly mode: GameMode;
  readonly skill?: AiSkill;

  private state: GameState;
  private players: Player[] = [];
  private closed = false;

  constructor(mode: GameMode, skill?: AiSkill) {
    this.id = randomUUID();
    this.mode = mode;
    this.skill = skill;
    this.state = createInitialState();
  }

  get isFull(): boolean {
    return this.players.length >= (this.mode === 'ai' ? 1 : 2);
  }

  get playerCount(): number {
    return this.players.filter(p => p.ws !== null).length;
  }

  addPlayer(ws: WebSocket): PlayerSide {
    if (this.isFull) throw new Error('Room is full');
    const side: PlayerSide = this.players.length === 0 ? 'SOUTH' : 'NORTH';
    this.players.push({ ws, side });
    return side;
  }

  /**
   * Start the game and notify connected players.
   */
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
        });
      }
    }

    // If AI game, AI is NORTH. If it's NORTH's turn first somehow, trigger AI.
    // Standard game starts with SOUTH so no immediate AI move needed.
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

    // If AI game and it's now NORTH's (AI's) turn, make AI move
    if (this.mode === 'ai' && this.state.currentTurn === 'NORTH') {
      this.triggerAiMoves();
    }
  }

  private triggerAiMoves(): void {
    // AI may get extra turns (chain), so loop until it's human's turn or game over
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
    }, 400); // small delay so the UI can show the human move first
  }

  private handleRematch(): void {
    this.state = createInitialState();
    for (const player of this.players) {
      // Swap sides for fairness
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
      // Grace period for reconnection
      player.disconnectTimer = setTimeout(() => {
        this.closed = true;
      }, RECONNECT_GRACE_MS);
    } else {
      // AI game: human disconnected, close room immediately
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

    // Resync state
    this.send(ws, { type: 'GAME_START', state: this.state, side, mode: this.mode, skill: this.skill });
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
