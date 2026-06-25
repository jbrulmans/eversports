import { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const message = err instanceof Error ? err.message : 'Unknown error';
  console.error(err instanceof Error ? err.stack : err);
  res.status(500).json({
    error: 'Internal Server Error',
    message,
  });
};
