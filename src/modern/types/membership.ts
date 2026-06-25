export type BillingInterval = 'monthly' | 'yearly' | 'weekly';
export type MembershipState = 'active' | 'pending' | 'expired';
export type MembershipPeriodState = 'planned' | 'issued';
export type PaymentMethod = 'cash' | 'credit card';

export interface Membership {
  id: number;
  uuid: string;
  name: string;
  user: number;
  recurringPrice: number;
  validFrom: Date;
  validUntil: Date;
  state: MembershipState;
  paymentMethod: PaymentMethod | null;
  billingInterval: BillingInterval;
  billingPeriods: number;
}

export interface MembershipPeriod {
  id: number;
  uuid: string;
  membership: number;
  start: Date;
  end: Date;
  state: MembershipPeriodState;
}
