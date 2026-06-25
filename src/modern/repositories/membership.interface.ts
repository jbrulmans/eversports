import type { Membership, MembershipPeriod, MembershipWithPeriods } from '../types';

export interface IMembershipRepository {
  findAll(): Membership[];
  findPeriodsByMembershipId(membershipId: number): MembershipPeriod[];
  saveMembership(data: Omit<Membership, 'id' | 'uuid'>): Membership;
  savePeriods(periods: Omit<MembershipPeriod, 'id' | 'uuid'>[]): MembershipPeriod[];
  findAllWithPeriods(): MembershipWithPeriods[];
  saveMembershipWithPeriods(data: {
    membership: Omit<Membership, 'id' | 'uuid'>;
    periods: Omit<MembershipPeriod, 'id' | 'uuid' | 'membership'>[];
  }): { membership: Membership; membershipPeriods: MembershipPeriod[] };
  reset(): void;
}
