import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

import { parseOrThrow } from '../validators/auth.validators';

type RequestPart = 'body' | 'query' | 'params';

export function validate(schema: ZodType, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req[part] = parseOrThrow(schema, req[part]) as never;
      next();
    } catch (error) {
      next(error);
    }
  };
}
