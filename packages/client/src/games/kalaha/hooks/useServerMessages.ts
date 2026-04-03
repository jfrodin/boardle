import { useEffect } from 'react';
import type { ServerMessage } from '@boardly/shared';
import { wsService } from '../../../shared/services/wsService.ts';
import { useGameStore } from '../store/gameStore.ts';
import { useUiStore } from '../../../shared/store/uiStore.ts';
import { useAuthStore } from '../../../shared/store/authStore.ts';
import { router } from '../../../router.tsx';

export function useServerMessages(): void {
  const { setGame, setRoomId, enqueueAnimation, setRematchRequested } = useGameStore();
  const { setOpponentDisconnected } = useUiStore();

  useEffect(() => {
    const remove = wsService.addHandler((msg: ServerMessage) => {
      switch (msg.type) {
        case 'ROOM_JOINED':
          setRoomId(msg.roomId);
          try {
            sessionStorage.setItem('kalahaRoomId', msg.roomId);
            sessionStorage.setItem('kalahaSide', msg.side);
          } catch {
            // sessionStorage unavailable — non-fatal
          }
          break;

        case 'GAME_START':
          setGame(msg.state, msg.side, msg.mode, msg.skill, msg.opponentUsername);
          setOpponentDisconnected(false);
          void router.navigate({ to: '/kalaha/game' });
          break;

        case 'STATE_UPDATE':
          enqueueAnimation(msg.lastMove, msg.state);
          break;

        case 'GAME_OVER':
          if (msg.lastMove) {
            enqueueAnimation(msg.lastMove, msg.state);
          } else {
            const s = useGameStore.getState();
            setGame(msg.state, s.playerSide!, s.mode!, s.skill ?? undefined, s.opponentUsername ?? undefined);
          }
          break;

        case 'TURN_TIMEOUT': {
          const s = useGameStore.getState();
          const isMe = msg.side === s.playerSide;
          // Game over message will follow — just show a brief notification via uiStore
          useUiStore.getState().setTurnTimedOut(isMe);
          break;
        }

        case 'REMATCH_REQUESTED':
          setRematchRequested(true);
          break;

        case 'OPPONENT_DISCONNECTED':
          setOpponentDisconnected(true);
          break;

        case 'WAITING_FOR_OPPONENT':
          void router.navigate({ to: '/kalaha/lobby' });
          break;

        case 'AUTH_ERROR':
          useAuthStore.getState().logout();
          wsService.disconnect();
          void router.navigate({ to: '/login' });
          break;

        case 'ERROR':
          console.error(`[Server Error] ${msg.code}: ${msg.message}`);
          // If room is gone (server restart, expiry, mobile reconnect) — clean up and go home
          if (msg.code === 'ROOM_NOT_FOUND' || msg.code === 'RECONNECT_FAILED') {
            sessionStorage.removeItem('kalahaRoomId');
            sessionStorage.removeItem('kalahaSide');
            useGameStore.getState().reset();
            void router.navigate({ to: '/' });
          }
          break;
      }
    });
    return remove;
  }, [setGame, setRoomId, enqueueAnimation, setOpponentDisconnected, setRematchRequested]);
}
