import type { WebSocket } from '@fastify/websocket';
import type { AiSkill } from '@boardly/shared';
import { GameRoom } from './GameRoom.js';
import { CheckersRoom } from './CheckersRoom.js';
import { Connect4Room } from './Connect4Room.js';

type AnyRoom = GameRoom | CheckersRoom | Connect4Room;

interface QueueEntry<T> {
  ws: WebSocket;
  username: string;
  resolve: (room: T) => void;
}

export class RoomManager {
  private rooms = new Map<string, AnyRoom>();
  private kalahaQueue: QueueEntry<GameRoom>[] = [];
  private checkersQueue: QueueEntry<CheckersRoom>[] = [];
  private connect4Queue: QueueEntry<Connect4Room>[] = [];

  createAiRoom(
    ws: WebSocket,
    skill: AiSkill,
    animDelay?: number,
    playerUsername?: string,
    aiUsername?: string,
  ): GameRoom {
    const room = new GameRoom('ai', skill, animDelay);
    room.addPlayer(ws, playerUsername ?? 'Player', aiUsername ?? `AI (${skill})`);
    room.setOnEmpty(() => this.rooms.delete(room.id));
    this.rooms.set(room.id, room);
    return room;
  }

  joinQueue(ws: WebSocket, user: { userId: string; username: string }): Promise<GameRoom> {
    return new Promise(resolve => {
      if (this.kalahaQueue.length > 0) {
        const waiting = this.kalahaQueue.shift()!;
        const room = new GameRoom('online');
        room.addPlayer(waiting.ws, waiting.username, user.username);
        room.addPlayer(ws, user.username, waiting.username);
        room.setOnEmpty(() => this.rooms.delete(room.id));
        this.rooms.set(room.id, room);
        room.start(); // start exactly once, before resolving either promise
        waiting.resolve(room);
        resolve(room);
      } else {
        this.kalahaQueue.push({ ws, username: user.username, resolve });
      }
    });
  }

  createCheckersAiRoom(
    ws: WebSocket,
    skill: AiSkill,
    playerUsername?: string,
    aiUsername?: string,
  ): CheckersRoom {
    const room = new CheckersRoom('ai', skill);
    room.addPlayer(ws, playerUsername ?? 'Player', aiUsername ?? `AI (${skill})`);
    room.setOnEmpty(() => this.rooms.delete(room.id));
    this.rooms.set(room.id, room);
    return room;
  }

  joinCheckersQueue(ws: WebSocket, user: { userId: string; username: string }): Promise<CheckersRoom> {
    return new Promise(resolve => {
      if (this.checkersQueue.length > 0) {
        const waiting = this.checkersQueue.shift()!;
        const room = new CheckersRoom('online');
        room.addPlayer(waiting.ws, waiting.username, user.username);
        room.addPlayer(ws, user.username, waiting.username);
        room.setOnEmpty(() => this.rooms.delete(room.id));
        this.rooms.set(room.id, room);
        room.start(); // start exactly once, before resolving either promise
        waiting.resolve(room);
        resolve(room);
      } else {
        this.checkersQueue.push({ ws, username: user.username, resolve });
      }
    });
  }

  createConnect4AiRoom(ws: WebSocket, skill: AiSkill, playerUsername?: string, aiUsername?: string): Connect4Room {
    const room = new Connect4Room('ai', skill);
    room.addPlayer(ws, playerUsername ?? 'Player', aiUsername ?? `AI (${skill})`);
    room.setOnEmpty(() => this.rooms.delete(room.id));
    this.rooms.set(room.id, room);
    return room;
  }

  joinConnect4Queue(ws: WebSocket, user: { userId: string; username: string }): Promise<Connect4Room> {
    return new Promise(resolve => {
      if (this.connect4Queue.length > 0) {
        const waiting = this.connect4Queue.shift()!;
        const room = new Connect4Room('online');
        room.addPlayer(waiting.ws, waiting.username, user.username);
        room.addPlayer(ws, user.username, waiting.username);
        room.setOnEmpty(() => this.rooms.delete(room.id));
        this.rooms.set(room.id, room);
        room.start();
        waiting.resolve(room);
        resolve(room);
      } else {
        this.connect4Queue.push({ ws, username: user.username, resolve });
      }
    });
  }

  removeFromQueue(ws: WebSocket): void {
    this.kalahaQueue = this.kalahaQueue.filter(e => e.ws !== ws);
    this.checkersQueue = this.checkersQueue.filter(e => e.ws !== ws);
    this.connect4Queue = this.connect4Queue.filter(e => e.ws !== ws);
  }

  getRoom(id: string): AnyRoom | undefined {
    return this.rooms.get(id);
  }

  getCheckersRoom(id: string): CheckersRoom | undefined {
    const room = this.rooms.get(id);
    return room instanceof CheckersRoom ? room : undefined;
  }

  deleteRoom(id: string): void {
    this.rooms.delete(id);
  }

  handleDisconnect(ws: WebSocket): void {
    this.removeFromQueue(ws);
    for (const room of this.rooms.values()) {
      if (room.hasPlayer(ws)) {
        room.handleDisconnect(ws);
      }
    }
  }
}
