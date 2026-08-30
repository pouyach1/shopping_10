import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRoute = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

/** Wrap async route handlers so rejected promises reach the error middleware. */
export function asyncHandler(fn: AsyncRoute): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}
