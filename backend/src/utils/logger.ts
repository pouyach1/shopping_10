type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentMinLevel(): LogLevel {
  const env = process.env.NODE_ENV ?? 'development';
  return env === 'production' ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentMinLevel()];
}

function write(level: LogLevel, message: string, meta?: unknown): void {
  if (!shouldLog(level)) return;
  const line = `[${level}] ${message}`;
  if (meta === undefined) {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](line);
    return;
  }
  // Never dump objects that may contain secrets — callers must sanitize.
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](line, meta);
}

export const logger = {
  debug: (message: string, meta?: unknown) => write('debug', message, meta),
  info: (message: string, meta?: unknown) => write('info', message, meta),
  warn: (message: string, meta?: unknown) => write('warn', message, meta),
  error: (message: string, meta?: unknown) => write('error', message, meta),
};
