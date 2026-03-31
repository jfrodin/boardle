import type { WebSocket } from '@fastify/websocket';
import type { AiSkill, PlayerSide } from '@boardly/shared';
import { GameRoom } from './GameRoom.js';

interface QueueEntry {
  ws: WebSocket;
  username: string;
  resolve: (room: GameRoom) => void;
}

export class RoomManager {
  private rooms = new Map<string, GameRoom>();
  private matchQueue: QueueEntry[] = [];

  createAiRoom(
    ws: WebSocket,
    skill: AiSkill,
    animDelay?: number,
    playerUsername?: string,
    aiUsername?: string,
  ): GameRoom {
    const room = new GameRoom('ai', skill, animDelay);
    room.addPlayer(ws, playerUsername ?? 'Player', aiUsername ?? `AI (${skill})`);
    this.rooms.set(room.id, room);
    return room;
  }

  joinQueue(ws: WebSocket, user: { userId: string; username: string }): Promise<GameRoom> {
    return new Promise(resolve => {
      if (this.matchQueue.length > 0) {
        const waiting = this.matchQueue.shift()!;
        const room = new GameRoom('online');
        room.addPlayer(waiting.ws, waiting.username, user.username);
        room.addPlayer(ws, user.username, waiting.username);
        waiting.resolve(room);
        this.rooms.set(room.id, room);
        resolve(room);
      } else {
        this.matchQueue.push({ ws, username: user.username, resolve });
      }
    });
  }

  removeFromQueue(ws: WebSocket): void {
    this.matchQueue = this.matchQueue.filter(e => e.ws !== ws);
  }

  getRoom(id: string): GameRoom | undefined {
    return this.rooms.get(id);
  }

  deleteRoom(id: string): void {
    this.rooms.delete(id);
  }

  handleDisconnect(ws: WebSocket): void {
    this.removeFromQueue(ws);
    for (const room of this.rooms.values()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const players: any[] = (room as any).players;
      if (players.some((p: any) => p.ws === ws)) {
        room.handleDisconnect(ws);
      }
    }
  }
}
