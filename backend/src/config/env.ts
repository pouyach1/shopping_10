import dotenv from 'dotenv';
import { z } from 'zod';

import { validateProductionMongoUri } from './mongoSafety';

dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(4000),

    /**
     * Required in production (no default). Dev/test default to local Mongo.
     * Never log the raw value — use sanitizeMongoUri().
     */
    MONGODB_URI: z.string().min(1).optional(),

    /**
     * Production escape hatch for intentionally self-hosted localhost Mongo.
     * Default false — production fails if URI points at localhost.
     */
    MONGODB_ALLOW_LOCALHOST: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),

    /** Connection pool (conservative production defaults). */
    MONGODB_MAX_POOL_SIZE: z.coerce.number().int().positive().optional(),
    MONGODB_MIN_POOL_SIZE: z.coerce.number().int().nonnegative().optional(),
    MONGODB_MAX_IDLE_TIME_MS: z.coerce.number().int().positive().optional(),
    MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .optional(),
    MONGODB_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
    /** 0 disables socket timeout (driver default). Prefer a finite value in prod. */
    MONGODB_SOCKET_TIMEOUT_MS: z.coerce.number().int().nonnegative().optional(),
    MONGODB_HEARTBEAT_FREQUENCY_MS: z.coerce
      .number()
      .int()
      .positive()
      .optional(),
    MONGODB_PING_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
    MONGODB_APP_NAME: z.string().min(1).optional(),

    /**
     * When unset: autoIndex enabled in development/test, disabled in production.
     * Production must never rely on startup index builds.
     */
    MONGODB_AUTO_INDEX: z.enum(['true', 'false']).optional(),

    /**
     * When unset: bufferCommands disabled in production (fail fast when disconnected),
     * enabled in development/test for ergonomics.
     */
    MONGODB_BUFFER_COMMANDS: z.enum(['true', 'false']).optional(),

    /** Bounded graceful shutdown (HTTP drain + Mongo disconnect). */
    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),

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

      if (!value.MONGODB_URI || !value.MONGODB_URI.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['MONGODB_URI'],
          message: 'MONGODB_URI is required in production (no default)',
        });
      } else {
        const mongoIssue = validateProductionMongoUri(
          value.MONGODB_URI,
          value.MONGODB_ALLOW_LOCALHOST,
        );
        if (mongoIssue) {
          ctx.addIssue({
            code: 'custom',
            path: ['MONGODB_URI'],
            message: mongoIssue,
          });
        }
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
  // Do not print env values (may contain secrets / URIs).
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

const isProd = raw.NODE_ENV === 'production';
const isTest = raw.NODE_ENV === 'test';
const isDev = raw.NODE_ENV === 'development';

const mongoUri =
  raw.MONGODB_URI?.trim() ||
  (isProd ? '' : 'mongodb://127.0.0.1:27017/luxora');

const autoIndex =
  raw.MONGODB_AUTO_INDEX !== undefined
    ? raw.MONGODB_AUTO_INDEX === 'true'
    : !isProd;

const bufferCommands =
  raw.MONGODB_BUFFER_COMMANDS !== undefined
    ? raw.MONGODB_BUFFER_COMMANDS === 'true'
    : !isProd;

export const env = {
  NODE_ENV: raw.NODE_ENV,
  isProd,
  isTest,
  isDev,
  PORT: raw.PORT,
  MONGODB_URI: mongoUri,
  MONGODB_ALLOW_LOCALHOST: raw.MONGODB_ALLOW_LOCALHOST,
  MONGODB_MAX_POOL_SIZE: raw.MONGODB_MAX_POOL_SIZE ?? (isProd ? 20 : 10),
  MONGODB_MIN_POOL_SIZE: raw.MONGODB_MIN_POOL_SIZE ?? (isProd ? 2 : 0),
  MONGODB_MAX_IDLE_TIME_MS: raw.MONGODB_MAX_IDLE_TIME_MS ?? 60_000,
  MONGODB_SERVER_SELECTION_TIMEOUT_MS:
    raw.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? (isProd ? 10_000 : 5_000),
  MONGODB_CONNECT_TIMEOUT_MS: raw.MONGODB_CONNECT_TIMEOUT_MS ?? 10_000,
  MONGODB_SOCKET_TIMEOUT_MS: raw.MONGODB_SOCKET_TIMEOUT_MS ?? 45_000,
  MONGODB_HEARTBEAT_FREQUENCY_MS: raw.MONGODB_HEARTBEAT_FREQUENCY_MS ?? 10_000,
  MONGODB_PING_TIMEOUT_MS: raw.MONGODB_PING_TIMEOUT_MS ?? 2_000,
  MONGODB_APP_NAME: raw.MONGODB_APP_NAME ?? 'luxora-backend',
  /** Explicit index policy — production never auto-builds indexes on boot. */
  MONGODB_AUTO_INDEX: autoIndex,
  MONGODB_BUFFER_COMMANDS: bufferCommands,
  /**
   * NEVER enable syncIndexes / dropIndex on production startup.
   * Index changes belong in controlled migrations / ops runbooks.
   */
  MONGODB_SYNC_INDEXES_ON_STARTUP: false as const,
  SHUTDOWN_TIMEOUT_MS: raw.SHUTDOWN_TIMEOUT_MS,
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
