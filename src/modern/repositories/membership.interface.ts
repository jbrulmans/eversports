import type { Membership, MembershipPeriod } from '../types';

export interface IMembershipRepository {
  findAll(): Membership[];
  findPeriodsByMembershipId(membershipId: number): MembershipPeriod[];
  saveMembership(data: Omit<Membership, 'id' | 'uuid'>): Membership;
  savePeriods(periods: Omit<MembershipPeriod, 'id' | 'uuid'>[]): MembershipPeriod[];
  reset(): void;
}
