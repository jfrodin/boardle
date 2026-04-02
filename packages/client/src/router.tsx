import React from 'react';
import {
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
} from '@tanstack/react-router';
import { TipJar } from './shared/components/TipJar.tsx';
import { PortalHome } from './portal/PortalHome.tsx';
import { LoginScreen } from './portal/LoginScreen.tsx';
import { RegisterScreen } from './portal/RegisterScreen.tsx';
import { ForgotPasswordScreen } from './portal/ForgotPasswordScreen.tsx';
import { ResetPasswordScreen } from './portal/ResetPasswordScreen.tsx';
import { HomeScreen as KalahaHome } from './games/kalaha/HomeScreen.tsx';
import { LobbyScreen } from './shared/components/LobbyScreen.tsx';
import { GameScreen as KalahaGame } from './games/kalaha/GameScreen.tsx';
import { useServerMessages } from './games/kalaha/hooks/useServerMessages.ts';
import { HomeScreen as CheckersHome } from './games/checkers/HomeScreen.tsx';
import { GameScreen as CheckersGame } from './games/checkers/GameScreen.tsx';
import { HomeScreen as SolitaireHome } from './games/solitaire/HomeScreen.tsx';
import { GameScreen as SolitaireGame } from './games/solitaire/GameScreen.tsx';
import { HomeScreen as YatzyHome } from './games/yatzy/HomeScreen.tsx';
import { GameScreen as YatzyGame } from './games/yatzy/GameScreen.tsx';
import { useCheckersServerMessages } from './games/checkers/hooks/useServerMessages.ts';
import { useAuthStore } from './shared/store/authStore.ts';
import { useEffect } from 'react';

// ---- Root layout ----
// Always mounted — the right place for global hooks.

function RootLayout(): React.ReactElement {
  const init = useAuthStore(s => s.init);
  const initialized = useAuthStore(s => s.initialized);

  useEffect(() => { void init(); }, [init]);

  // WS message handlers must live here so they stay mounted across all routes
  useServerMessages();
  useCheckersServerMessages();

  // Wait for /auth/me to resolve before rendering — prevents flash of logged-out state
  if (!initialized) return <></>;

  return (
    <div className="app">
      <Outlet />
      <TipJar />
    </div>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

// ---- Routes ----

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: PortalHome,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginScreen,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterScreen,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: ForgotPasswordScreen,
});

export const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: ResetPasswordScreen,
});

const kalahaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/kalaha',
  component: KalahaHome,
});

const kalahaLobbyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/kalaha/lobby',
  component: LobbyScreen,
});

const kalahaGameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/kalaha/game',
  component: KalahaGame,
});

const checkersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkers',
  component: CheckersHome,
});

const checkersLobbyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkers/lobby',
  component: LobbyScreen,
});

const checkersGameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkers/game',
  component: CheckersGame,
});

const solitaireRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/solitaire',
  component: SolitaireHome,
});

const solitaireGameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/solitaire/game',
  component: SolitaireGame,
});

const yatzyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/yatzy',
  component: YatzyHome,
});

const yatzyGameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/yatzy/game',
  component: YatzyGame,
});

// ---- Router ----

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  kalahaRoute,
  kalahaLobbyRoute,
  kalahaGameRoute,
  checkersRoute,
  checkersLobbyRoute,
  checkersGameRoute,
  solitaireRoute,
  solitaireGameRoute,
  yatzyRoute,
  yatzyGameRoute,
]);

export const router = createRouter({ routeTree });

// Register router type for full type-safety in useNavigate / Link
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
