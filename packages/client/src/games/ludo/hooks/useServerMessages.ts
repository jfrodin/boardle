import { useEffect } from 'react';
import type { ServerMessage } from '@boardly/shared';
import { wsService } from '../../../shared/services/wsService.ts';
import { useLudoStore } from '../store/gameStore.ts';
import { useAuthStore } from '../../../shared/store/authStore.ts';
import { router } from '../../../router.tsx';

export function useLudoServerMessages(): void {
  const { setGame, setRoomId, applyUpdate } = useLudoStore();

  useEffect(() => {
    const remove = wsService.addHandler((msg: ServerMessage) => {
      switch (msg.type) {
        case 'LUDO_GAME_START':
          setGame(msg.state, msg.myColor, msg.skill);
          setRoomId(msg.roomId);
          try {
            sessionStorage.setItem('ludoRoomId', msg.roomId);
            sessionStorage.setItem('ludoColor', msg.myColor);
          } catch { /* non-fatal */ }
          void router.navigate({ to: '/ludo/game' });
          break;

        case 'LUDO_STATE_UPDATE':
          applyUpdate(msg.state, msg.lastMove);
          break;

        case 'LUDO_GAME_OVER':
          applyUpdate(msg.state, null);
          break;

        case 'WAITING_FOR_OPPONENT':
          void router.navigate({ to: '/ludo/lobby' });
          break;

        case 'AUTH_ERROR':
          useAuthStore.getState().logout();
          wsService.disconnect();
          void router.navigate({ to: '/login' });
          break;

        case 'ERROR':
          if (msg.code === 'ROOM_NOT_FOUND' || msg.code === 'RECONNECT_FAILED') {
            sessionStorage.removeItem('ludoRoomId');
            sessionStorage.removeItem('ludoColor');
            useLudoStore.getState().reset();
            void router.navigate({ to: '/' });
          }
          break;
      }
    });
    return remove;
  }, [setGame, setRoomId, applyUpdate]);
}
