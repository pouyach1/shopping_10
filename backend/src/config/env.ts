import dotenv from 'dotenv';
import { z } from 'zod';

import {
  PAYMENT_PROVIDER_IDS,
  PAYMENT_RESERVATION_TTL_MS,
} from './constants';

dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/luxora'),
    MONGODB_MAX_POOL_SIZE: z.coerce.number().int().positive().default(20),
    MONGODB_MIN_POOL_SIZE: z.coerce.number().int().min(0).default(0),
    MONGODB_MAX_IDLE_MS: z.coerce.number().int().positive().default(60_000),
    MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(10_000),
    MONGODB_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    MONGODB_SOCKET_TIMEOUT_MS: z.coerce.number().int().positive().default(45_000),
    MONGODB_HEARTBEAT_FREQUENCY_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(10_000),
    MONGODB_PING_TIMEOUT_MS: z.coerce.number().int().positive().default(2_000),
    /** createIndexes on connect — NEVER enables syncIndexes (which can drop indexes). */
    MONGODB_AUTO_INDEX: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        // Defaults: off in production, on in development/test.
        const nodeEnv = process.env.NODE_ENV ?? 'development';
        return nodeEnv !== 'production';
      }),
    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    JWT_SECRET: z.string().min(1).optional(),
    JWT_EXPIRES_IN: z.string().min(1).default('7d'),
    AUTH_COOKIE_NAME: z.string().min(1).default('luxora_token'),
    AUTH_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    CLIENT_ORIGINS: z
      .string()
      .default('http://localhost:5173,http://127.0.0.1:5173'),
    JSON_BODY_LIMIT: z.string().default('100kb'),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
    API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    PAYMENT_PROVIDER: z.enum(PAYMENT_PROVIDER_IDS).default('mock'),
    PAYMENT_CALLBACK_URL: z
      .string()
      .url()
      .default('http://localhost:5173/payment/callback'),
    PAYMENT_WEBHOOK_SECRET: z.string().optional(),
    ZARINPAL_MERCHANT_ID: z.string().optional(),
    ZARINPAL_SANDBOX: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    PAYMENT_RESERVATION_TTL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(PAYMENT_RESERVATION_TTL_MS),
    ENABLE_RESERVATION_SCHEDULER: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    RESERVATION_SCHEDULER_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(300_000),
    ENABLE_NOTIFICATION_SCHEDULER: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    NOTIFICATION_SCHEDULER_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(60_000),
    ENABLE_RECONCILE_SCHEDULER: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    RECONCILE_SCHEDULER_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(300_000),
    SMS_PROVIDER: z.enum(['mock', 'kavenegar']).default('mock'),
    SMS_API_KEY: z.string().optional(),
    KAVENEGAR_SENDER: z.string().optional(),
    KAVENEGAR_BASE_URL: z.string().url().optional(),
    EMAIL_PROVIDER: z.enum(['mock', 'smtp']).default('mock'),
    EMAIL_FROM: z.string().email().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    NOTIFICATION_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    NOTIFICATION_RETRY_BASE_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(60_000),
    NOTIFICATION_LEASE_MS: z.coerce.number().int().positive().default(60_000),
    STORE_DISPLAY_NAME: z.string().min(1).default('Luxora'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production') {
      if (!value.MONGODB_URI || value.MONGODB_URI.trim().length < 10) {
        ctx.addIssue({
          code: 'custom',
          path: ['MONGODB_URI'],
          message: 'MONGODB_URI is required in production',
        });
      } else {
        const uri = value.MONGODB_URI.trim();
        const looksMongo =
          uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://');
        if (!looksMongo) {
          ctx.addIssue({
            code: 'custom',
            path: ['MONGODB_URI'],
            message:
              'MONGODB_URI must start with mongodb:// or mongodb+srv://',
          });
        }
        if (/localhost|127\.0\.0\.1/i.test(uri) && !process.env.ALLOW_LOCAL_MONGO_IN_PROD) {
          ctx.addIssue({
            code: 'custom',
            path: ['MONGODB_URI'],
            message:
              'Production MONGODB_URI points at localhost — set ALLOW_LOCAL_MONGO_IN_PROD=1 only for deliberate local prod-mode tests',
          });
        }
      }
      if (value.MONGODB_AUTO_INDEX === true) {
        ctx.addIssue({
          code: 'custom',
          path: ['MONGODB_AUTO_INDEX'],
          message:
            'MONGODB_AUTO_INDEX must be false in production (create indexes via ops/migration, never syncIndexes on boot)',
        });
      }
      if (!value.JWT_SECRET || value.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_SECRET'],
          message:
            'JWT_SECRET is required in production and must be at least 32 characters',
        });
      }
      if (value.CLIENT_ORIGINS.trim() === '*' || value.CLIENT_ORIGINS.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['CLIENT_ORIGINS'],
          message: 'CLIENT_ORIGINS must list explicit origins in production',
        });
      }
      if (
        !value.PAYMENT_WEBHOOK_SECRET ||
        value.PAYMENT_WEBHOOK_SECRET.length < 16
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['PAYMENT_WEBHOOK_SECRET'],
          message:
            'PAYMENT_WEBHOOK_SECRET is required in production (16+ characters)',
        });
      }
      if (value.PAYMENT_PROVIDER === 'zarinpal') {
        if (!value.ZARINPAL_MERCHANT_ID || value.ZARINPAL_MERCHANT_ID.length < 36) {
          ctx.addIssue({
            code: 'custom',
            path: ['ZARINPAL_MERCHANT_ID'],
            message:
              'ZARINPAL_MERCHANT_ID is required (36-char UUID) when PAYMENT_PROVIDER=zarinpal',
          });
        }
      }
      if (value.PAYMENT_PROVIDER === 'mock') {
        ctx.addIssue({
          code: 'custom',
          path: ['PAYMENT_PROVIDER'],
          message: 'PAYMENT_PROVIDER=mock is not allowed in production',
        });
      }
      if (value.SMS_PROVIDER === 'kavenegar' && !value.SMS_API_KEY) {
        ctx.addIssue({
          code: 'custom',
          path: ['SMS_API_KEY'],
          message: 'SMS_API_KEY is required when SMS_PROVIDER=kavenegar',
        });
      }
      if (value.EMAIL_PROVIDER === 'smtp') {
        if (!value.EMAIL_FROM) {
          ctx.addIssue({
            code: 'custom',
            path: ['EMAIL_FROM'],
            message: 'EMAIL_FROM is required when EMAIL_PROVIDER=smtp',
          });
        }
        if (!value.SMTP_HOST) {
          ctx.addIssue({
            code: 'custom',
            path: ['SMTP_HOST'],
            message: 'SMTP_HOST is required when EMAIL_PROVIDER=smtp',
          });
        }
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  // Fail fast — never boot with an invalid production configuration.
  // eslint-disable-next-line no-console
  console.error(`[config] Invalid environment configuration:\n${details}`);
  process.exit(1);
}

const raw = parsed.data;

const jwtSecret =
  raw.JWT_SECRET ??
  (raw.NODE_ENV === 'test'
    ? 'test-only-jwt-secret-do-not-use-elsewhere-32+'
    : 'dev-only-jwt-secret-change-me-before-prod');

if (raw.NODE_ENV === 'development' && !raw.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn(
    '[config] JWT_SECRET is not set — using an insecure development default. Set JWT_SECRET before any real deployment.',
  );
}

const webhookSecret =
  raw.PAYMENT_WEBHOOK_SECRET ??
  (raw.NODE_ENV === 'production'
    ? ''
    : 'dev-only-webhook-secret-change-me');

export const env = {
  NODE_ENV: raw.NODE_ENV,
  isProd: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  isDev: raw.NODE_ENV === 'development',
  PORT: raw.PORT,
  MONGODB_URI: raw.MONGODB_URI,
  MONGODB_MAX_POOL_SIZE: raw.MONGODB_MAX_POOL_SIZE,
  MONGODB_MIN_POOL_SIZE: raw.MONGODB_MIN_POOL_SIZE,
  MONGODB_MAX_IDLE_MS: raw.MONGODB_MAX_IDLE_MS,
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: raw.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
  MONGODB_CONNECT_TIMEOUT_MS: raw.MONGODB_CONNECT_TIMEOUT_MS,
  MONGODB_SOCKET_TIMEOUT_MS: raw.MONGODB_SOCKET_TIMEOUT_MS,
  MONGODB_HEARTBEAT_FREQUENCY_MS: raw.MONGODB_HEARTBEAT_FREQUENCY_MS,
  MONGODB_PING_TIMEOUT_MS: raw.MONGODB_PING_TIMEOUT_MS,
  MONGODB_AUTO_INDEX: raw.MONGODB_AUTO_INDEX,
  SHUTDOWN_TIMEOUT_MS: raw.SHUTDOWN_TIMEOUT_MS,
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: raw.JWT_EXPIRES_IN,
  AUTH_COOKIE_NAME: raw.AUTH_COOKIE_NAME,
  AUTH_COOKIE_SAMESITE: raw.AUTH_COOKIE_SAMESITE,
  CLIENT_ORIGINS: raw.CLIENT_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  JSON_BODY_LIMIT: raw.JSON_BODY_LIMIT,
  AUTH_RATE_LIMIT_WINDOW_MS: raw.AUTH_RATE_LIMIT_WINDOW_MS,
  AUTH_RATE_LIMIT_MAX: raw.AUTH_RATE_LIMIT_MAX,
  API_RATE_LIMIT_WINDOW_MS: raw.API_RATE_LIMIT_WINDOW_MS,
  API_RATE_LIMIT_MAX: raw.API_RATE_LIMIT_MAX,
  PAYMENT_PROVIDER: raw.PAYMENT_PROVIDER,
  PAYMENT_CALLBACK_URL: raw.PAYMENT_CALLBACK_URL,
  PAYMENT_WEBHOOK_SECRET: webhookSecret,
  ZARINPAL_MERCHANT_ID: raw.ZARINPAL_MERCHANT_ID,
  ZARINPAL_SANDBOX: raw.ZARINPAL_SANDBOX,
  PAYMENT_RESERVATION_TTL_MS: raw.PAYMENT_RESERVATION_TTL_MS,
  ENABLE_RESERVATION_SCHEDULER: raw.ENABLE_RESERVATION_SCHEDULER,
  RESERVATION_SCHEDULER_INTERVAL_MS: raw.RESERVATION_SCHEDULER_INTERVAL_MS,
  ENABLE_NOTIFICATION_SCHEDULER: raw.ENABLE_NOTIFICATION_SCHEDULER,
  NOTIFICATION_SCHEDULER_INTERVAL_MS: raw.NOTIFICATION_SCHEDULER_INTERVAL_MS,
  ENABLE_RECONCILE_SCHEDULER: raw.ENABLE_RECONCILE_SCHEDULER,
  RECONCILE_SCHEDULER_INTERVAL_MS: raw.RECONCILE_SCHEDULER_INTERVAL_MS,
  SMS_PROVIDER: raw.SMS_PROVIDER,
  SMS_API_KEY: raw.SMS_API_KEY,
  KAVENEGAR_SENDER: raw.KAVENEGAR_SENDER,
  KAVENEGAR_BASE_URL: raw.KAVENEGAR_BASE_URL,
  EMAIL_PROVIDER: raw.EMAIL_PROVIDER,
  EMAIL_FROM: raw.EMAIL_FROM ?? 'noreply@luxora.local',
  SMTP_HOST: raw.SMTP_HOST,
  SMTP_PORT: raw.SMTP_PORT ?? 587,
  SMTP_USER: raw.SMTP_USER,
  SMTP_PASSWORD: raw.SMTP_PASSWORD,
  SMTP_SECURE: raw.SMTP_SECURE,
  NOTIFICATION_MAX_ATTEMPTS: raw.NOTIFICATION_MAX_ATTEMPTS,
  NOTIFICATION_RETRY_BASE_MS: raw.NOTIFICATION_RETRY_BASE_MS,
  NOTIFICATION_LEASE_MS: raw.NOTIFICATION_LEASE_MS,
  STORE_DISPLAY_NAME: raw.STORE_DISPLAY_NAME,
  LOG_LEVEL: raw.LOG_LEVEL,
} as const;

export type Env = typeof env;
