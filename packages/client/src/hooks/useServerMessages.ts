import { useEffect } from 'react';
import type { ServerMessage } from '@kalaha/shared';
import { wsService } from '../services/wsService.ts';
import { useGameStore } from '../store/gameStore.ts';
import { useUiStore } from '../store/uiStore.ts';

export function useServerMessages(): void {
  const { setGame, setRoomId, enqueueAnimation } = useGameStore();
  const { setScreen, setOpponentDisconnected } = useUiStore();

  useEffect(() => {
    const remove = wsService.addHandler((msg: ServerMessage) => {
      switch (msg.type) {
        case 'ROOM_JOINED':
          setRoomId(msg.roomId);
          sessionStorage.setItem('kalahaRoomId', msg.roomId);
          sessionStorage.setItem('kalahaSide', msg.side);
          break;

        case 'GAME_START':
          setGame(msg.state, msg.side, msg.mode, msg.skill);
          setOpponentDisconnected(false);
          setScreen('game');
          break;

        case 'STATE_UPDATE':
          enqueueAnimation(msg.lastMove, msg.state);
          break;

        case 'GAME_OVER':
          if (msg.lastMove) {
            enqueueAnimation(msg.lastMove, msg.state);
          } else {
            // No move to animate (e.g. reconnect scenario) — just apply state
            const s = useGameStore.getState();
            setGame(msg.state, s.playerSide!, s.mode!, s.skill ?? undefined);
          }
          break;

        case 'OPPONENT_DISCONNECTED':
          setOpponentDisconnected(true);
          break;

        case 'WAITING_FOR_OPPONENT':
          setScreen('lobby');
          break;

        case 'ERROR':
          console.error(`[Server Error] ${msg.code}: ${msg.message}`);
          break;
      }
    });
    return remove;
  }, [setGame, setRoomId, enqueueAnimation, setScreen, setOpponentDisconnected]);
}
