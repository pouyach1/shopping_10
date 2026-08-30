import { useCallback, useEffect, useSyncExternalStore } from 'react';

import {
  clearProfileSession,
  loginCustomer,
  logoutCustomer,
  readProfileSession,
  updateCustomerProfile,
  type CustomerProfile,
  type ProfileSession,
} from '../services/profileAuth';
import { isAuthenticatedForApi, writeAccessToken } from '../services/api/http';
import { refreshCommerceFromServer } from '../services/commerceSync';
import { PROFILE_REMEMBER_KEY } from '../services/profileAuth';

/**
 * Module-level customer session store — shared by Profile page and Header.
 */

let session: ProfileSession | null = readProfileSession();
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function setSession(next: ProfileSession | null): void {
  session = next;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ProfileSession | null {
  return session;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (
      event.key !== 'luxora-customer-session' &&
      event.key !== 'luxora-customer-remember'
    ) {
      return;
    }
    session = readProfileSession();
    emit();
  });

  // Restore access token + hydrate commerce when a prior API session exists.
  if (session?.accessToken) {
    const remember = localStorage.getItem(PROFILE_REMEMBER_KEY) === '1';
    writeAccessToken(session.accessToken, remember);
    void refreshCommerceFromServer();
  }
}

export function useProfileAuth() {
  const current = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    if (!isAuthenticatedForApi()) return;
    void refreshCommerceFromServer();
  }, [current?.accessToken]);

  const login = useCallback(
    async (input: {
      identifier: string;
      password: string;
      remember?: boolean;
    }) => {
      const next = await loginCustomer(input);
      setSession(next);
      return next;
    },
    [],
  );

  const logout = useCallback(() => {
    logoutCustomer();
    setSession(null);
  }, []);

  const updateProfile = useCallback(
    (
      patch: Partial<
        Pick<CustomerProfile, 'name' | 'email' | 'phone' | 'address'>
      >,
    ) => {
      const next = updateCustomerProfile(patch);
      if (next) setSession(next);
      return next;
    },
    [],
  );

  /** Soft re-sync from storage (e.g. after external clear). */
  const refresh = useCallback(() => {
    setSession(readProfileSession());
  }, []);

  return {
    session: current,
    customer: current?.customer ?? null,
    isAuthenticated: Boolean(current),
    login,
    logout,
    updateProfile,
    refresh,
    /** Exposed for tests / rare resets */
    clearLocalSession: () => {
      clearProfileSession();
      setSession(null);
    },
  };
}
