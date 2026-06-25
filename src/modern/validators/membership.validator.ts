import {
  BillingPeriodsBelowMonthlyMinimumError,
  BillingPeriodsBelowYearlyMinimumError,
  BillingPeriodsExceedMonthlyLimitError,
  BillingPeriodsExceedYearlyLimitError,
  CashPriceExceedsLimitError,
  InvalidBillingIntervalError,
  InvalidBillingPeriodsError,
  MissingMandatoryFieldsError,
  NegativeRecurringPriceError,
} from '../errors';
import type {
  BillingInterval,
  BillingPeriodBounds,
  CreateMembershipRequestBody,
  PaymentMethod,
  ValidatedMembershipInput,
} from '../types';

const CASH_PRICE_LIMIT = 100;

const BILLING_PERIOD_BOUNDS: Record<BillingInterval, BillingPeriodBounds | null> = {
  monthly: {
    min: 6,
    max: 12,
    minError: BillingPeriodsBelowMonthlyMinimumError,
    maxError: BillingPeriodsExceedMonthlyLimitError,
  },
  yearly: {
    min: 3,
    max: 10,
    minError: BillingPeriodsBelowYearlyMinimumError,
    maxError: BillingPeriodsExceedYearlyLimitError,
  },
  weekly: null,
};

function isBillingInterval(value: string): value is BillingInterval {
  return value in BILLING_PERIOD_BOUNDS;
}

export function validateCreateMembership(
  body: CreateMembershipRequestBody,
): ValidatedMembershipInput {
  if (
    body.name === undefined ||
    body.recurringPrice === undefined ||
    body.billingInterval === undefined ||
    body.billingPeriods === undefined
  ) {
    throw new MissingMandatoryFieldsError();
  }

  if (body.recurringPrice < 0) {
    throw new NegativeRecurringPriceError();
  }

  if (body.recurringPrice > CASH_PRICE_LIMIT && body.paymentMethod === 'cash') {
    throw new CashPriceExceedsLimitError();
  }

  if (body.billingPeriods < 1) {
    throw new InvalidBillingPeriodsError();
  }

  if (!isBillingInterval(body.billingInterval)) {
    throw new InvalidBillingIntervalError();
  }

  const bounds = BILLING_PERIOD_BOUNDS[body.billingInterval];
  if (bounds !== null) {
    if (body.billingPeriods > bounds.max) {
      throw new bounds.maxError();
    }
    if (body.billingPeriods < bounds.min) {
      throw new bounds.minError();
    }
  }

  const validFrom = body.validFrom ? new Date(body.validFrom) : new Date();
  const paymentMethod = (body.paymentMethod ?? null) as PaymentMethod | null;

  return {
    name: body.name,
    recurringPrice: body.recurringPrice,
    paymentMethod,
    billingInterval: body.billingInterval,
    billingPeriods: body.billingPeriods,
    validFrom,
  };
}
