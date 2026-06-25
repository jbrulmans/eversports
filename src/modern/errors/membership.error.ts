import { BaseError } from './base.error';

export class ValidationError extends BaseError {
  readonly status = 400;
  constructor(readonly code: string) {
    super();
    this.name = 'ValidationError';
  }
}
