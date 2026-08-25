import { useCallback, useSyncExternalStore } from 'react';

import {
  readAdminSession,
  writeAdminSession,
} from '../data/adminStore';

/**
 * Demo-only admin gate. Persists a boolean flag in localStorage.
 * No JWT, hashing, roles, or backend — intentional Phase 1 scope.
 */

let authenticated = readAdminSession().authenticated;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return authenticated;
}

function setAuthenticated(next: boolean): void {
  authenticated = next;
  writeAdminSession(next);
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'luxora-admin-authenticated') {
      authenticated = readAdminSession().authenticated;
      emit();
    }
  });
}

export function useAdminAuth() {
  const isAuthenticated = useSyncExternalStore(subscribe, getSnapshot);

  const login = useCallback(() => {
    setAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    setAuthenticated(false);
  }, []);

  return {
    isAuthenticated,
    login,
    logout,
  };
}
