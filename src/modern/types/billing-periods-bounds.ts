import { BaseError } from '../errors';

export interface BillingPeriodBounds {
  min: number;
  max: number;
  minError: new () => BaseError;
  maxError: new () => BaseError;
}
