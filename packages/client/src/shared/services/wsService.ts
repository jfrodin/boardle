import type { ClientMessage, ServerMessage } from '@boardly/shared';
import { useGameStore } from '../../games/kalaha/store/gameStore.ts';
import { useUiStore } from '../store/uiStore.ts';
import { useAuthStore } from '../store/authStore.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function loadSession(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function isValidRoomId(v: string | null): v is string {
  return !!v && UUID_RE.test(v);
}
function isValidSide(v: string | null): v is 'SOUTH' | 'NORTH' {
  return v === 'SOUTH' || v === 'NORTH';
}

type MessageHandler = (msg: ServerMessage) => void;

class WsService {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private sendQueue: ClientMessage[] = [];
  private wasConnected = false;

  connect(): void {
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[WS] connected');

      // Send auth token as first message — never in URL to avoid log leakage
      const token = useAuthStore.getState().token;
      if (token) {
        this.ws!.send(JSON.stringify({ type: 'AUTH', token }));
      }

      const stored = useGameStore.getState();
      const roomId = stored.roomId ?? loadSession('kalahaRoomId');
      const playerSide = stored.playerSide ?? loadSession('kalahaSide');

      if (isValidRoomId(roomId) && isValidSide(playerSide)) {
        this.ws!.send(JSON.stringify({ type: 'JOIN_ROOM', roomId, playerSide }));
        if (this.wasConnected) {
          useUiStore.getState().setReconnected(true);
        }
      }

      this.wasConnected = true;

      const queued = this.sendQueue.splice(0);
      for (const msg of queued) {
        this.ws!.send(JSON.stringify(msg));
      }
    };

    this.ws.onmessage = event => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data as string) as ServerMessage;
      } catch {
        console.error('[WS] invalid message', event.data);
        return;
      }
      for (const h of this.handlers) h(msg);
    };

    this.ws.onclose = () => {
      console.log('[WS] disconnected, will reconnect in 2s');
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.sendQueue = [];
    this.wasConnected = false;
    this.ws?.close();
    this.ws = null;
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.sendQueue.push(msg);
    }
  }

  addHandler(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 2000);
  }
}

export const wsService = new WsService();
