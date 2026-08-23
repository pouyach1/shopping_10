import dotenv from 'dotenv';

// Load variables from backend/.env into process.env (no-op if the file is absent).
dotenv.config();

/**
 * Centralized, typed access to environment configuration.
 * Sensible development defaults are provided so the server can boot locally
 * without a .env file; real values belong in backend/.env (see .env.example).
 */
export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 4000),
  MONGODB_URI: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/luxora',
} as const;
