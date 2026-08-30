import { AuditLog } from '../models/AuditLog';
import type { AuditAction } from '../config/constants';
import { logger } from '../utils/logger';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'jwt',
  'secret',
  'authorization',
  'merchantId',
  'apiKey',
  'webhookSecret',
  'JWT_SECRET',
  'PAYMENT_WEBHOOK_SECRET',
]);

function scrub(value: unknown): unknown {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(scrub);
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key) || /secret|password|token|credential/i.test(key)) {
      out[key] = '[redacted]';
    } else {
      out[key] = scrub(nested);
    }
  }
  return out;
}

export async function recordAudit(input: {
  action: AuditAction;
  actorType: 'customer' | 'admin' | 'system' | 'provider';
  actorId?: string;
  entityType: string;
  entityId?: string;
  orderNumber?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await AuditLog.create({
      action: input.action,
      actorType: input.actorType,
      actorId: input.actorId,
      entityType: input.entityType,
      entityId: input.entityId,
      orderNumber: input.orderNumber,
      metadata: scrub(input.metadata) as Record<string, unknown> | undefined,
    });
  } catch (error) {
    // Audit must never break money flows.
    logger.error('audit.write_failed', {
      action: input.action,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}
