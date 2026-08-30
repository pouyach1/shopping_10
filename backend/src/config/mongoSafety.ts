/**
 * MongoDB observability helpers that never leak credentials or full URIs.
 */

const CREDENTIAL_IN_URI =
  /mongodb(\+srv)?:\/\/([^/@]+)@/i;

/**
 * Redacts userinfo from a MongoDB connection string for safe logging.
 * Never returns the raw URI.
 */
export function sanitizeMongoUri(uri: string): string {
  if (!uri) return '[empty]';
  try {
    // Handle mongodb+srv and standard URIs without relying on WHATWG URL
    // (which mishandles mongodb+srv in some Node versions).
    const withoutCreds = uri.replace(CREDENTIAL_IN_URI, 'mongodb$1://***:***@');
    // Truncate query string which may contain authSource hints — keep host/db only.
    const [base] = withoutCreds.split('?');
    return base ?? '[redacted]';
  } catch {
    return '[unparseable-uri]';
  }
}

export type MongoErrorCategory =
  | 'network'
  | 'timeout'
  | 'auth'
  | 'server_selection'
  | 'duplicate_key'
  | 'validation'
  | 'unavailable'
  | 'unknown';

/**
 * Maps a thrown value to a coarse, secret-free category for logs and clients.
 */
export function categorizeMongoError(error: unknown): MongoErrorCategory {
  if (!error || typeof error !== 'object') return 'unknown';

  const err = error as {
    name?: string;
    code?: number | string;
    message?: string;
    codeName?: string;
  };

  if (err.code === 11000) return 'duplicate_key';

  const name = (err.name ?? '').toLowerCase();
  const message = (err.message ?? '').toLowerCase();
  const codeName = (err.codeName ?? '').toLowerCase();

  if (
    name.includes('mongoserverselection') ||
    message.includes('server selection') ||
    codeName.includes('serverselection')
  ) {
    return 'server_selection';
  }

  if (
    name.includes('mongo network') ||
    name.includes('mongonetwork') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('socket') ||
    message.includes('topology was destroyed')
  ) {
    return 'network';
  }

  if (
    name.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('timeout')
  ) {
    return 'timeout';
  }

  if (
    name.includes('mongoauth') ||
    message.includes('authentication failed') ||
    message.includes('not authorized') ||
    err.code === 18
  ) {
    return 'auth';
  }

  if (
    name.includes('validation') ||
    codeName === 'documentvalidationfailure'
  ) {
    return 'validation';
  }

  if (
    message.includes('buffering timed out') ||
    message.includes('not connected') ||
    message.includes('connection closed')
  ) {
    return 'unavailable';
  }

  return 'unknown';
}

/**
 * True when the error indicates MongoDB is not usable for commerce traffic.
 */
export function isMongoUnavailableError(error: unknown): boolean {
  const category = categorizeMongoError(error);
  return (
    category === 'network' ||
    category === 'timeout' ||
    category === 'server_selection' ||
    category === 'unavailable' ||
    category === 'auth'
  );
}

/**
 * Production URI rules (fail-fast). Returns an error message or null if OK.
 */
export function validateProductionMongoUri(
  uri: string,
  allowLocalhost: boolean,
): string | null {
  if (!uri || !uri.trim()) {
    return 'MONGODB_URI is required in production';
  }
  const trimmed = uri.trim();
  if (
    !trimmed.startsWith('mongodb://') &&
    !trimmed.startsWith('mongodb+srv://')
  ) {
    return 'MONGODB_URI must start with mongodb:// or mongodb+srv://';
  }
  if (!allowLocalhost) {
    const lower = trimmed.toLowerCase();
    if (
      lower.includes('127.0.0.1') ||
      lower.includes('localhost') ||
      lower.includes('0.0.0.0')
    ) {
      return 'MONGODB_URI must not target localhost in production (set MONGODB_ALLOW_LOCALHOST=true only for explicitly self-hosted single-node deploys)';
    }
  }
  return null;
}
