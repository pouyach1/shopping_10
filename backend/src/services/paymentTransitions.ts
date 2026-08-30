import type { PaymentAttemptStatus } from '../config/constants';
import { conflict } from '../utils/AppError';

/**
 * Centralized payment attempt transitions.
 * Invalid mutations fail closed — never trust client status.
 */
const ALLOWED: Record<PaymentAttemptStatus, readonly PaymentAttemptStatus[]> = {
  created: [
    'pending',
    'redirected',
    'processing',
    'paid',
    'failed',
    'cancelled',
    'expired',
  ],
  pending: [
    'redirected',
    'processing',
    'paid',
    'failed',
    'cancelled',
    'expired',
  ],
  redirected: ['processing', 'paid', 'failed', 'cancelled', 'expired'],
  processing: ['paid', 'failed', 'cancelled', 'expired'],
  paid: ['refunded', 'partially_refunded'],
  failed: [],
  cancelled: [],
  expired: [],
  refunded: [],
  partially_refunded: ['refunded', 'partially_refunded'],
};

export function canTransitionPayment(
  from: PaymentAttemptStatus,
  to: PaymentAttemptStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}

export function assertPaymentTransition(
  from: PaymentAttemptStatus,
  to: PaymentAttemptStatus,
): void {
  if (!canTransitionPayment(from, to)) {
    throw conflict(
      'تغییر وضعیت پرداخت مجاز نیست.',
      { status: `${from} → ${to}` },
      'INVALID_PAYMENT_TRANSITION',
    );
  }
}

export const TERMINAL_PAYMENT_STATUSES: readonly PaymentAttemptStatus[] = [
  'paid',
  'failed',
  'cancelled',
  'expired',
  'refunded',
];

export function isOpenPaymentStatus(status: PaymentAttemptStatus): boolean {
  return (
    status === 'created' ||
    status === 'pending' ||
    status === 'redirected' ||
    status === 'processing'
  );
}
