import { addMonths, addWeeks } from 'date-fns';

import { ValidationError } from '../errors';
import type { IMembershipRepository } from '../repositories';
import type {
  BillingInterval,
  MembershipPeriod,
  MembershipPeriodState,
  MembershipState,
  MembershipWithPeriods,
  ValidatedMembershipInput,
} from '../types';

const DEFAULT_USER_ID = 2000;

function assertNever(value: never): never {
  throw new Error(`Unhandled interval: ${String(value)}`);
}

export class MembershipService {
  constructor(
    private readonly repo: IMembershipRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  listMemberships(): MembershipWithPeriods[] {
    return this.repo.findAllWithPeriods();
  }

  createMembership(input: ValidatedMembershipInput): MembershipWithPeriods {
    if (input.billingPeriods < 1) {
      throw new ValidationError('invalidBillingPeriods');
    }

    const now = this.now();
    const periodData = this.generatePeriods(
      input.validFrom,
      input.billingInterval,
      input.billingPeriods,
      now,
    );
    const validUntil = periodData[periodData.length - 1].end;
    const state = this.determineState(input.validFrom, validUntil, now);

    return this.repo.saveMembershipWithPeriods({
      membership: {
        name: input.name,
        user: DEFAULT_USER_ID,
        recurringPrice: input.recurringPrice,
        validFrom: input.validFrom,
        validUntil,
        state,
        paymentMethod: input.paymentMethod,
        billingInterval: input.billingInterval,
        billingPeriods: input.billingPeriods,
      },
      periods: periodData,
    });
  }

  private advance(date: Date, interval: BillingInterval, count: number): Date {
    switch (interval) {
      case 'monthly':
        return addMonths(date, count);
      case 'yearly':
        return addMonths(date, count * 12);
      case 'weekly':
        return addWeeks(date, count);
      default:
        return assertNever(interval);
    }
  }

  private determineState(validFrom: Date, validUntil: Date, now: Date): MembershipState {
    if (validFrom > now) {
      return 'pending';
    }

    if (validUntil < now) {
      return 'expired';
    }

    return 'active';
  }

  private determinePeriodState(start: Date, end: Date, now: Date): MembershipPeriodState {
    if (now < start) return 'planned';
    if (now >= end) return 'issued';
    return 'active';
  }

  private generatePeriods(
    validFrom: Date,
    interval: BillingInterval,
    periods: number,
    now: Date,
  ): Omit<MembershipPeriod, 'id' | 'uuid' | 'membership'>[] {
    const result: Omit<MembershipPeriod, 'id' | 'uuid' | 'membership'>[] = [];
    let periodStart = validFrom;

    for (let i = 0; i < periods; i++) {
      const start = periodStart;
      const end = this.advance(start, interval, 1);
      result.push({
        start,
        end,
        state: this.determinePeriodState(start, end, now),
      });
      periodStart = end;
    }

    return result;
  }
}
