import { useEffect } from 'react';
import type { ServerMessage } from '@boardly/shared';
import { wsService } from '../../../shared/services/wsService.ts';
import { useCheckersStore } from '../store/gameStore.ts';
import { useUiStore } from '../../../shared/store/uiStore.ts';
import { useAuthStore } from '../../../shared/store/authStore.ts';
import { router } from '../../../router.tsx';

export function useCheckersServerMessages(): void {
  const { setGame, setRoomId, applyStateUpdate, setRematchRequested } = useCheckersStore();
  const { setOpponentDisconnected } = useUiStore();

  useEffect(() => {
    const remove = wsService.addHandler((msg: ServerMessage) => {
      switch (msg.type) {
        case 'ROOM_JOINED':
          setRoomId(msg.roomId);
          try {
            sessionStorage.setItem('checkersRoomId', msg.roomId);
            sessionStorage.setItem('checkersSide', msg.side);
          } catch { /* non-fatal */ }
          break;

        case 'CHECKERS_GAME_START':
          setGame(msg.state, msg.side, msg.mode, msg.skill, msg.opponentUsername);
          setOpponentDisconnected(false);
          void router.navigate({ to: '/checkers/game' });
          break;

        case 'CHECKERS_STATE_UPDATE':
          applyStateUpdate(msg.state, msg.lastMove);
          break;

        case 'CHECKERS_GAME_OVER':
          if (msg.lastMove) {
            applyStateUpdate(msg.state, msg.lastMove);
          } else {
            const s = useCheckersStore.getState();
            if (s.playerSide && s.mode) {
              setGame(msg.state, s.playerSide, s.mode, s.skill ?? undefined, s.opponentUsername ?? undefined);
            }
          }
          break;

        case 'TURN_TIMEOUT': {
          const s = useCheckersStore.getState();
          if (s.displayedState) {
            useUiStore.getState().setTurnTimedOut(msg.side === s.playerSide);
          }
          break;
        }

        case 'REMATCH_REQUESTED':
          setRematchRequested(true);
          break;

        case 'OPPONENT_DISCONNECTED':
          setOpponentDisconnected(true);
          break;

        case 'WAITING_FOR_OPPONENT':
          void router.navigate({ to: '/checkers/lobby' });
          break;

        case 'AUTH_ERROR':
          useAuthStore.getState().logout();
          wsService.disconnect();
          void router.navigate({ to: '/login' });
          break;

        case 'ERROR':
          console.warn('[Checkers WS error]', msg.code, msg.message);
          if (msg.code === 'ROOM_NOT_FOUND' || msg.code === 'RECONNECT_FAILED') {
            sessionStorage.removeItem('checkersRoomId');
            sessionStorage.removeItem('checkersSide');
            useCheckersStore.getState().reset();
            void router.navigate({ to: '/' });
          }
          break;
      }
    });
    return remove;
  }, [setGame, setRoomId, applyStateUpdate, setOpponentDisconnected, setRematchRequested]);
}
