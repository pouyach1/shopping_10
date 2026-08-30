import dotenv from 'dotenv';
import { z } from 'zod';

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
      if (
        !value.MONGODB_URI ||
        value.MONGODB_URI.includes('127.0.0.1') ||
        value.MONGODB_URI.includes('localhost')
      ) {
        // Localhost URIs are allowed but warn via custom — actually for production
        // local Mongo can be valid in some deploys; only enforce JWT_SECRET strictly.
      }
      if (value.CLIENT_ORIGINS.trim() === '*' || value.CLIENT_ORIGINS.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['CLIENT_ORIGINS'],
          message: 'CLIENT_ORIGINS must list explicit origins in production',
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
} as const;

export type Env = typeof env;
