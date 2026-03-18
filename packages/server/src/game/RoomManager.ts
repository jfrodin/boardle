import type { WebSocket } from '@fastify/websocket';
import type { AiSkill, PlayerSide } from '@kalaha/shared';
import { GameRoom } from './GameRoom.js';

export class RoomManager {
  private rooms = new Map<string, GameRoom>();
  private matchQueue: { ws: WebSocket; resolve: (room: GameRoom) => void }[] = [];

  createAiRoom(ws: WebSocket, skill: AiSkill): GameRoom {
    const room = new GameRoom('ai', skill);
    room.addPlayer(ws);
    this.rooms.set(room.id, room);
    return room;
  }

  /**
   * Join the matchmaking queue. Returns a promise that resolves when
   * a second player joins or creates a room.
   */
  joinQueue(ws: WebSocket): Promise<GameRoom> {
    return new Promise(resolve => {
      if (this.matchQueue.length > 0) {
        // Pair with the first waiting player
        const waiting = this.matchQueue.shift()!;
        const room = new GameRoom('online');
        waiting.resolve(room);
        room.addPlayer(waiting.ws);
        room.addPlayer(ws);
        this.rooms.set(room.id, room);
        resolve(room);
      } else {
        this.matchQueue.push({ ws, resolve });
        // Send waiting message — caller handles this
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
