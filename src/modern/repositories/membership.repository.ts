import { v4 as uuidv4 } from 'uuid';

import membershipPeriodsData from '../../data/membership-periods.json';
import membershipsData from '../../data/memberships.json';
import type { Membership, MembershipPeriod, MembershipWithPeriods } from '../types';
import type { IMembershipRepository } from './membership.interface';

export class InMemoryMembershipRepository implements IMembershipRepository {
  private memberships: Membership[] = [];
  private periods: MembershipPeriod[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.memberships = membershipsData.map((raw) => this.normalizeMembership(raw));
    this.periods = membershipPeriodsData.map((raw) => this.normalizePeriod(raw));
  }

  findAll(): Membership[] {
    return this.memberships;
  }

  findPeriodsByMembershipId(membershipId: number): MembershipPeriod[] {
    return this.periods.filter((p) => p.membership === membershipId);
  }

  saveMembership(data: Omit<Membership, 'id' | 'uuid'>): Membership {
    const membership: Membership = {
      ...data,
      id: this.nextMembershipId(),
      uuid: uuidv4(),
    };
    this.memberships.push(membership);
    return membership;
  }

  savePeriods(periods: Omit<MembershipPeriod, 'id' | 'uuid'>[]): MembershipPeriod[] {
    return periods.map((data) => {
      const period: MembershipPeriod = {
        ...data,
        id: this.nextPeriodId(),
        uuid: uuidv4(),
      };
      this.periods.push(period);
      return period;
    });
  }

  findAllWithPeriods(): MembershipWithPeriods[] {
    return this.memberships.map((membership) => ({
      membership,
      membershipPeriods: this.periods.filter((p) => p.membership === membership.id),
    }));
  }

  saveMembershipWithPeriods(data: {
    membership: Omit<Membership, 'id' | 'uuid'>;
    periods: Omit<MembershipPeriod, 'id' | 'uuid' | 'membership'>[];
  }): { membership: Membership; membershipPeriods: MembershipPeriod[] } {
    const membership = this.saveMembership(data.membership);
    const membershipPeriods = this.savePeriods(
      data.periods.map((p) => ({ ...p, membership: membership.id })),
    );
    return { membership, membershipPeriods };
  }

  private nextMembershipId(): number {
    return Math.max(0, ...this.memberships.map((m) => m.id)) + 1;
  }

  private nextPeriodId(): number {
    return Math.max(0, ...this.periods.map((p) => p.id)) + 1;
  }

  private normalizeMembership(raw: (typeof membershipsData)[number]): Membership {
    return {
      id: raw.id,
      uuid: raw.uuid,
      name: raw.name,
      user: raw.userId,
      recurringPrice: raw.recurringPrice,
      validFrom: new Date(raw.validFrom),
      validUntil: new Date(raw.validUntil),
      state: raw.state as Membership['state'],
      paymentMethod: raw.paymentMethod as Membership['paymentMethod'],
      billingInterval: raw.billingInterval as Membership['billingInterval'],
      billingPeriods: raw.billingPeriods,
    };
  }

  private normalizePeriod(raw: (typeof membershipPeriodsData)[number]): MembershipPeriod {
    return {
      id: raw.id,
      uuid: raw.uuid,
      membership: raw.membership,
      start: new Date(raw.start),
      end: new Date(raw.end),
      state: raw.state as MembershipPeriod['state'],
    };
  }
}
