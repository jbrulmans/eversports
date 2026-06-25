import { buildMembershipData, buildPeriodData } from '../__fixtures__/membership.fixture';
import { InMemoryMembershipRepository } from './membership.repository';

describe('InMemoryMembershipRepository', () => {
  let repo: InMemoryMembershipRepository;

  beforeEach(() => {
    repo = new InMemoryMembershipRepository();
  });

  describe('findAll', () => {
    it('returns all seeded memberships', () => {
      expect(repo.findAll()).toHaveLength(3);
    });

    it('normalizes userId to user', () => {
      const memberships = repo.findAll();
      expect(memberships[0]).toHaveProperty('user', 2000);
      expect(memberships[0]).not.toHaveProperty('userId');
    });

    it('drops assignedBy field', () => {
      expect(repo.findAll()[0]).not.toHaveProperty('assignedBy');
    });

    it('parses date strings to Date objects', () => {
      const memberships = repo.findAll();
      expect(memberships[0].validFrom).toBeInstanceOf(Date);
      expect(memberships[0].validUntil).toBeInstanceOf(Date);
    });

    it('preserves null paymentMethod', () => {
      const membership3 = repo.findAll().find((m) => m.id === 3);
      expect(membership3?.paymentMethod).toBeNull();
    });
  });

  describe('findPeriodsByMembershipId', () => {
    it('returns only periods for the given membership id', () => {
      const periods = repo.findPeriodsByMembershipId(1);
      expect(periods).toHaveLength(1);
      expect(periods[0].membership).toBe(1);
    });

    it('returns empty array for a membership with no periods', () => {
      expect(repo.findPeriodsByMembershipId(999)).toEqual([]);
    });
  });

  describe('saveMembership', () => {
    it('generates id as max+1', () => {
      expect(repo.saveMembership(buildMembershipData()).id).toBe(4);
    });

    it('generates a uuid', () => {
      expect(repo.saveMembership(buildMembershipData()).uuid).toBeTruthy();
    });

    it('stores the membership so findAll returns it', () => {
      repo.saveMembership(buildMembershipData());
      expect(repo.findAll()).toHaveLength(4);
    });
  });

  describe('savePeriods', () => {
    it('generates ids and uuids for each period', () => {
      const saved = repo.savePeriods([
        buildPeriodData(),
        buildPeriodData({ start: new Date('2024-02-01'), end: new Date('2024-03-01') }),
      ]);
      expect(saved).toHaveLength(2);
      expect(saved[0].id).toBe(4);
      expect(saved[1].id).toBe(5);
      expect(saved[0].uuid).toBeTruthy();
      expect(saved[1].uuid).toBeTruthy();
    });
  });

  describe('reset', () => {
    it('discards saved data and reloads seed data', () => {
      repo.saveMembership(buildMembershipData());
      expect(repo.findAll()).toHaveLength(4);
      repo.reset();
      expect(repo.findAll()).toHaveLength(3);
    });
  });
});
