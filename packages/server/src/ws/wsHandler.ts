import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type { ClientMessage, ServerMessage } from '@boardly/shared';
import { RoomManager } from '../game/RoomManager.js';

interface AuthUser {
  userId: string;
  username: string;
}

const manager = new RoomManager();

// Map from WebSocket -> roomId for quick lookup
const wsRoomMap = new Map<WebSocket, string>();

// Map from WebSocket -> authenticated user (null = anonymous)
const wsUserMap = new Map<WebSocket, AuthUser | null>();

export function registerWsRoutes(fastify: FastifyInstance): void {
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    // Extract and verify JWT from query param ?token=...
    const token = (req.query as Record<string, string | undefined>).token;
    let user: AuthUser | null = null;

    if (token) {
      try {
        user = fastify.jwt.verify<AuthUser>(token);
      } catch {
        // Token present but invalid/expired — reject the connection
        sendRaw(socket, { type: 'AUTH_ERROR', message: 'Invalid or expired token. Please log in again.' });
        socket.close();
        return;
      }
    }

    wsUserMap.set(socket, user);

    socket.on('message', (raw: Buffer | string) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        sendError(socket, 'PARSE_ERROR', 'Invalid JSON');
        return;
      }

      handleMessage(socket, msg, user);
    });

    socket.on('close', () => {
      manager.handleDisconnect(socket);
      wsRoomMap.delete(socket);
      wsUserMap.delete(socket);
    });

    socket.on('error', () => {
      manager.handleDisconnect(socket);
      wsRoomMap.delete(socket);
      wsUserMap.delete(socket);
    });
  });
}

function handleMessage(ws: WebSocket, msg: ClientMessage, user: AuthUser | null): void {
  switch (msg.type) {
    case 'START_AI_GAME': {
      const opponentLabel = `AI (${msg.skill.charAt(0).toUpperCase() + msg.skill.slice(1)})`;
      const room = manager.createAiRoom(ws, msg.skill, msg.animDelay, user?.username, opponentLabel);
      wsRoomMap.set(ws, room.id);
      send(ws, { type: 'ROOM_JOINED', roomId: room.id, side: 'SOUTH' });
      room.start();
      break;
    }

    case 'JOIN_QUEUE': {
      // Online play requires authentication
      if (!user) {
        sendError(ws, 'AUTH_REQUIRED', 'You must be logged in to play online');
        return;
      }
      send(ws, { type: 'WAITING_FOR_OPPONENT' });
      manager.joinQueue(ws, user).then(room => {
        wsRoomMap.set(ws, room.id);
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

// Used before we have a ServerMessage type for AUTH_ERROR (avoid TS widening issue)
function sendRaw(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function sendError(ws: WebSocket, code: string, message: string): void {
  send(ws, { type: 'ERROR', code, message });
}
