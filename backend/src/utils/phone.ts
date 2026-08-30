/**
 * Normalize Iranian mobile numbers to a canonical local form: 09xxxxxxxxx.
 * Accepts: 0912..., +98912..., 98912..., 0098912...
 */
export function normalizeIranianPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, '').replace(/^\+/, '');

  let local = digits;
  if (local.startsWith('0098')) local = `0${local.slice(4)}`;
  else if (local.startsWith('98')) local = `0${local.slice(2)}`;

  if (!/^09\d{9}$/.test(local)) return null;
  return local;
}

export function isValidIranianPhone(input: string): boolean {
  return normalizeIranianPhone(input) !== null;
}
