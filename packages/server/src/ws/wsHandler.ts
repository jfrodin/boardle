import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type { ClientMessage, ServerMessage } from '@kalaha/shared';
import { RoomManager } from '../game/RoomManager.js';

const manager = new RoomManager();

// Map from WebSocket -> roomId for quick lookup
const wsRoomMap = new Map<WebSocket, string>();

export function registerWsRoutes(fastify: FastifyInstance): void {
  fastify.get('/ws', { websocket: true }, (socket, _req) => {
    socket.on('message', (raw: Buffer | string) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        sendError(socket, 'PARSE_ERROR', 'Invalid JSON');
        return;
      }

      handleMessage(socket, msg);
    });

    socket.on('close', () => {
      manager.handleDisconnect(socket);
      wsRoomMap.delete(socket);
    });

    socket.on('error', () => {
      manager.handleDisconnect(socket);
      wsRoomMap.delete(socket);
    });
  });
}

function handleMessage(ws: WebSocket, msg: ClientMessage): void {
  switch (msg.type) {
    case 'START_AI_GAME': {
      const room = manager.createAiRoom(ws, msg.skill);
      wsRoomMap.set(ws, room.id);
      send(ws, { type: 'ROOM_JOINED', roomId: room.id, side: 'SOUTH' });
      room.start();
      break;
    }

    case 'JOIN_QUEUE': {
      send(ws, { type: 'WAITING_FOR_OPPONENT' });
      manager.joinQueue(ws).then(room => {
        wsRoomMap.set(ws, room.id);
        // Both players get ROOM_JOINED + GAME_START via room.start()
        if (room.isFull) {
          room.start();
        }
      });
      break;
    }

    case 'JOIN_ROOM': {
      const room = manager.getRoom(msg.roomId);
      if (!room) {
        sendError(ws, 'ROOM_NOT_FOUND', 'Room not found');
        return;
      }
      if (msg.playerSide) {
        const rejoined = room.tryReconnect(ws, msg.playerSide);
        if (!rejoined) {
          sendError(ws, 'RECONNECT_FAILED', 'Could not rejoin room');
        } else {
          wsRoomMap.set(ws, room.id);
        }
      }
      break;
    }

    case 'MAKE_MOVE':
    case 'LEAVE_ROOM':
    case 'REMATCH': {
      const roomId = wsRoomMap.get(ws);
      if (!roomId) {
        sendError(ws, 'NO_ROOM', 'Not in a room');
        return;
      }
      const room = manager.getRoom(roomId);
      if (!room) {
        sendError(ws, 'ROOM_NOT_FOUND', 'Room not found');
        return;
      }
      room.handleMessage(ws, msg);
      break;
    }
  }
}

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function sendError(ws: WebSocket, code: string, message: string): void {
  send(ws, { type: 'ERROR', code, message });
}
