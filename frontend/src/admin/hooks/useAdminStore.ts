import { useMemo, useSyncExternalStore } from 'react';

import {
  adminMockStore,
  getSnapshot,
  subscribe,
} from '../data/adminMockStore';
import type { AdminDataState } from '../data/mockData';

/**
 * React binding for the admin mock store.
 * Re-renders subscribers when localStorage-backed data mutates.
 */
export function useAdminStore() {
  const data = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return useMemo(
    () => ({
      data,
      ...adminMockStore,
    }),
    [data],
  );
}

function getServerSnapshot(): AdminDataState {
  return getSnapshot();
}
