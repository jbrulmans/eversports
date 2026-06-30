# Architecture

## Overview

The modernized membership codebase uses a layered architecture where each layer has a single responsibility. Request flow follows a clear path from HTTP entry to data persistence:

```text
HTTP Request
  → Routes (thin controllers)
    → Validator (Zod schema — input parsing, type narrowing, business rules)
      → Service (business logic, period generation, state calculation)
        → Repository (data access, persistence)
  → Error Handler (maps typed errors to HTTP responses)
HTTP Response
```

## Directory Structure

```text
src/
  app.ts                                 Express app factory (composition root)
  index.ts                               Server entry point
  error-handler.middleware.ts            Centralized error → HTTP response mapping
  legacy/
    routes/membership.routes.js          Original implementation (reference only)
  modern/
    routes/
      membership.routes.ts               Thin controllers (route factory)
    validators/
      membership.validator.ts            Zod schema + superRefine
    services/
      membership.service.ts              Business logic (periods, state, dates)
    repositories/
      membership.interface.ts            Repository contract (interface)
      membership.repository.ts           In-memory implementation
    types/
      membership.ts                      Domain model (entities + value types)
      membership.dto.ts                  API contract (request/response types)
    errors/
      base.error.ts                      Abstract BaseError (status + code)
      membership.error.ts                Concrete error classes
    __fixtures__/
      membership.fixture.ts              Test data builders
    __tests__/
      membership.integration.test.ts     Supertest integration tests
  data/
    memberships.json                     Seed data (memberships)
    membership-periods.json              Seed data (periods)
```

## Patterns and Rationale

### 1. Layered Architecture

Each layer handles one concern:

| Layer          | Responsibility                                | Depends on           |
| -------------- | --------------------------------------------- | -------------------- |
| **Routes**     | HTTP parsing, response formatting             | Service, Validator   |
| **Validator**  | Input parsing, type narrowing, business rules | None (pure function) |
| **Service**    | Business logic, period generation, state      | Repository           |
| **Repository** | Data access, persistence                      | None                 |

The service never touches `req`/`res`. The routes never contain business logic. The validator is stateless — it parses and throws, nothing else.

### 2. Repository Pattern

**`IMembershipRepository`** defines the data access contract. **`InMemoryMembershipRepository`** implements it with JSON seed data.

```ts
// Interface — pure contract, zero storage dependencies
export interface IMembershipRepository {
  findAll(): Membership[];
  findAllWithPeriods(): MembershipWithPeriods[];
  saveMembership(data: Omit<Membership, 'id' | 'uuid'>): Membership;
  saveMembershipWithPeriods(data: { membership: ...; periods: ... }): ...;
  reset(): void;
}
```

**Why:** The interface decouples the service from storage. Today it's in-memory JSON; tomorrow it could be Postgres, MongoDB, or an API. The service never knows the difference. `findAllWithPeriods()` signals N+1 awareness (a DB impl would use JOIN), `saveMembershipWithPeriods()` signals transaction awareness.

### 3. Dependency Injection

Constructor injection throughout:

```ts
// Service receives repository via constructor
export class MembershipService {
  constructor(
    private readonly repo: IMembershipRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}
}
```

**Why:** No hard-coded dependencies. The service depends on the interface, not the implementation. The composition root (`app.ts`) wires everything together:

```ts
// app.ts — the only place that knows about concrete implementations
const repo = new InMemoryMembershipRepository();
const service = new MembershipService(repo);
app.use('/memberships', createMembershipRouter(service));
```

### 4. Route Factory Pattern

Routes export a factory function, not a router singleton:

```ts
export function createMembershipRouter(service: MembershipService) {
  const router = express.Router();
  router.get('/', (req, res) => { ... });
  router.post('/', (req, res) => { ... });
  return router;
}
```

**Why:** The routes receive the service via parameter, not a module-level import. This keeps them decoupled from the concrete service instance. The composition root (`app.ts`) calls the factory with the wired service. Tests can create routers with mock services.

### 5. App/Server Split

```ts
// app.ts — factory, no listen()
export function createApp(): Express { ... }
export const app = createApp();

// index.ts — server entry, calls listen()
import { app } from './app';
app.listen(3099);
```

**Why:** Supertest imports `app` without binding a port. Each integration test calls `createApp()` for state isolation — fresh app, fresh repository, no test pollution. The production singleton `app` is used by `index.ts`.

### 6. Zod Schema Validation

```ts
const membershipSchema = z.object({
  name: z.string({ error: requiredOrTypeError() }).min(1, ...),
  recurringPrice: z.number({ error: requiredOrTypeError() }).min(0, ...),
  paymentMethod: z.enum(['cash', 'credit card'], { error: ... }).nullable().optional(),
  billingInterval: z.enum(['monthly', 'yearly', 'weekly'], { error: ... }),
  billingPeriods: z.number({ error: requiredOrTypeError() }).int(...).min(1, ...),
  validFrom: z.coerce.date({ message: 'invalidDateFormat' }).nullable().optional(),
}).superRefine((data, ctx) => {
  // Cash price limit (cross-field)
  // Billing period bounds (config map)
});
```

**Why:** Declarative schema handles mandatory fields, type narrowing, enum validation, and date coercion. Eliminates verbose `=== undefined` chains and `as` casts. The `superRefine` handles cross-field rules (cash price, interval bounds). `requiredOrTypeError()` distinguishes missing from wrong-type inputs — `missingMandatoryFields` for `undefined`, `invalidFieldType` for wrong types.

**v4-specific:** Uses `error` parameter (not `required_error`/`invalid_type_error` which are Zod v3).

### 7. Billing Period Bounds — Config Map

```ts
const BILLING_PERIOD_BOUNDS: Record<BillingInterval, { min; max; minCode; maxCode } | null> = {
  monthly: {
    min: 6,
    max: 12,
    minCode: 'billingPeriodsLessThan6Months',
    maxCode: 'billingPeriodsMoreThan12Months',
  },
  yearly: {
    min: 3,
    max: 10,
    minCode: 'billingPeriodsLessThan3Years',
    maxCode: 'billingPeriodsMoreThan10Years',
  },
  weekly: null,
};
```

**Why:** Declarative — one line per interval, no if/else branching. The check is always `> max` / `< min`, which makes the inverted-comparison bug from the legacy code structurally impossible. Adding a new interval is one map entry. Compile-time exhaustiveness: `Record<BillingInterval, ...>` forces you to handle every interval when the union grows.

### 8. Typed Error System

```ts
// Base class
export abstract class BaseError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;
}

// Concrete — ValidationError carries Zod error codes
export class ValidationError extends BaseError {
  readonly status = 400;
  constructor(readonly code: string) { ... }
}
```

**Why:** The error handler maps `BaseError` instances to HTTP responses:

```ts
if (err instanceof BaseError) {
  res.status(err.status).json({ message: err.code });
}
```

Zod produces error codes as strings (`'missingMandatoryFields'`, etc.). `ValidationError` carries them. The middleware collapses all validation/business-rule errors to one `instanceof BaseError` check. The `code` field preserves the legacy wire-format string exactly.

### 9. Clock Injection

```ts
constructor(
  private readonly repo: IMembershipRepository,
  private readonly now: () => Date = () => new Date(),
) {}
```

**Why:** State determination (`pending`/`active`/`expired`) and period state (`planned`/`active`/`issued`) depend on the current time. Injecting a clock makes tests deterministic — pass a fixed date instead of relying on `new Date()`. Default `() => new Date()` keeps production usage simple.

### 10. date-fns for Date Math

```ts
import { addMonths, addWeeks } from 'date-fns';

private advance(date: Date, interval: BillingInterval, count: number): Date {
  switch (interval) {
    case 'monthly': return addMonths(date, count);
    case 'yearly':  return addMonths(date, count * 12);
    case 'weekly':  return addWeeks(date, count);
    default: return this.assertNever(interval);
  }
}
```

**Why:** Hand-rolled `Date.setMonth` has edge cases (Jan 31 + 1mo → Mar 3, DST shifts, leap years). `date-fns.addMonths` clamps to the last day of the target month (Jan 31 + 1mo → Feb 28/29). Battle-tested, same clamping behavior we need. The switch has no default — `assertNever(interval)` makes the compiler catch a missing case if `BillingInterval` grows.

### 11. Barrel Exports

Every directory has an `index.ts` barrel:

```ts
// types/index.ts
export * from './membership';
export * from './membership.dto';
```

**Why:** Consumers import from the directory, not individual files: `import { Membership } from '../types'`. If the internal structure evolves (new files), callers don't change their imports. Applied uniformly — `types/`, `errors/`, `repositories/`, `services/`, `validators/`.

### 12. Fixture Builders (Factory Pattern)

```ts
export const buildCreateMembershipRequestBody = (
  overrides?: Partial<CreateMembershipRequestBody>,
): CreateMembershipRequestBody => ({
  name: 'Test Plan',
  recurringPrice: 50,
  // ... defaults
  ...overrides,
});
```

**Why:** Tests can override only the field they care about. Defaults are sensible. Avoids test coupling (one test mutating shared data affects another). Used by both unit tests and integration tests.

## Testing Strategy

| Type                  | Tool      | Scope                                                                    | Location                 |
| --------------------- | --------- | ------------------------------------------------------------------------ | ------------------------ |
| **Unit tests**        | Jest      | Service, Validator, Repository — pure logic, fast                        | Co-located (`*.test.ts`) |
| **Integration tests** | Supertest | Full HTTP pipeline — middleware, routes, validation, service, repository | `src/modern/__tests__/`  |

- Each test creates a fresh app via `createApp()` — no shared state, no test pollution.
- Fixture builders provide test data with override support.
- Tests run with `TZ=UTC` for deterministic date assertions.
- CI splits unit and integration tests into separate jobs.

## CI Pipeline

GitHub Actions runs on push to main. Five parallel jobs:

1. **lint** — `npm run lint`
2. **format** — `npx prettier --check .`
3. **typecheck** — `npm run typecheck`
4. **test:unit** — Jest, excluding `__tests__/`
5. **test:integration** — Jest, `__tests__/` only

All jobs use a composite action for Node setup (`.nvmrc` + npm cache + `npm ci`).
