import type { CreateMembershipRequestBody, Membership, MembershipPeriod } from '../types';

export const buildMembershipData = (
  overrides?: Partial<Omit<Membership, 'id' | 'uuid'>>,
): Omit<Membership, 'id' | 'uuid'> => ({
  name: 'Test Plan',
  user: 2000,
  recurringPrice: 50,
  validFrom: new Date('2024-01-01'),
  validUntil: new Date('2024-12-31'),
  state: 'active',
  paymentMethod: 'cash',
  billingInterval: 'monthly',
  billingPeriods: 12,
  ...overrides,
});

export const buildPeriodData = (
  overrides?: Partial<Omit<MembershipPeriod, 'id' | 'uuid'>>,
): Omit<MembershipPeriod, 'id' | 'uuid'> => ({
  membership: 1,
  start: new Date('2024-01-01'),
  end: new Date('2024-02-01'),
  state: 'planned',
  ...overrides,
});

export const buildCreateMembershipRequestBody = (
  overrides?: Partial<CreateMembershipRequestBody>,
): CreateMembershipRequestBody => ({
  name: 'Test Plan',
  recurringPrice: 50,
  paymentMethod: 'cash',
  billingInterval: 'monthly',
  billingPeriods: 12,
  validFrom: '2024-01-01',
  ...overrides,
});
