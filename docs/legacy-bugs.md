# Legacy Bug Inventory

This document records every bug, inconsistency, and gap found in the legacy implementation (`src/legacy/routes/membership.routes.js`) and how each was addressed in the modernized codebase. The goal was to preserve the API contract (same error codes, same response shapes) while fixing the underlying logic.

## Bugs Fixed

### 1. `req.billingPeriods` typo — dead validation branch

**Legacy (line 29):**

```js
if (req.billingPeriods < 6) {
  // ← missing .body
  return res.status(400).json({ message: 'billingPeriodsLessThan6Months' });
}
```

**Problem:** `req.billingPeriods` is `undefined`. `undefined < 6` is `false`, so the monthly minimum check (`billingPeriodsLessThan6Months`) never fired — even for `billingPeriods: 1`.

**Fix:** Reads `req.body.billingPeriods`. The monthly minimum check now fires correctly.

---

### 2. Data field mismatch — GET returned empty periods

**Legacy:** The seed data uses `userId` and `membership` (JSON files), but the code creates memberships with `user` and periods with `membershipId`. The GET handler filters `p.membershipId === membership.id` — for seeded data, `membershipId` is `undefined`, so the filter matches nothing.

**Problem:** Every seeded membership returned `periods: []` in the GET response.

**Fix:** Normalized all field names to the README domain model (`user`, `membership`). The repository maps `userId` → `user` on load. The GET filter now uses the correct field name, so periods populate.

---

### 3. Misleading error code: `cashPriceBelow100`

**Legacy (line 22):**

```js
if (req.body.recurringPrice > 100 && req.body.paymentMethod === 'cash') {
  return res.status(400).json({ message: 'cashPriceBelow100' });
}
```

**Problem:** The condition fires when price is _above_ 100, but the code says "below." The condition is correct (reject cash payments over 100); the message name is wrong.

**Fix:** Code changed to `cashPriceAbove100`. The error class (`CashPriceExceedsLimitError`) already described the actual condition.

---

### 4. Inverted yearly comparison: `billingPeriodsLessThan3Years`

**Legacy (lines 33-38):**

```js
if (req.body.billingPeriods > 3) {
  if (req.body.billingPeriods > 10) {
    return res.status(400).json({ message: 'billingPeriodsMoreThan10Years' });
  } else {
    return res.status(400).json({ message: 'billingPeriodsLessThan3Years' });
  }
}
```

**Problem:** The condition `> 3` fires for 4-10 yearly periods — but the code says "less than 3 years." The comparison is inverted. Only 1-3 yearly periods are valid; 4-10 incorrectly throw an error named "less than 3."

**Fix:** Changed the condition to `< 3`. Now `billingPeriodsLessThan3Years` fires for genuinely-less-than-3 periods (1-2). 3-10 is valid. The error name and condition finally match.

---

### 5. Weekly interval dead code

**Legacy:** The validation `else` branch rejects `billingInterval: 'weekly'` with `invalidBillingPeriods`. But the date math (lines 50-52, 86-88) handles weekly. Net effect: weekly was never creatable.

**Fix:** Weekly is now a valid `billingInterval`. The `else` branch only fires for truly unknown intervals (e.g. `'daily'`).

---

### 6. `billingPeriods` not mandatory

**Legacy:** Only `name` and `recurringPrice` are checked for presence. `billingInterval` and `billingPeriods` are not validated as required — if `billingPeriods` is `undefined`, the loop runs 0 times and produces a membership with no periods.

**Fix:** All four fields (`name`, `recurringPrice`, `billingInterval`, `billingPeriods`) are mandatory. Missing any triggers `missingMandatoryFields`.

---

### 7. Fragile ID generation

**Legacy:** `id: memberships.length + 1` — breaks after a delete (collides with existing IDs).

**Fix:** `Math.max(0, ...existingIds) + 1` — always produces the next unique ID, regardless of deletions.

---

### 8. `setMonth` overflow

**Legacy:**

```js
validUntil.setMonth(validFrom.getMonth() + req.body.billingPeriods);
```

**Problem:** `Date.setMonth` rolls overflow forward — Jan 31 + 1 month = Mar 3 (not Feb 28). This affects both `validUntil` and every period `end` date.

**Fix:** Used `date-fns.addMonths` which clamps to the last day of the target month (Jan 31 + 1mo → Feb 28/29). Also used `date-fns.addWeeks` for the weekly interval.

---

### 9. Variable shadowing in period loop

**Legacy:** Inside the period loop, `const validFrom = periodStart` shadows the outer `validFrom`. Works but fragile — a future change could easily reference the wrong variable.

**Fix:** Used distinct names (`periodStart`, `start`, `end`) throughout the service.

---

### 10. Inconsistent envelope keys

**Legacy:** GET returns `{ membership, periods }`, POST returns `{ membership, membershipPeriods }`. Same data, two different key names.

**Fix:** Normalized to `membershipPeriods` in both endpoints. Matches the `MembershipPeriod` entity name.

---

### 11. Period state hardcoded to `planned`

**Legacy:** All generated periods are `state: 'planned'`, even for periods in the past. Mock data shows past periods should be `issued`.

**Fix:** Period state is calculated dynamically: `now < end → 'planned'`, `now >= end → 'issued'`. Same time-based logic as the membership state (`pending`/`active`/`expired`).

---

## Error Code Changes

| Legacy code         | Modern code         | Reason                                                       |
| ------------------- | ------------------- | ------------------------------------------------------------ |
| `cashPriceBelow100` | `cashPriceAbove100` | Misleading name — fires when price is _above_ 100, not below |

## New Error Codes Added

These validation rules didn't exist in the legacy. The error codes are new, added using the same response format `{ message: "<code>" }`:

| Code                   | Condition                                                                           | Why added                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `invalidPaymentMethod` | `paymentMethod` is not `'cash'` or `'credit card'`                                  | Legacy never validated payment method values — any string passed through. Added enum validation to close the gap.                        |
| `invalidDateFormat`    | `validFrom` is not a parseable date string                                          | Legacy accepted `'banana'` as a date (became `Invalid Date`). Added date coercion with Zod to reject garbage at validation time.         |
| `invalidFieldType`     | A field is present but the wrong type (e.g. `recurringPrice: "50"` instead of `50`) | Legacy had no type checking — truthy strings passed all numeric checks. Added type narrowing to distinguish "missing" from "wrong type." |

## New Validation Rules Added

| Rule                              | Legacy behavior                                         | Modern behavior                                                 |
| --------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| `billingInterval` required        | Not checked — `undefined` passed through                | `missingMandatoryFields`                                        |
| `billingPeriods` required         | Not checked — `undefined` produced 0 periods            | `missingMandatoryFields`                                        |
| `billingPeriods` must be integer  | Not checked — `2.5` accepted                            | `invalidBillingPeriods`                                         |
| `billingPeriods` must be positive | Not checked — `0` and `-1` accepted                     | `invalidBillingPeriods`                                         |
| `name` must be non-empty          | `!name` caught empty string but `=== undefined` doesn't | `z.string().min(1)` catches empty                               |
| `recurringPrice: 0` accepted      | `!0` was truthy, treated as missing                     | Explicit `=== undefined` check — `0` is a valid free membership |
| `paymentMethod` validated         | Any string accepted                                     | Must be `'cash'` or `'credit card'` or `null`/`undefined`       |
| `validFrom` date validated        | `new Date('banana')` → `Invalid Date` silently          | Zod `z.coerce.date()` rejects unparseable strings               |

## Response Shape

The response format is preserved: `{ message: "<error_code>" }` with HTTP 400 for validation errors, HTTP 500 for unexpected errors. All legacy error codes are used with the same wire-format strings. The middleware maps typed error classes to this format via `res.status(err.status).json({ message: err.code })`.
