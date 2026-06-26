import { ErrorRequestHandler } from 'express';

import { BaseError } from './modern/errors';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof BaseError) {
    res.status(err.status).json({ message: err.code });
    return;
  }

  console.error(err instanceof Error ? err.stack : err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
  });
};
