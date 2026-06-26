# Eversports Fullstack Interview

A modernized implementation of the membership management API, refactored from a legacy JavaScript codebase to a clean, layered TypeScript architecture.

[![CI](https://github.com/jbrulmans/eversports/actions/workflows/ci.yaml/badge.svg)](https://github.com/jbrulmans/eversports/actions/workflows/ci.yaml)
![Node](https://img.shields.io/badge/node-24.15-green)

## Prerequisites

- Node.js (see `.nvmrc` for version)
- npm

## Installation

```sh
npm install
```

## Usage

```sh
npm run start
```

Server runs on `http://localhost:3099`.

## API Endpoints

| Method | Path                  | Description                                       |
| ------ | --------------------- | ------------------------------------------------- |
| `GET`  | `/memberships`        | List all memberships with their billing periods   |
| `POST` | `/memberships`        | Create a new membership                           |
| `GET`  | `/legacy/memberships` | Legacy list endpoint (reference implementation)   |
| `POST` | `/legacy/memberships` | Legacy create endpoint (reference implementation) |

### POST /memberships — Request Body

```json
{
  "name": "string",
  "recurringPrice": 50,
  "paymentMethod": "cash",
  "billingInterval": "monthly",
  "billingPeriods": 12,
  "validFrom": "2024-01-01"
}
```

**Fields:**

- `name` — required, non-empty string
- `recurringPrice` — required, non-negative number
- `paymentMethod` — optional, `"cash"` or `"credit card"` (or `null`)
- `billingInterval` — required, `"monthly"`, `"yearly"`, or `"weekly"`
- `billingPeriods` — required, positive integer
- `validFrom` — optional, parseable date string (defaults to now)

**Validation rules:**

- `billingInterval: "monthly"` → `billingPeriods` must be 6-12
- `billingInterval: "yearly"` → `billingPeriods` must be 3-10
- `billingInterval: "weekly"` → no bounds (any positive integer)
- `recurringPrice > 100` with `paymentMethod: "cash"` → rejected

### Error Responses

All errors return `{ "message": "<code>" }` with HTTP 400:

| Code                             | Condition                                |
| -------------------------------- | ---------------------------------------- |
| `missingMandatoryFields`         | Required field missing                   |
| `negativeRecurringPrice`         | Price is negative                        |
| `cashPriceAbove100`              | Cash payment with price above 100        |
| `billingPeriodsMoreThan12Months` | Monthly periods exceed 12                |
| `billingPeriodsLessThan6Months`  | Monthly periods below 6                  |
| `billingPeriodsMoreThan10Years`  | Yearly periods exceed 10                 |
| `billingPeriodsLessThan3Years`   | Yearly periods below 3                   |
| `invalidBillingPeriods`          | Unknown interval or invalid period count |
| `invalidPaymentMethod`           | Invalid payment method value             |
| `invalidDateFormat`              | Unparseable date string                  |
| `invalidFieldType`               | Field present but wrong type             |

## Scripts

| Script              | Description                        |
| ------------------- | ---------------------------------- |
| `npm run start`     | Start the development server       |
| `npm run build`     | Compile TypeScript to JavaScript   |
| `npm run serve`     | Run compiled JavaScript            |
| `npm run test`      | Run all tests (unit + integration) |
| `npm run typecheck` | Type-check without emitting        |
| `npm run lint`      | Run ESLint                         |
| `npm run format`    | Format code with Prettier          |

## Project Structure

```text
src/
  app.ts                                 Express app factory (composition root)
  index.ts                               Server entry point
  error-handler.middleware.ts            Centralized error → HTTP response mapping
  legacy/routes/                         Original implementation (reference)
  modern/
    routes/membership.routes.ts          Thin controllers (route factory)
    validators/membership.validator.ts   Zod schema validation
    services/membership.service.ts       Business logic (periods, state, dates)
    repositories/
      membership.interface.ts            Repository contract
      membership.repository.ts           In-memory implementation
    types/
      membership.ts                      Domain model (entities + value types)
      membership.dto.ts                  API contract (request/response types)
    errors/
      base.error.ts                      Abstract BaseError
      membership.error.ts                Concrete error classes
    __fixtures__/                        Test data builders
    __tests__/                           Integration tests (supertest)
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full architecture documentation — layered design, software patterns used and why, directory structure, testing strategy, and CI pipeline.

## Legacy Bugs

See [docs/legacy-bugs.md](docs/legacy-bugs.md) for the complete inventory of bugs found in the legacy code — what was wrong, how it was fixed, error code changes, and new validation rules added.

## Assignment

See [docs/assignment.md](docs/assignment.md) for the original assignment brief.

## AI Support

See [AI-SUPPORT.md](AI-SUPPORT.md) for disclosure of AI tool usage during this project.
