/**
 * Newsletter submission — frontend-ready integration point.
 * Replace the body of `submitNewsletterEmail` with a real API call later.
 */

const STORAGE_KEY = 'luxora-newsletter-intents';

export type NewsletterResult = {
  ok: true;
  message: string;
};

function isValidEmail(email: string): boolean {
  // Practical client-side check; server will re-validate when connected.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateNewsletterEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'لطفاً ایمیل خود را وارد کنید.';
  if (!isValidEmail(trimmed)) return 'لطفاً یک ایمیل معتبر وارد کنید.';
  return null;
}

export async function submitNewsletterEmail(
  email: string,
): Promise<NewsletterResult> {
  const error = validateNewsletterEmail(email);
  if (error) {
    throw new Error(error);
  }

  const trimmed = email.trim().toLowerCase();

  // Simulated network latency for realistic submitting state.
  await new Promise((resolve) => {
    window.setTimeout(resolve, 420);
  });

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!list.includes(trimmed)) {
      list.push(trimmed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch {
    // Persistence is optional for this frontend stub.
  }

  return {
    ok: true,
    message: 'ایمیل شما با موفقیت ثبت شد.',
  };
}
