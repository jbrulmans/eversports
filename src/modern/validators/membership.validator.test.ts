import { buildCreateMembershipRequestBody } from '../__fixtures__/membership.fixture';
import { ValidationError } from '../errors';
import type { CreateMembershipRequestBody } from '../types';
import { validateCreateMembership } from './membership.validator';

function expectValidationError(body: Partial<CreateMembershipRequestBody>, code: string) {
  expect(() => validateCreateMembership(buildCreateMembershipRequestBody(body))).toThrow(
    new ValidationError(code),
  );
}

describe('validateCreateMembership', () => {
  describe('mandatory fields', () => {
    it('throws missingMandatoryFields when name is missing', () => {
      expectValidationError({ name: undefined }, 'missingMandatoryFields');
    });

    it('throws missingMandatoryFields when name is empty', () => {
      expectValidationError({ name: '' }, 'missingMandatoryFields');
    });

    it('throws invalidFieldType when name is a number', () => {
      expectValidationError({ name: 123 as unknown as string }, 'invalidFieldType');
    });

    it('throws missingMandatoryFields when recurringPrice is missing', () => {
      expectValidationError({ recurringPrice: undefined }, 'missingMandatoryFields');
    });

    it('accepts recurringPrice = 0 (free membership)', () => {
      expect(() =>
        validateCreateMembership(buildCreateMembershipRequestBody({ recurringPrice: 0 })),
      ).not.toThrow();
    });

    it('throws missingMandatoryFields when billingInterval is missing', () => {
      expectValidationError({ billingInterval: undefined }, 'missingMandatoryFields');
    });

    it('throws missingMandatoryFields when billingPeriods is missing', () => {
      expectValidationError({ billingPeriods: undefined }, 'missingMandatoryFields');
    });
  });

  describe('recurringPrice', () => {
    it('throws negativeRecurringPrice for negative price', () => {
      expectValidationError({ recurringPrice: -10 }, 'negativeRecurringPrice');
    });

    it('throws invalidFieldType for string input', () => {
      expectValidationError({ recurringPrice: '50' as unknown as number }, 'invalidFieldType');
    });
  });

  describe('paymentMethod', () => {
    it('throws invalidPaymentMethod for invalid payment method', () => {
      expectValidationError({ paymentMethod: 'btc' }, 'invalidPaymentMethod');
    });

    it('accepts cash', () => {
      const result = validateCreateMembership(
        buildCreateMembershipRequestBody({ paymentMethod: 'cash' }),
      );
      expect(result.paymentMethod).toBe('cash');
    });

    it('accepts credit card', () => {
      const result = validateCreateMembership(
        buildCreateMembershipRequestBody({ paymentMethod: 'credit card' }),
      );
      expect(result.paymentMethod).toBe('credit card');
    });

    it('normalizes undefined to null', () => {
      const result = validateCreateMembership(
        buildCreateMembershipRequestBody({ paymentMethod: undefined }),
      );
      expect(result.paymentMethod).toBeNull();
    });

    it('normalizes null to null', () => {
      const result = validateCreateMembership(
        buildCreateMembershipRequestBody({ paymentMethod: null as unknown as string }),
      );
      expect(result.paymentMethod).toBeNull();
    });
  });

  describe('cash price limit', () => {
    it('throws cashPriceAbove100 when price > 100 and paymentMethod is cash', () => {
      expectValidationError({ recurringPrice: 101, paymentMethod: 'cash' }, 'cashPriceAbove100');
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
    it('throws invalidBillingPeriods when billingPeriods is 0', () => {
      expectValidationError({ billingPeriods: 0 }, 'invalidBillingPeriods');
    });

    it('throws invalidBillingPeriods when billingPeriods is negative', () => {
      expectValidationError({ billingPeriods: -5 }, 'invalidBillingPeriods');
    });

    it('throws invalidBillingPeriods when billingPeriods is fractional', () => {
      expectValidationError({ billingPeriods: 2.5 }, 'invalidBillingPeriods');
    });

    it('throws invalidFieldType for string input', () => {
      expectValidationError({ billingPeriods: '12' as unknown as number }, 'invalidFieldType');
    });
  });

  describe('monthly interval', () => {
    it('throws billingPeriodsMoreThan12Months when billingPeriods > 12', () => {
      expectValidationError(
        { billingInterval: 'monthly', billingPeriods: 13 },
        'billingPeriodsMoreThan12Months',
      );
    });

    it('accepts billingPeriods = 12 (boundary)', () => {
      expect(() =>
        validateCreateMembership(
          buildCreateMembershipRequestBody({ billingInterval: 'monthly', billingPeriods: 12 }),
        ),
      ).not.toThrow();
    });

    it('throws billingPeriodsLessThan6Months when billingPeriods < 6', () => {
      expectValidationError(
        { billingInterval: 'monthly', billingPeriods: 5 },
        'billingPeriodsLessThan6Months',
      );
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
    it('throws billingPeriodsMoreThan10Years when billingPeriods > 10', () => {
      expectValidationError(
        { billingInterval: 'yearly', billingPeriods: 11 },
        'billingPeriodsMoreThan10Years',
      );
    });

    it('throws billingPeriodsLessThan3Years when billingPeriods < 3', () => {
      expectValidationError(
        { billingInterval: 'yearly', billingPeriods: 2 },
        'billingPeriodsLessThan3Years',
      );
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

    it('throws invalidBillingPeriods when billingPeriods is 0', () => {
      expectValidationError(
        { billingInterval: 'weekly', billingPeriods: 0 },
        'invalidBillingPeriods',
      );
    });
  });

  describe('invalid interval', () => {
    it('throws invalidBillingPeriods for unknown interval', () => {
      expectValidationError({ billingInterval: 'daily' }, 'invalidBillingPeriods');
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

    it('defaults to now when validFrom is null', () => {
      const before = new Date();
      const result = validateCreateMembership(
        buildCreateMembershipRequestBody({ validFrom: null as unknown as string }),
      );
      const after = new Date();
      expect(result.validFrom.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.validFrom.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('throws invalidDateFormat for unparseable date string', () => {
      expectValidationError({ validFrom: 'banana' }, 'invalidDateFormat');
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
