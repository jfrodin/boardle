import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type { AiSkill, ClientMessage, ServerMessage } from '@boardly/shared';
import { RoomManager } from '../game/RoomManager.js';
import { GameRoom } from '../game/GameRoom.js';
import { CheckersRoom } from '../game/CheckersRoom.js';
import { Connect4Room } from '../game/Connect4Room.js';
import { LudoRoom } from '../game/LudoRoom.js';

interface AuthUser {
  userId: string;
  username: string;
}

const manager = new RoomManager();

const wsRoomMap = new Map<WebSocket, string>();
const wsUserMap = new Map<WebSocket, AuthUser | null>();

// Rate limiting: max messages per window per socket
const WS_RATE_LIMIT = 30;
const WS_RATE_WINDOW_MS = 1000;
const wsMessageCount = new Map<WebSocket, { count: number; resetAt: number }>();

const MAX_MESSAGE_BYTES = 1024; // 1 KB — more than enough for any valid client message

const VALID_SKILLS = new Set<AiSkill>(['easy', 'medium', 'hard']);
const MIN_ANIM_DELAY = 0;
const MAX_ANIM_DELAY = 2000;

export function registerWsRoutes(fastify: FastifyInstance): void {
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    // Try to auto-authenticate from the HttpOnly cookie sent with the upgrade request
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.auth_token;
    if (cookieToken) {
      try {
        const payload = fastify.jwt.verify<AuthUser>(cookieToken);
        wsUserMap.set(socket, { userId: payload.userId, username: payload.username });
      } catch {
        wsUserMap.set(socket, null);
      }
    } else {
      wsUserMap.set(socket, null);
    }

    socket.on('message', (raw: Buffer | string) => {
      // Size limit
      const bytes = Buffer.isBuffer(raw) ? raw.length : Buffer.byteLength(raw as string);
      if (bytes > MAX_MESSAGE_BYTES) {
        sendError(socket, 'MESSAGE_TOO_LARGE', 'Message exceeds maximum allowed size');
        return;
      }

      // Rate limit
      const now = Date.now();
      let rate = wsMessageCount.get(socket);
      if (!rate || now >= rate.resetAt) {
        rate = { count: 0, resetAt: now + WS_RATE_WINDOW_MS };
        wsMessageCount.set(socket, rate);
      }
      rate.count++;
      if (rate.count > WS_RATE_LIMIT) {
        sendError(socket, 'RATE_LIMITED', 'Too many messages');
        return;
      }

      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        sendError(socket, 'PARSE_ERROR', 'Invalid JSON');
        return;
      }

      handleMessage(socket, msg, fastify);
    });

    socket.on('close', () => {
      manager.handleDisconnect(socket);
      wsRoomMap.delete(socket);
      wsUserMap.delete(socket);
      wsMessageCount.delete(socket);
    });

    socket.on('error', () => {
      manager.handleDisconnect(socket);
      wsRoomMap.delete(socket);
      wsUserMap.delete(socket);
      wsMessageCount.delete(socket);
    });
  });
}

function handleMessage(ws: WebSocket, msg: ClientMessage, fastify: FastifyInstance): void {
  const user = wsUserMap.get(ws) ?? null;

  switch (msg.type) {
    case 'AUTH': {
      try {
        const verified = fastify.jwt.verify<AuthUser>(msg.token);
        wsUserMap.set(ws, verified);
        send(ws, { type: 'AUTH_OK', username: verified.username });
      } catch {
        send(ws, { type: 'AUTH_ERROR', message: 'Invalid or expired token. Please log in again.' });
        ws.close();
      }
      return;
    }

    case 'START_AI_GAME': {
      if (!VALID_SKILLS.has(msg.skill)) {
        sendError(ws, 'INVALID_SKILL', 'Invalid skill level');
        return;
      }
      if (msg.gameId === 'ludo') {
        const room = manager.createLudoAiRoom(ws, msg.skill, user?.username ?? 'Player');
        wsRoomMap.set(ws, room.id);
        room.start();
      } else if (msg.gameId === 'checkers') {
        const opponentLabel = `AI (${msg.skill.charAt(0).toUpperCase() + msg.skill.slice(1)})`;
        const room = manager.createCheckersAiRoom(ws, msg.skill, user?.username, opponentLabel);
        wsRoomMap.set(ws, room.id);
        send(ws, { type: 'ROOM_JOINED', roomId: room.id, side: 'SOUTH' });
        room.start();
      } else if (msg.gameId === 'connect4') {
        const opponentLabel = `AI (${msg.skill.charAt(0).toUpperCase() + msg.skill.slice(1)})`;
        const room = manager.createConnect4AiRoom(ws, msg.skill, user?.username, opponentLabel);
        wsRoomMap.set(ws, room.id);
        send(ws, { type: 'ROOM_JOINED', roomId: room.id, side: 'SOUTH' });
        room.start();
      } else {
        const animDelay = Math.min(MAX_ANIM_DELAY, Math.max(MIN_ANIM_DELAY, msg.animDelay ?? 400));
        const opponentLabel = `AI (${msg.skill.charAt(0).toUpperCase() + msg.skill.slice(1)})`;
        const room = manager.createAiRoom(ws, msg.skill, animDelay, user?.username, opponentLabel);
        wsRoomMap.set(ws, room.id);
        send(ws, { type: 'ROOM_JOINED', roomId: room.id, side: 'SOUTH' });
        room.start();
      }
      break;
    }

    case 'JOIN_QUEUE': {
      if (!user) {
        sendError(ws, 'AUTH_REQUIRED', 'You must be logged in to play online');
        return;
      }
      send(ws, { type: 'WAITING_FOR_OPPONENT' });
      if (msg.gameId === 'ludo') {
        const { room, color } = manager.joinLudoQueue(ws, 'medium', user.username);
        wsRoomMap.set(ws, room.id);
        // Store color in room map via a separate side-channel; LUDO_GAME_START will carry it
        void color;
      } else if (msg.gameId === 'checkers') {
        manager.joinCheckersQueue(ws, user).then(room => { wsRoomMap.set(ws, room.id); });
      } else if (msg.gameId === 'connect4') {
        manager.joinConnect4Queue(ws, user).then(room => { wsRoomMap.set(ws, room.id); });
      } else {
        manager.joinQueue(ws, user).then(room => { wsRoomMap.set(ws, room.id); });
      }
      break;
    }

    case 'JOIN_ROOM': {
      const room = manager.getRoom(msg.roomId);
      if (!room) {
        sendError(ws, 'ROOM_NOT_FOUND', 'Room not found');
        return;
      }
      if (room instanceof LudoRoom && msg.ludoColor) {
        const rejoined = room.tryReconnect(ws, msg.ludoColor);
        if (!rejoined) {
          sendError(ws, 'RECONNECT_FAILED', 'Could not rejoin room');
        } else {
          wsRoomMap.set(ws, room.id);
        }
      } else if (msg.playerSide) {
        const rejoined = room.tryReconnect(ws, msg.playerSide);
        if (!rejoined) {
          sendError(ws, 'RECONNECT_FAILED', 'Could not rejoin room');
        } else {
          wsRoomMap.set(ws, room.id);
        }
      }
      break;
    }

    case 'LUDO_ROLL':
    case 'LUDO_MOVE':
    case 'MAKE_MOVE':
    case 'CHECKERS_MOVE':
    case 'CONNECT4_MOVE':
    case 'LEAVE_ROOM':
    case 'REMATCH': {
      const roomId = wsRoomMap.get(ws);
      if (!roomId) { sendError(ws, 'NO_ROOM', 'Not in a room'); return; }
      const room = manager.getRoom(roomId);
      if (!room) { sendError(ws, 'ROOM_NOT_FOUND', 'Room not found'); return; }
      if ((msg.type === 'LUDO_ROLL' || msg.type === 'LUDO_MOVE') && !(room instanceof LudoRoom)) {
        sendError(ws, 'WRONG_GAME', 'Wrong game type'); return;
      }
      if (msg.type === 'MAKE_MOVE' && !(room instanceof GameRoom)) {
        sendError(ws, 'WRONG_GAME', 'Wrong game type'); return;
      }
      if (msg.type === 'CHECKERS_MOVE' && !(room instanceof CheckersRoom)) {
        sendError(ws, 'WRONG_GAME', 'Wrong game type'); return;
      }
      if (msg.type === 'CONNECT4_MOVE' && !(room instanceof Connect4Room)) {
        sendError(ws, 'WRONG_GAME', 'Wrong game type'); return;
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
