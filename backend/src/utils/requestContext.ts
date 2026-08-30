import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextStore {
  requestId?: string;
  actorId?: string;
  actorType?: 'customer' | 'admin' | 'system' | 'provider';
}

const storage = new AsyncLocalStorage<RequestContextStore>();

export function runWithRequestContext<T>(
  store: RequestContextStore,
  fn: () => T,
): T {
  return storage.run(store, fn);
}

export function getRequestContext(): RequestContextStore {
  return storage.getStore() ?? {};
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

export function setRequestContextFields(
  fields: Partial<RequestContextStore>,
): void {
  const current = storage.getStore();
  if (!current) return;
  Object.assign(current, fields);
}
