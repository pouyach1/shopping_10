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
    JWT_SECRET: z.string().min(1).optional(),
    JWT_EXPIRES_IN: z.string().min(1).default('7d'),
    AUTH_COOKIE_NAME: z.string().min(1).default('luxora_token'),
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
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production') {
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
      if (value.PAYMENT_PROVIDER === 'zarinpal' && !value.ZARINPAL_MERCHANT_ID) {
        ctx.addIssue({
          code: 'custom',
          path: ['ZARINPAL_MERCHANT_ID'],
          message: 'ZARINPAL_MERCHANT_ID is required when PAYMENT_PROVIDER=zarinpal',
        });
      }
      if (value.PAYMENT_PROVIDER === 'mock') {
        ctx.addIssue({
          code: 'custom',
          path: ['PAYMENT_PROVIDER'],
          message: 'PAYMENT_PROVIDER=mock is not allowed in production',
        });
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
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: raw.JWT_EXPIRES_IN,
  AUTH_COOKIE_NAME: raw.AUTH_COOKIE_NAME,
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
} as const;

export type Env = typeof env;
