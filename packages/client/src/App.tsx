import React, { useEffect } from 'react';
import { useUiStore } from './store/uiStore.ts';
import { HomeScreen } from './components/Screens/HomeScreen.tsx';
import { LobbyScreen } from './components/Screens/LobbyScreen.tsx';
import { GameScreen } from './components/Screens/GameScreen.tsx';
import { useServerMessages } from './hooks/useServerMessages.ts';

export default function App(): React.ReactElement {
  useServerMessages();

  const screen = useUiStore(s => s.screen);

  return (
    <div className="app">
      {screen === 'home' && <HomeScreen />}
      {screen === 'lobby' && <LobbyScreen />}
      {screen === 'game' && <GameScreen />}
    </div>
  );
}
