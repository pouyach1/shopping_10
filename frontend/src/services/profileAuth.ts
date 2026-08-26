/**
 * Customer profile authentication — mock/demo layer.
 *
 * UI must depend on this module (or useProfileAuth), never on storage details.
 * Replace loginCustomer / session readers with a real API later without
 * rebuilding the Profile screens.
 */

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
  /** ISO timestamp when the mock session was created. */
  signedInAt: string;
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
  } catch {
    // Keep in-memory only via the hook store.
  }
}

export function clearProfileSession(): void {
  clearBothStorages();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * Mock sign-in. Accepts demo phone or email + password.
 * Artificial delay simulates network latency for loading UX.
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

  await delay(700);

  const normalized = normalizeIdentifier(identifier);
  const allowed = DEMO_CUSTOMER.identifierOptions.map((item) =>
    normalizeIdentifier(item),
  );

  const matchesId = allowed.includes(normalized);
  const matchesPassword = password === DEMO_CUSTOMER.password;

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

export function logoutCustomer(): void {
  clearProfileSession();
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
  };
  writeProfileSession(session, remembered);
  return session;
}
