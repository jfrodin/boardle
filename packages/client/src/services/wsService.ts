import type { ClientMessage, ServerMessage } from '@kalaha/shared';
import { useGameStore } from '../store/gameStore.ts';
import { useUiStore } from '../store/uiStore.ts';

type MessageHandler = (msg: ServerMessage) => void;

class WsService {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer?: ReturnType<typeof setTimeout>;

  connect(): void {
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[WS] connected');
      // Attempt to rejoin if we have a stored room
      const { roomId, playerSide } = useGameStore.getState();
      if (roomId && playerSide) {
        this.send({ type: 'JOIN_ROOM', roomId, playerSide });
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
    this.ws?.close();
    this.ws = null;
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
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
