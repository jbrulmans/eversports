import request from 'supertest';

import { buildCreateMembershipRequestBody } from '../__fixtures__/membership.fixture';
import { createApp } from '../../app';

describe('GET /memberships', () => {
  it('returns 200 with all seeded memberships and their periods', async () => {
    const app = createApp();
    const response = await request(app).get('/memberships');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
    expect(response.body[0]).toHaveProperty('membership');
    expect(response.body[0]).toHaveProperty('membershipPeriods');
    expect(response.body[0].membership).toHaveProperty('id', 1);
    expect(response.body[0].membership).toHaveProperty('name', 'Platinum Plan');
  });

  it('returns membershipPeriods as an array for each membership', async () => {
    const app = createApp();
    const response = await request(app).get('/memberships');

    response.body.forEach((row: { membershipPeriods: unknown[] }) => {
      expect(Array.isArray(row.membershipPeriods)).toBe(true);
    });
  });
});

describe('POST /memberships', () => {
  it('returns 201 with created membership and periods', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/memberships')
      .send(buildCreateMembershipRequestBody());

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('membership');
    expect(response.body).toHaveProperty('membershipPeriods');
    expect(response.body.membership.name).toBe('Test Plan');
    expect(response.body.membership.user).toBe(2000);
    expect(response.body.membership.recurringPrice).toBe(50);
    expect(response.body.membership.billingInterval).toBe('monthly');
    expect(response.body.membership.billingPeriods).toBe(12);
    expect(response.body.membership.id).toBe(4);
    expect(response.body.membership.uuid).toBeTruthy();
    expect(response.body.membershipPeriods).toHaveLength(12);
  });

  it('links all periods to the membership id', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/memberships')
      .send(buildCreateMembershipRequestBody());

    expect(
      response.body.membershipPeriods.every(
        (p: { membership: number }) => p.membership === response.body.membership.id,
      ),
    ).toBe(true);
  });

  it('sets all period states to planned when validFrom is in the future', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/memberships')
      .send(buildCreateMembershipRequestBody({ validFrom: '2099-01-01' }));

    expect(
      response.body.membershipPeriods.every((p: { state: string }) => p.state === 'planned'),
    ).toBe(true);
  });

  it('returns 400 with missingMandatoryFields when name is missing', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/memberships')
      .send(buildCreateMembershipRequestBody({ name: undefined }));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'missingMandatoryFields' });
  });

  it('returns 400 with missingMandatoryFields when recurringPrice is missing', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/memberships')
      .send(buildCreateMembershipRequestBody({ recurringPrice: undefined }));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'missingMandatoryFields' });
  });

  it('returns 400 with negativeRecurringPrice for negative price', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/memberships')
      .send(buildCreateMembershipRequestBody({ recurringPrice: -10 }));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'negativeRecurringPrice' });
  });

  it('returns 400 with cashPriceAbove100 when price > 100 with cash', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/memberships')
      .send(buildCreateMembershipRequestBody({ recurringPrice: 101, paymentMethod: 'cash' }));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'cashPriceAbove100' });
  });

  it('returns 400 with billingPeriodsMoreThan12Months for monthly > 12', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/memberships')
      .send(buildCreateMembershipRequestBody({ billingPeriods: 13 }));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'billingPeriodsMoreThan12Months' });
  });

  it('returns 400 with billingPeriodsLessThan6Months for monthly < 6', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/memberships')
      .send(buildCreateMembershipRequestBody({ billingPeriods: 5 }));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'billingPeriodsLessThan6Months' });
  });

  it('returns 400 with invalidBillingPeriods for unknown interval', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/memberships')
      .send(buildCreateMembershipRequestBody({ billingInterval: 'daily' }));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'invalidBillingPeriods' });
  });

  it('returns 400 with invalidPaymentMethod for invalid payment method', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/memberships')
      .send(buildCreateMembershipRequestBody({ paymentMethod: 'btc' }));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'invalidPaymentMethod' });
  });

  it('returns 400 with invalidDateFormat for unparseable date', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/memberships')
      .send(buildCreateMembershipRequestBody({ validFrom: 'banana' }));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'invalidDateFormat' });
  });

  it('accepts yearly interval with valid billingPeriods', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/memberships')
      .send(buildCreateMembershipRequestBody({ billingInterval: 'yearly', billingPeriods: 3 }));

    expect(response.status).toBe(201);
    expect(response.body.membershipPeriods).toHaveLength(3);
  });

  it('accepts weekly interval with valid billingPeriods', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/memberships')
      .send(buildCreateMembershipRequestBody({ billingInterval: 'weekly', billingPeriods: 4 }));

    expect(response.status).toBe(201);
    expect(response.body.membershipPeriods).toHaveLength(4);
  });
});

describe('404 handling', () => {
  it('returns 404 for unknown routes', async () => {
    const app = createApp();
    const response = await request(app).get('/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'notFound' });
  });
});
