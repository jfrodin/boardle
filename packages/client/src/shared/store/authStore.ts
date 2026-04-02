import { create } from 'zustand';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  initialized: boolean; // true once /auth/me has resolved on app start
  isLoading: boolean;
  error: string | null;

  /** Call on app start to restore session from HttpOnly cookie via /auth/me */
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// All requests include credentials so the HttpOnly cookie is sent automatically
async function apiFetch<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(path, {
    method: body !== undefined ? 'POST' : 'GET',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  const data = await res.json() as Record<string, unknown>;

  if (!res.ok) {
    throw new Error((data.message as string | undefined) ?? 'Something went wrong');
  }

  return data as T;
}

interface AuthResponse {
  user: AuthUser;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,
  isLoading: false,
  error: null,

  async init() {
    // Restore session by calling /auth/me — the HttpOnly cookie is sent automatically.
    // No token stored in JS memory or localStorage.
    try {
      const { user } = await apiFetch<AuthResponse>('/auth/me');
      set({ user, initialized: true });
    } catch {
      // No valid session — user is just not logged in
      set({ user: null, initialized: true });
    }
  },

  async login(email, password) {
    set({ isLoading: true, error: null });
    try {
      const { user } = await apiFetch<AuthResponse>('/auth/login', { email, password });
      set({ user, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message });
      throw err;
    }
  },

  async register(username, email, password) {
    set({ isLoading: true, error: null });
    try {
      const { user } = await apiFetch<AuthResponse>('/auth/register', { username, email, password });
      set({ user, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message });
      throw err;
    }
  },

  async forgotPassword(email) {
    set({ isLoading: true, error: null });
    try {
      await apiFetch<{ ok: boolean }>('/auth/forgot-password', { email });
      set({ isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message });
      throw err;
    }
  },

  async resetPassword(token, password) {
    set({ isLoading: true, error: null });
    try {
      const { user } = await apiFetch<AuthResponse>('/auth/reset-password', { token, password });
      set({ user, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message });
      throw err;
    }
  },

  async logout() {
    try {
      await apiFetch<{ ok: boolean }>('/auth/logout', {});
    } catch {
      // Best-effort — clear local state regardless
    }
    set({ user: null, error: null });
  },

  clearError() {
    set({ error: null });
  },
}));
