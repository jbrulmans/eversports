import { buildCreateMembershipRequestBody } from '../__fixtures__/membership.fixture';
import { ValidationError } from '../errors';
import { InMemoryMembershipRepository } from '../repositories';
import type { ValidatedMembershipInput } from '../types';
import { validateCreateMembership } from '../validators';
import { MembershipService } from './membership.service';

function createValidatedInput(
  overrides?: Parameters<typeof validateCreateMembership>[0],
): ValidatedMembershipInput {
  return validateCreateMembership(buildCreateMembershipRequestBody(overrides));
}

describe('MembershipService', () => {
  let repo: InMemoryMembershipRepository;
  let service: MembershipService;

  beforeEach(() => {
    repo = new InMemoryMembershipRepository();
    service = new MembershipService(repo);
  });

  describe('listMemberships', () => {
    it('returns all seeded memberships with their periods', () => {
      const result = service.listMemberships();
      expect(result).toHaveLength(3);
      expect(result[0].membership.id).toBe(1);
      expect(result[0].membershipPeriods).toHaveLength(1);
    });

    it('returns membershipPeriods as an array for each membership', () => {
      const result = service.listMemberships();
      result.forEach((row) => {
        expect(Array.isArray(row.membershipPeriods)).toBe(true);
      });
    });
  });

  describe('createMembership', () => {
    it('creates a membership with correct fields', () => {
      const result = service.createMembership(createValidatedInput());

      expect(result.membership.name).toBe('Test Plan');
      expect(result.membership.user).toBe(2000);
      expect(result.membership.recurringPrice).toBe(50);
      expect(result.membership.billingInterval).toBe('monthly');
      expect(result.membership.billingPeriods).toBe(12);
      expect(result.membership.paymentMethod).toBe('cash');
      expect(result.membership.id).toBe(4);
      expect(result.membership.uuid).toBeTruthy();
    });

    it('generates the correct number of periods', () => {
      const result = service.createMembership(createValidatedInput());
      expect(result.membershipPeriods).toHaveLength(12);
    });

    it('links all periods to the membership id', () => {
      const result = service.createMembership(createValidatedInput());
      expect(result.membershipPeriods.every((p) => p.membership === result.membership.id)).toBe(
        true,
      );
    });

    it('generates period ids and uuids', () => {
      const result = service.createMembership(createValidatedInput());
      expect(result.membershipPeriods[0].id).toBe(4);
      expect(result.membershipPeriods[0].uuid).toBeTruthy();
    });

    it('derives validUntil from the last period end', () => {
      const result = service.createMembership(
        createValidatedInput({
          validFrom: '2024-01-01',
          billingInterval: 'monthly',
          billingPeriods: 6,
        }),
      );
      const lastPeriodEnd = result.membershipPeriods[result.membershipPeriods.length - 1].end;
      expect(result.membership.validUntil).toEqual(lastPeriodEnd);
    });

    it('throws a ValidationError when billingPeriods is less than 1', () => {
      const input: ValidatedMembershipInput = {
        name: 'Test Plan',
        recurringPrice: 50,
        paymentMethod: 'cash',
        billingInterval: 'monthly',
        billingPeriods: 0,
        validFrom: new Date('2024-01-01'),
      };
      expect(() => service.createMembership(input)).toThrow(ValidationError);
    });
  });

  describe('validUntil calculation', () => {
    it('calculates validUntil for monthly as validFrom + N months', () => {
      const result = service.createMembership(
        createValidatedInput({
          validFrom: '2024-01-15',
          billingInterval: 'monthly',
          billingPeriods: 6,
        }),
      );
      expect(result.membership.validUntil).toEqual(new Date('2024-07-15'));
    });

    it('calculates validUntil for yearly as validFrom + N years', () => {
      const result = service.createMembership(
        createValidatedInput({
          validFrom: '2024-01-15',
          billingInterval: 'yearly',
          billingPeriods: 3,
        }),
      );
      expect(result.membership.validUntil).toEqual(new Date('2027-01-15'));
    });

    it('calculates validUntil for weekly as validFrom + N weeks', () => {
      const result = service.createMembership(
        createValidatedInput({
          validFrom: '2024-01-15',
          billingInterval: 'weekly',
          billingPeriods: 4,
        }),
      );
      expect(result.membership.validUntil).toEqual(new Date('2024-02-12'));
    });
  });

  describe('month-end clamping (date-fns)', () => {
    it('clamps Jan 31 + 1 month to Feb 29 (leap year)', () => {
      const fixedNow = new Date('2024-01-01T12:00:00Z');
      const clockService = new MembershipService(repo, () => fixedNow);
      const result = clockService.createMembership(
        createValidatedInput({
          validFrom: '2024-01-31',
          billingInterval: 'monthly',
          billingPeriods: 6,
        }),
      );
      expect(result.membershipPeriods[0].end.getMonth()).toBe(1);
      expect(result.membershipPeriods[0].end.getDate()).toBe(29);
    });

    it('clamps Mar 31 + 1 month to Apr 30', () => {
      const fixedNow = new Date('2024-03-01T12:00:00Z');
      const clockService = new MembershipService(repo, () => fixedNow);
      const result = clockService.createMembership(
        createValidatedInput({
          validFrom: '2024-03-31',
          billingInterval: 'monthly',
          billingPeriods: 6,
        }),
      );
      expect(result.membershipPeriods[0].end.getMonth()).toBe(3);
      expect(result.membershipPeriods[0].end.getDate()).toBe(30);
    });

    it('clamps period end dates too', () => {
      const fixedNow = new Date('2024-01-01T12:00:00Z');
      const clockService = new MembershipService(repo, () => fixedNow);
      const result = clockService.createMembership(
        createValidatedInput({
          validFrom: '2024-01-31',
          billingInterval: 'monthly',
          billingPeriods: 6,
        }),
      );
      expect(result.membershipPeriods[0].end.getMonth()).toBe(1);
      expect(result.membershipPeriods[0].end.getDate()).toBe(29);
    });
  });

  describe('state determination', () => {
    it('sets state to pending when validFrom is in the future', () => {
      const result = service.createMembership(
        createValidatedInput({
          validFrom: '2099-01-01',
          billingInterval: 'monthly',
          billingPeriods: 6,
        }),
      );
      expect(result.membership.state).toBe('pending');
    });

    it('sets state to expired when validUntil is in the past', () => {
      const result = service.createMembership(
        createValidatedInput({
          validFrom: '2020-01-01',
          billingInterval: 'monthly',
          billingPeriods: 6,
        }),
      );
      expect(result.membership.state).toBe('expired');
    });

    it('sets state to active when validFrom is past and validUntil is future', () => {
      const fixedNow = new Date('2024-06-15T12:00:00Z');
      const clockService = new MembershipService(repo, () => fixedNow);
      const result = clockService.createMembership(
        createValidatedInput({
          validFrom: '2024-01-01',
          billingInterval: 'monthly',
          billingPeriods: 12,
        }),
      );
      expect(result.membership.state).toBe('active');
    });
  });

  describe('period state', () => {
    it('sets all periods to planned when membership starts in the future', () => {
      const result = service.createMembership(
        createValidatedInput({
          validFrom: '2099-01-01',
          billingInterval: 'monthly',
          billingPeriods: 6,
        }),
      );
      expect(result.membershipPeriods.every((p) => p.state === 'planned')).toBe(true);
    });

    it('sets past periods to issued', () => {
      const result = service.createMembership(
        createValidatedInput({
          validFrom: '2020-01-01',
          billingInterval: 'monthly',
          billingPeriods: 6,
        }),
      );
      expect(result.membershipPeriods.every((p) => p.state === 'issued')).toBe(true);
    });

    it('sets the current period to active', () => {
      const fixedNow = new Date('2024-06-15T12:00:00Z');
      const clockService = new MembershipService(repo, () => fixedNow);
      const result = clockService.createMembership(
        createValidatedInput({
          validFrom: '2024-01-01',
          billingInterval: 'monthly',
          billingPeriods: 12,
        }),
      );
      const activePeriods = result.membershipPeriods.filter((p) => p.state === 'active');
      expect(activePeriods).toHaveLength(1);
      expect(activePeriods[0].start.getTime()).toBeLessThanOrEqual(fixedNow.getTime());
      expect(activePeriods[0].end.getTime()).toBeGreaterThan(fixedNow.getTime());
    });

    it('sets mixed states when membership spans now', () => {
      const fixedNow = new Date('2024-06-15T12:00:00Z');
      const clockService = new MembershipService(repo, () => fixedNow);
      const result = clockService.createMembership(
        createValidatedInput({
          validFrom: '2024-01-01',
          billingInterval: 'monthly',
          billingPeriods: 12,
        }),
      );
      const hasPlanned = result.membershipPeriods.some((p) => p.state === 'planned');
      const hasActive = result.membershipPeriods.some((p) => p.state === 'active');
      const hasIssued = result.membershipPeriods.some((p) => p.state === 'issued');
      expect(hasPlanned).toBe(true);
      expect(hasActive).toBe(true);
      expect(hasIssued).toBe(true);
    });
  });

  describe('clock injection', () => {
    it('uses injected clock for state determination', () => {
      const fixedNow = new Date('2025-06-25T12:00:00Z');
      const clockService = new MembershipService(repo, () => fixedNow);

      const result = clockService.createMembership(
        createValidatedInput({
          validFrom: '2025-06-25',
          billingInterval: 'monthly',
          billingPeriods: 6,
        }),
      );
      expect(result.membership.state).toBe('active');
    });

    it('uses injected clock for period state', () => {
      const fixedNow = new Date('2024-06-15T12:00:00Z');
      const clockService = new MembershipService(repo, () => fixedNow);

      const result = clockService.createMembership(
        createValidatedInput({
          validFrom: '2024-01-01',
          billingInterval: 'monthly',
          billingPeriods: 12,
        }),
      );
      const issuedCount = result.membershipPeriods.filter((p) => p.state === 'issued').length;
      const activeCount = result.membershipPeriods.filter((p) => p.state === 'active').length;
      const plannedCount = result.membershipPeriods.filter((p) => p.state === 'planned').length;
      expect(issuedCount).toBe(5);
      expect(activeCount).toBe(1);
      expect(plannedCount).toBe(6);
    });
  });

  describe('period generation', () => {
    it('generates consecutive periods for monthly', () => {
      const fixedNow = new Date('2024-01-01T12:00:00Z');
      const clockService = new MembershipService(repo, () => fixedNow);
      const result = clockService.createMembership(
        createValidatedInput({
          validFrom: '2024-01-01',
          billingInterval: 'monthly',
          billingPeriods: 6,
        }),
      );

      expect(result.membershipPeriods[0].start).toEqual(new Date('2024-01-01'));
      expect(result.membershipPeriods[0].end).toEqual(new Date('2024-02-01'));
      expect(result.membershipPeriods[1].start).toEqual(new Date('2024-02-01'));
      expect(result.membershipPeriods[1].end).toEqual(new Date('2024-03-01'));
      expect(result.membershipPeriods[2].start).toEqual(new Date('2024-03-01'));
      expect(result.membershipPeriods[2].end).toEqual(new Date('2024-04-01'));
    });

    it('generates consecutive periods for yearly', () => {
      const fixedNow = new Date('2024-01-01T12:00:00Z');
      const clockService = new MembershipService(repo, () => fixedNow);
      const result = clockService.createMembership(
        createValidatedInput({
          validFrom: '2024-01-01',
          billingInterval: 'yearly',
          billingPeriods: 3,
        }),
      );

      expect(result.membershipPeriods[0].start).toEqual(new Date('2024-01-01'));
      expect(result.membershipPeriods[0].end).toEqual(new Date('2025-01-01'));
      expect(result.membershipPeriods[1].start).toEqual(new Date('2025-01-01'));
      expect(result.membershipPeriods[1].end).toEqual(new Date('2026-01-01'));
    });

    it('generates consecutive periods for weekly', () => {
      const fixedNow = new Date('2024-01-01T12:00:00Z');
      const clockService = new MembershipService(repo, () => fixedNow);
      const result = clockService.createMembership(
        createValidatedInput({
          validFrom: '2024-01-01',
          billingInterval: 'weekly',
          billingPeriods: 2,
        }),
      );

      expect(result.membershipPeriods[0].start).toEqual(new Date('2024-01-01'));
      expect(result.membershipPeriods[0].end).toEqual(new Date('2024-01-08'));
      expect(result.membershipPeriods[1].start).toEqual(new Date('2024-01-08'));
      expect(result.membershipPeriods[1].end).toEqual(new Date('2024-01-15'));
    });
  });
});
