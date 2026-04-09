import { useEffect } from 'react';
import type { ServerMessage } from '@boardly/shared';
import { wsService } from '../../../shared/services/wsService.ts';
import { useConnect4Store } from '../store/gameStore.ts';
import { useUiStore } from '../../../shared/store/uiStore.ts';
import { useAuthStore } from '../../../shared/store/authStore.ts';
import { router } from '../../../router.tsx';

export function useConnect4ServerMessages(): void {
  const { setGame, setRoomId, applyUpdate, setRematchRequested } = useConnect4Store();
  const { setOpponentDisconnected } = useUiStore();

  useEffect(() => {
    const remove = wsService.addHandler((msg: ServerMessage) => {
      switch (msg.type) {
        case 'ROOM_JOINED':
          setRoomId(msg.roomId);
          try {
            sessionStorage.setItem('connect4RoomId', msg.roomId);
            sessionStorage.setItem('connect4Side', msg.side);
          } catch { /* non-fatal */ }
          break;

        case 'CONNECT4_GAME_START':
          setGame(msg.state, msg.side, msg.mode, msg.skill, msg.opponentUsername);
          setOpponentDisconnected(false);
          if (msg.roomId) {
            setRoomId(msg.roomId);
            try {
              sessionStorage.setItem('connect4RoomId', msg.roomId);
              sessionStorage.setItem('connect4Side', msg.side);
            } catch { /* non-fatal */ }
          }
          void router.navigate({ to: '/connect4/game' });
          break;

        case 'CONNECT4_STATE_UPDATE':
          applyUpdate(msg.state, msg.lastMove);
          break;

        case 'CONNECT4_GAME_OVER':
          applyUpdate(msg.state, msg.lastMove ?? { col: -1 });
          break;

        case 'REMATCH_REQUESTED':
          setRematchRequested(true);
          break;

        case 'OPPONENT_DISCONNECTED':
          setOpponentDisconnected(true);
          break;

        case 'WAITING_FOR_OPPONENT':
          void router.navigate({ to: '/connect4/lobby' });
          break;

        case 'AUTH_ERROR':
          useAuthStore.getState().logout();
          wsService.disconnect();
          void router.navigate({ to: '/login' });
          break;

        case 'ERROR':
          console.error(`[Server Error] ${msg.code}: ${msg.message}`);
          if (msg.code === 'ROOM_NOT_FOUND' || msg.code === 'RECONNECT_FAILED') {
            sessionStorage.removeItem('connect4RoomId');
            sessionStorage.removeItem('connect4Side');
            useConnect4Store.getState().reset();
            void router.navigate({ to: '/' });
          }
          break;
      }
    });
    return remove;
  }, [setGame, setRoomId, applyUpdate, setOpponentDisconnected, setRematchRequested]);
}
