import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../services/chatService';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Zod schema validation errors
  if (err instanceof ZodError) {
    const errorDetails = err.issues.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({
      error: 'Validation failed',
      details: errorDetails,
    });
    return;
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  // Handle MySQL errors (duplicate keys, foreign key violations)
  if (err && err.code) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({
        error: 'Duplicate entry: A record with this unique value already exists.',
        details: err.message,
      });
      return;
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      res.status(400).json({
        error: 'Foreign key constraint failed: Referenced entity does not exist.',
        details: err.message,
      });
      return;
    }
  }

  // General server error
  console.error('[Unhandled Error]', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
  });
}
