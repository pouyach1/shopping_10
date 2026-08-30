/**
 * Customer profile authentication.
 *
 * When VITE_API_BASE_URL is set, login uses POST /api/v1/auth/login.
 * Otherwise falls back to local demo credentials for UI-only development.
 */

import { API_BASE_URL, isApiEnabled } from '../config/api';
import { clearAccessToken, writeAccessToken } from './api/http';
import { onAuthLoginSuccess, onAuthLogout } from './commerceSync';

export const PROFILE_SESSION_KEY = 'luxora-customer-session';
export const PROFILE_REMEMBER_KEY = 'luxora-customer-remember';

export interface CustomerProfile {
  id: string;
  name: string;
  /** Primary identifier shown in the account (phone or email). */
  identifier: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface ProfileSession {
  customer: CustomerProfile;
  /** ISO timestamp when the session was created. */
  signedInAt: string;
  /** Backend JWT when API auth is active. */
  accessToken?: string;
}

export type ProfileAuthErrorCode =
  | 'empty_identifier'
  | 'empty_password'
  | 'invalid_credentials'
  | 'service_unavailable';

export class ProfileAuthError extends Error {
  readonly code: ProfileAuthErrorCode;

  constructor(code: ProfileAuthErrorCode, message: string) {
    super(message);
    this.name = 'ProfileAuthError';
    this.code = code;
  }
}

/** Demo credentials — intentional for storefront MVP only. */
export const DEMO_CUSTOMER = {
  identifierOptions: ['09121234567', 'customer@luxora.ir'] as const,
  password: 'demo1234',
  profile: {
    id: 'cust-demo',
    name: 'سارا محمدی',
    identifier: '09121234567',
    phone: '09121234567',
    email: 'customer@luxora.ir',
    address: 'تهران، خیابان ولیعصر',
  } satisfies CustomerProfile,
} as const;

export const PROFILE_AUTH_MESSAGES: Record<ProfileAuthErrorCode, string> = {
  empty_identifier: 'شماره موبایل یا ایمیل را وارد کنید.',
  empty_password: 'رمز عبور را وارد کنید.',
  invalid_credentials: 'اطلاعات ورود صحیح نیست.',
  service_unavailable: 'ارتباط با سرویس ورود برقرار نشد.',
};

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function getStorage(remember: boolean): Storage {
  return remember ? localStorage : sessionStorage;
}

function clearBothStorages(): void {
  try {
    localStorage.removeItem(PROFILE_SESSION_KEY);
    sessionStorage.removeItem(PROFILE_SESSION_KEY);
    localStorage.removeItem(PROFILE_REMEMBER_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function readProfileSession(): ProfileSession | null {
  try {
    const raw =
      localStorage.getItem(PROFILE_SESSION_KEY) ??
      sessionStorage.getItem(PROFILE_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ProfileSession>;
    if (!parsed?.customer?.id || !parsed.customer.name) return null;

    return {
      customer: {
        id: parsed.customer.id,
        name: parsed.customer.name,
        identifier: parsed.customer.identifier ?? '',
        email: parsed.customer.email,
        phone: parsed.customer.phone,
        address: parsed.customer.address,
      },
      signedInAt: parsed.signedInAt ?? new Date().toISOString(),
      accessToken: parsed.accessToken,
    };
  } catch {
    return null;
  }
}

export function writeProfileSession(
  session: ProfileSession,
  remember: boolean,
): void {
  clearBothStorages();
  try {
    getStorage(remember).setItem(PROFILE_SESSION_KEY, JSON.stringify(session));
    if (remember) {
      localStorage.setItem(PROFILE_REMEMBER_KEY, '1');
    }
    if (session.accessToken) {
      writeAccessToken(session.accessToken, remember);
    }
  } catch {
    // Keep in-memory only via the hook store.
  }
}

export function clearProfileSession(): void {
  clearBothStorages();
  clearAccessToken();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function loginViaApi(input: {
  identifier: string;
  password: string;
  remember?: boolean;
}): Promise<ProfileSession> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        identifier: input.identifier.trim(),
        password: input.password,
        remember: Boolean(input.remember),
      }),
    });
  } catch {
    throw new ProfileAuthError(
      'service_unavailable',
      PROFILE_AUTH_MESSAGES.service_unavailable,
    );
  }

  const json = (await response.json().catch(() => null)) as {
    message?: string;
    data?: {
      accessToken?: string;
      user?: {
        id: string;
        firstName: string;
        lastName: string;
        phone?: string;
        email?: string;
      };
    };
  } | null;

  if (!response.ok || !json?.data?.accessToken || !json.data.user) {
    throw new ProfileAuthError(
      'invalid_credentials',
      json?.message || PROFILE_AUTH_MESSAGES.invalid_credentials,
    );
  }

  const user = json.data.user;
  const session: ProfileSession = {
    customer: {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      identifier: user.phone || user.email || input.identifier.trim(),
      phone: user.phone,
      email: user.email,
    },
    signedInAt: new Date().toISOString(),
    accessToken: json.data.accessToken,
  };

  writeProfileSession(session, Boolean(input.remember));
  await onAuthLoginSuccess();
  return session;
}

async function loginViaDemo(input: {
  identifier: string;
  password: string;
  remember?: boolean;
}): Promise<ProfileSession> {
  await delay(700);

  const normalized = normalizeIdentifier(input.identifier);
  const allowed = DEMO_CUSTOMER.identifierOptions.map((item) =>
    normalizeIdentifier(item),
  );

  const matchesId = allowed.includes(normalized);
  const matchesPassword = input.password === DEMO_CUSTOMER.password;

  if (!matchesId || !matchesPassword) {
    throw new ProfileAuthError(
      'invalid_credentials',
      PROFILE_AUTH_MESSAGES.invalid_credentials,
    );
  }

  const session: ProfileSession = {
    customer: { ...DEMO_CUSTOMER.profile },
    signedInAt: new Date().toISOString(),
  };

  writeProfileSession(session, Boolean(input.remember));
  return session;
}

/**
 * Sign-in. Uses backend auth when API base URL is configured.
 */
export async function loginCustomer(input: {
  identifier: string;
  password: string;
  remember?: boolean;
}): Promise<ProfileSession> {
  const identifier = input.identifier.trim();
  const password = input.password;

  if (!identifier) {
    throw new ProfileAuthError(
      'empty_identifier',
      PROFILE_AUTH_MESSAGES.empty_identifier,
    );
  }

  if (!password) {
    throw new ProfileAuthError(
      'empty_password',
      PROFILE_AUTH_MESSAGES.empty_password,
    );
  }

  if (isApiEnabled()) {
    return loginViaApi(input);
  }

  return loginViaDemo(input);
}

export function logoutCustomer(): void {
  clearProfileSession();
  onAuthLogout();
}

export function updateCustomerProfile(
  patch: Partial<
    Pick<CustomerProfile, 'name' | 'email' | 'phone' | 'address'>
  >,
): ProfileSession | null {
  const current = readProfileSession();
  if (!current) return null;

  const nextCustomer: CustomerProfile = {
    ...current.customer,
    ...patch,
  };

  if (patch.phone) {
    nextCustomer.identifier = patch.phone;
  } else if (patch.email && !nextCustomer.phone) {
    nextCustomer.identifier = patch.email;
  }

  const remembered = localStorage.getItem(PROFILE_REMEMBER_KEY) === '1';
  const session: ProfileSession = {
    customer: nextCustomer,
    signedInAt: current.signedInAt,
    accessToken: current.accessToken,
  };
  writeProfileSession(session, remembered);
  return session;
}
