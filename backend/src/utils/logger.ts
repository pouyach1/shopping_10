type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentMinLevel(): LogLevel {
  const fromEnv = process.env.LOG_LEVEL as LogLevel | undefined;
  if (fromEnv && LEVEL_ORDER[fromEnv] != null) return fromEnv;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentMinLevel()];
}

function write(level: LogLevel, message: string, meta?: unknown): void {
  if (!shouldLog(level)) return;

  let requestId: string | undefined;
  try {
    // Lazy import to avoid circular init issues in early boot.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getRequestId } = require('./requestContext') as {
      getRequestId: () => string | undefined;
    };
    requestId = getRequestId();
  } catch {
    requestId = undefined;
  }

  if (process.env.NODE_ENV === 'production') {
    const payload = {
      ts: new Date().toISOString(),
      level,
      event: message,
      ...(requestId ? { requestId } : {}),
      ...(meta && typeof meta === 'object' && meta !== null
        ? (meta as Record<string, unknown>)
        : meta !== undefined
          ? { detail: meta }
          : {}),
    };
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](JSON.stringify(payload));
    return;
  }

  const line = `[${level}] ${message}`;
  if (meta === undefined) {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](line);
    return;
  }
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](line, {
    ...(requestId ? { requestId } : {}),
    ...(typeof meta === 'object' && meta !== null
      ? (meta as object)
      : { detail: meta }),
  });
}

export const logger = {
  debug: (message: string, meta?: unknown) => write('debug', message, meta),
  info: (message: string, meta?: unknown) => write('info', message, meta),
  warn: (message: string, meta?: unknown) => write('warn', message, meta),
  error: (message: string, meta?: unknown) => write('error', message, meta),
};
