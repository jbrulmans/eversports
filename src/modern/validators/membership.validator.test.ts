import { buildCreateMembershipRequestBody } from '../__fixtures__/membership.fixture';
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
import { validateCreateMembership } from './membership.validator';

describe('validateCreateMembership', () => {
  describe('mandatory fields', () => {
    it('throws MissingMandatoryFieldsError when name is missing', () => {
      expect(() =>
        validateCreateMembership(buildCreateMembershipRequestBody({ name: undefined })),
      ).toThrow(MissingMandatoryFieldsError);
    });

    it('throws MissingMandatoryFieldsError when recurringPrice is missing', () => {
      expect(() =>
        validateCreateMembership(buildCreateMembershipRequestBody({ recurringPrice: undefined })),
      ).toThrow(MissingMandatoryFieldsError);
    });

    it('accepts recurringPrice = 0 (free membership)', () => {
      expect(() =>
        validateCreateMembership(buildCreateMembershipRequestBody({ recurringPrice: 0 })),
      ).not.toThrow();
    });

    it('throws MissingMandatoryFieldsError when billingInterval is missing', () => {
      expect(() =>
        validateCreateMembership(buildCreateMembershipRequestBody({ billingInterval: undefined })),
      ).toThrow(MissingMandatoryFieldsError);
    });

    it('throws MissingMandatoryFieldsError when billingPeriods is missing', () => {
      expect(() =>
        validateCreateMembership(buildCreateMembershipRequestBody({ billingPeriods: undefined })),
      ).toThrow(MissingMandatoryFieldsError);
    });
  });

  describe('recurringPrice', () => {
    it('throws NegativeRecurringPriceError for negative price', () => {
      expect(() =>
        validateCreateMembership(buildCreateMembershipRequestBody({ recurringPrice: -10 })),
      ).toThrow(NegativeRecurringPriceError);
    });
  });

  describe('cash price limit', () => {
    it('throws CashPriceExceedsLimitError when price > 100 and paymentMethod is cash', () => {
      expect(() =>
        validateCreateMembership(
          buildCreateMembershipRequestBody({ recurringPrice: 101, paymentMethod: 'cash' }),
        ),
      ).toThrow(CashPriceExceedsLimitError);
    });

    it('accepts price = 100 with cash (boundary)', () => {
      expect(() =>
        validateCreateMembership(
          buildCreateMembershipRequestBody({ recurringPrice: 100, paymentMethod: 'cash' }),
        ),
      ).not.toThrow();
    });

    it('accepts price > 100 with credit card', () => {
      expect(() =>
        validateCreateMembership(
          buildCreateMembershipRequestBody({ recurringPrice: 150, paymentMethod: 'credit card' }),
        ),
      ).not.toThrow();
    });
  });

  describe('billingPeriods value', () => {
    it('throws InvalidBillingPeriodsError when billingPeriods is 0', () => {
      expect(() =>
        validateCreateMembership(buildCreateMembershipRequestBody({ billingPeriods: 0 })),
      ).toThrow(InvalidBillingPeriodsError);
    });

    it('throws InvalidBillingPeriodsError when billingPeriods is negative', () => {
      expect(() =>
        validateCreateMembership(buildCreateMembershipRequestBody({ billingPeriods: -5 })),
      ).toThrow(InvalidBillingPeriodsError);
    });
  });

  describe('monthly interval', () => {
    it('throws BillingPeriodsExceedMonthlyLimitError when billingPeriods > 12', () => {
      expect(() =>
        validateCreateMembership(
          buildCreateMembershipRequestBody({ billingInterval: 'monthly', billingPeriods: 13 }),
        ),
      ).toThrow(BillingPeriodsExceedMonthlyLimitError);
    });

    it('accepts billingPeriods = 12 (boundary)', () => {
      expect(() =>
        validateCreateMembership(
          buildCreateMembershipRequestBody({ billingInterval: 'monthly', billingPeriods: 12 }),
        ),
      ).not.toThrow();
    });

    it('throws BillingPeriodsBelowMonthlyMinimumError when billingPeriods < 6', () => {
      expect(() =>
        validateCreateMembership(
          buildCreateMembershipRequestBody({ billingInterval: 'monthly', billingPeriods: 5 }),
        ),
      ).toThrow(BillingPeriodsBelowMonthlyMinimumError);
    });

    it('accepts billingPeriods = 6 (boundary)', () => {
      expect(() =>
        validateCreateMembership(
          buildCreateMembershipRequestBody({ billingInterval: 'monthly', billingPeriods: 6 }),
        ),
      ).not.toThrow();
    });
  });

  describe('yearly interval', () => {
    it('throws BillingPeriodsExceedYearlyLimitError when billingPeriods > 10', () => {
      expect(() =>
        validateCreateMembership(
          buildCreateMembershipRequestBody({ billingInterval: 'yearly', billingPeriods: 11 }),
        ),
      ).toThrow(BillingPeriodsExceedYearlyLimitError);
    });

    it('throws BillingPeriodsBelowYearlyMinimumError when billingPeriods < 3', () => {
      expect(() =>
        validateCreateMembership(
          buildCreateMembershipRequestBody({ billingInterval: 'yearly', billingPeriods: 2 }),
        ),
      ).toThrow(BillingPeriodsBelowYearlyMinimumError);
    });

    it('accepts billingPeriods = 3 (boundary)', () => {
      expect(() =>
        validateCreateMembership(
          buildCreateMembershipRequestBody({ billingInterval: 'yearly', billingPeriods: 3 }),
        ),
      ).not.toThrow();
    });

    it('accepts billingPeriods = 10 (boundary)', () => {
      expect(() =>
        validateCreateMembership(
          buildCreateMembershipRequestBody({ billingInterval: 'yearly', billingPeriods: 10 }),
        ),
      ).not.toThrow();
    });
  });

  describe('weekly interval', () => {
    it('accepts billingPeriods = 1', () => {
      expect(() =>
        validateCreateMembership(
          buildCreateMembershipRequestBody({ billingInterval: 'weekly', billingPeriods: 1 }),
        ),
      ).not.toThrow();
    });

    it('accepts billingPeriods = 100 (no upper bound)', () => {
      expect(() =>
        validateCreateMembership(
          buildCreateMembershipRequestBody({ billingInterval: 'weekly', billingPeriods: 100 }),
        ),
      ).not.toThrow();
    });

    it('throws InvalidBillingPeriodsError when billingPeriods is 0', () => {
      expect(() =>
        validateCreateMembership(
          buildCreateMembershipRequestBody({ billingInterval: 'weekly', billingPeriods: 0 }),
        ),
      ).toThrow(InvalidBillingPeriodsError);
    });
  });

  describe('invalid interval', () => {
    it('throws InvalidBillingIntervalError for unknown interval', () => {
      expect(() =>
        validateCreateMembership(buildCreateMembershipRequestBody({ billingInterval: 'daily' })),
      ).toThrow(InvalidBillingIntervalError);
    });
  });

  describe('validFrom', () => {
    it('parses validFrom when provided', () => {
      const result = validateCreateMembership(
        buildCreateMembershipRequestBody({ validFrom: '2025-06-01' }),
      );
      expect(result.validFrom).toEqual(new Date('2025-06-01'));
    });

    it('defaults to now when validFrom is not provided', () => {
      const before = new Date();
      const result = validateCreateMembership(
        buildCreateMembershipRequestBody({ validFrom: undefined }),
      );
      const after = new Date();
      expect(result.validFrom.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.validFrom.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('paymentMethod normalization', () => {
    it('normalizes undefined to null', () => {
      const result = validateCreateMembership(
        buildCreateMembershipRequestBody({ paymentMethod: undefined }),
      );
      expect(result.paymentMethod).toBeNull();
    });

    it('passes through cash', () => {
      const result = validateCreateMembership(
        buildCreateMembershipRequestBody({ paymentMethod: 'cash' }),
      );
      expect(result.paymentMethod).toBe('cash');
    });

    it('passes through credit card', () => {
      const result = validateCreateMembership(
        buildCreateMembershipRequestBody({ paymentMethod: 'credit card' }),
      );
      expect(result.paymentMethod).toBe('credit card');
    });

    it('passes through unvalidated values (matches legacy behavior)', () => {
      const result = validateCreateMembership(
        buildCreateMembershipRequestBody({ paymentMethod: 'btc' }),
      );
      expect(result.paymentMethod).toBe('btc');
    });
  });

  describe('happy path', () => {
    it('returns ValidatedMembershipInput with narrowed types', () => {
      const result = validateCreateMembership(buildCreateMembershipRequestBody());
      expect(result).toEqual({
        name: 'Test Plan',
        recurringPrice: 50,
        paymentMethod: 'cash',
        billingInterval: 'monthly',
        billingPeriods: 12,
        validFrom: new Date('2024-01-01'),
      });
    });

    it('accepts recurringPrice = 0 with no paymentMethod', () => {
      const result = validateCreateMembership(
        buildCreateMembershipRequestBody({ recurringPrice: 0, paymentMethod: undefined }),
      );
      expect(result.recurringPrice).toBe(0);
      expect(result.paymentMethod).toBeNull();
    });
  });
});
