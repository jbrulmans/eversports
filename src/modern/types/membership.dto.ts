import type { BillingInterval, Membership, MembershipPeriod, PaymentMethod } from './membership';

export interface CreateMembershipRequestBody {
  name?: string;
  recurringPrice?: number;
  paymentMethod?: string;
  billingInterval?: string;
  billingPeriods?: number;
  validFrom?: string;
}

export interface ValidatedMembershipInput {
  name: string;
  recurringPrice: number;
  paymentMethod: PaymentMethod;
  billingInterval: BillingInterval;
  billingPeriods: number;
  validFrom: Date;
}

export interface MembershipWithPeriods {
  membership: Membership;
  membershipPeriods: MembershipPeriod[];
}
