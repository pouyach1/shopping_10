import { ACCESS_TOKEN_KEY, API_BASE_URL, isApiEnabled } from '../../config/api';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly errors?: Record<string, string>;
  readonly details?: unknown;

  constructor(
    message: string,
    options: {
      status: number;
      code?: string;
      errors?: Record<string, string>;
      details?: unknown;
    },

  constructor(
    message: string,
    options: { status: number; code?: string; errors?: Record<string, string> },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.errors = options.errors;
    this.details = options.details;
  }
}

export function readAccessToken(): string | null {
  try {
    return (
      localStorage.getItem(ACCESS_TOKEN_KEY) ??
      sessionStorage.getItem(ACCESS_TOKEN_KEY)
    );
  } catch {
    return null;
  }
}

export function writeAccessToken(token: string, remember: boolean): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function clearAccessToken(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function isAuthenticatedForApi(): boolean {
  return isApiEnabled() && Boolean(readAccessToken());
}

export function isMongoObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (!isApiEnabled()) {
    throw new ApiError('سرویس فروشگاه در دسترس نیست.', {
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
    });
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.auth !== false) {
    const token = readAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: 'include',
      signal: options.signal,
    });
  } catch {
    throw new ApiError('ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.', {
      status: 0,
      code: 'NETWORK_ERROR',
    });
  }

  const json = (await response.json().catch(() => null)) as {
    status?: string;
    message?: string;
    code?: string;
    errors?: Record<string, string>;
    details?: unknown;
    data?: T;
  } | null;

  if (!response.ok) {
    throw new ApiError(json?.message || 'خطایی رخ داد.', {
      status: response.status,
      code: json?.code,
      errors: json?.errors,
      details: json?.details,
    });
  }

  return (json?.data ?? json) as T;
}
