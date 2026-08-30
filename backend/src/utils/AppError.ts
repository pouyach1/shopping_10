export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly errors?: Record<string, string>;
  readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    options?: {
      code?: ErrorCode;
      errors?: Record<string, string>;
      isOperational?: boolean;
    },
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = options?.code ?? mapStatusToCode(statusCode);
    this.errors = options?.errors;
    this.isOperational = options?.isOperational ?? true;
  }
}

function mapStatusToCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'VALIDATION_ERROR';
    case 429:
      return 'TOO_MANY_REQUESTS';
    default:
      return 'INTERNAL_ERROR';
  }
}

export function badRequest(message: string, errors?: Record<string, string>) {
  return new AppError(400, message, { code: 'BAD_REQUEST', errors });
}

export function unauthorized(message = 'احراز هویت لازم است.') {
  return new AppError(401, message, { code: 'UNAUTHORIZED' });
}

export function forbidden(message = 'دسترسی مجاز نیست.') {
  return new AppError(403, message, { code: 'FORBIDDEN' });
}

export function notFound(message = 'مورد درخواستی یافت نشد.') {
  return new AppError(404, message, { code: 'NOT_FOUND' });
}

export function conflict(message: string, errors?: Record<string, string>) {
  return new AppError(409, message, { code: 'CONFLICT', errors });
}

export function validationError(
  message = 'اطلاعات وارد شده صحیح نیست.',
  errors?: Record<string, string>,
) {
  return new AppError(422, message, { code: 'VALIDATION_ERROR', errors });
}
