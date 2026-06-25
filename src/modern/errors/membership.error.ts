import { BaseError } from './base.error';

export class MissingMandatoryFieldsError extends BaseError {
  readonly status = 400;
  readonly code = 'missingMandatoryFields';
}

export class NegativeRecurringPriceError extends BaseError {
  readonly status = 400;
  readonly code = 'negativeRecurringPrice';
}

export class CashPriceExceedsLimitError extends BaseError {
  readonly status = 400;
  readonly code = 'cashPriceBelow100';
}

export class BillingPeriodsExceedMonthlyLimitError extends BaseError {
  readonly status = 400;
  readonly code = 'billingPeriodsMoreThan12Months';
}

export class BillingPeriodsBelowMonthlyMinimumError extends BaseError {
  readonly status = 400;
  readonly code = 'billingPeriodsLessThan6Months';
}

export class BillingPeriodsExceedYearlyLimitError extends BaseError {
  readonly status = 400;
  readonly code = 'billingPeriodsMoreThan10Years';
}

export class BillingPeriodsBelowYearlyMinimumError extends BaseError {
  readonly status = 400;
  readonly code = 'billingPeriodsLessThan3Years';
}

export class InvalidBillingIntervalError extends BaseError {
  readonly status = 400;
  readonly code = 'invalidBillingPeriods';
}
