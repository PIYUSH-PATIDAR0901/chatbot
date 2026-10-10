import { Request } from 'express';

export function getRequestParam(req: Request, paramName: string): string {
  const val = req.params[paramName];
  if (Array.isArray(val)) {
    return val[0] || '';
  }
  return val || '';
}
