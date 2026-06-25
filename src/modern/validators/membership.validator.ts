import { z } from 'zod';

import { ValidationError } from '../errors';
import type {
  BillingInterval,
  CreateMembershipRequestBody,
  ValidatedMembershipInput,
} from '../types';

const CASH_PRICE_LIMIT = 100;

const BILLING_PERIOD_BOUNDS: Record<
  BillingInterval,
  { min: number; max: number; minCode: string; maxCode: string } | null
> = {
  monthly: {
    min: 6,
    max: 12,
    minCode: 'billingPeriodsLessThan6Months',
    maxCode: 'billingPeriodsMoreThan12Months',
  },
  yearly: {
    min: 3,
    max: 10,
    minCode: 'billingPeriodsLessThan3Years',
    maxCode: 'billingPeriodsMoreThan10Years',
  },
  weekly: null,
};

function validateBillingPeriodBounds(
  data: { billingInterval: BillingInterval; billingPeriods: number },
  ctx: z.RefinementCtx,
) {
  const bounds = BILLING_PERIOD_BOUNDS[data.billingInterval];
  if (bounds) {
    if (data.billingPeriods > bounds.max) {
      ctx.addIssue({ code: 'custom', message: bounds.maxCode });
    }
    if (data.billingPeriods < bounds.min) {
      ctx.addIssue({ code: 'custom', message: bounds.minCode });
    }
  }
}

function requiredOrTypeError() {
  return (issue: { input: unknown }) => {
    if (issue.input === undefined) return { message: 'missingMandatoryFields' };
    return { message: 'invalidFieldType' };
  };
}

const membershipSchema = z
  .object({
    name: z.string({ error: requiredOrTypeError() }).min(1, { message: 'missingMandatoryFields' }),
    recurringPrice: z
      .number({ error: requiredOrTypeError() })
      .min(0, { message: 'negativeRecurringPrice' }),
    paymentMethod: z
      .enum(['cash', 'credit card'], {
        error: () => ({ message: 'invalidPaymentMethod' }),
      })
      .nullable()
      .optional(),
    billingInterval: z.enum(['monthly', 'yearly', 'weekly'], {
      error: (issue) => {
        if (issue.input === undefined) {
          return { message: 'missingMandatoryFields' };
        }
        return { message: 'invalidBillingPeriods' };
      },
    }),
    billingPeriods: z
      .number({ error: requiredOrTypeError() })
      .int({ message: 'invalidBillingPeriods' })
      .min(1, { message: 'invalidBillingPeriods' }),
    validFrom: z.coerce.date({ message: 'invalidDateFormat' }).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.recurringPrice > CASH_PRICE_LIMIT && data.paymentMethod === 'cash') {
      ctx.addIssue({ code: 'custom', message: 'cashPriceAbove100' });
    }
    validateBillingPeriodBounds(data, ctx);
  });

export function validateCreateMembership(
  body: CreateMembershipRequestBody,
): ValidatedMembershipInput {
  const result = membershipSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError(result.error.issues[0].message);
  }

  const data = result.data;

  return {
    name: data.name,
    recurringPrice: data.recurringPrice,
    paymentMethod: data.paymentMethod ?? null,
    billingInterval: data.billingInterval,
    billingPeriods: data.billingPeriods,
    validFrom: data.validFrom ?? new Date(),
  };
}
