# 05 — Scheme Plans (templates)

A plan is the template. A scheme is a customer's instance of it. This file defines the template; `06` defines the instance.

Four axes define a plan: **value basis** (cash / gold weight), **payment pattern** (fixed / flexible), **amount rules** (including min & max payable), and **benefit + redemption rules**.

Every persisted plan mutation success response returns `data.auditEventId`; the non-persisting preview endpoint is excluded under `00 §12.1`.

---

## 1. Endpoints

| Method | Path | Phase | Permission |
|---|---|---|---|
| `GET` | `/admin/scheme-plans` | P1 | any tenant role |
| `POST` | `/admin/scheme-plans` | P1 | `plan.write` |
| `GET` | `/admin/scheme-plans/:planId` | P1 | any |
| `PATCH` | `/admin/scheme-plans/:planId` | P1 | `plan.write` |
| `POST` | `/admin/scheme-plans/:planId/activate` | P1 | `plan.write` |
| `POST` | `/admin/scheme-plans/:planId/deactivate` | P1 | `plan.write` |
| `POST` | `/admin/scheme-plans/:planId/duplicate` | P1.5 | `plan.write` |
| `POST` | `/admin/scheme-plans/preview-schedule` | P1 | `plan.write` |
| `GET` | `/admin/scheme-plans/:planId/stats` | P1 | any |
| `GET` | `/staff/scheme-plans` | P1 | staff app — enrolable plans for the staff's branch |
| `GET` | `/app/scheme-plans` | P1 | customer app — self-enrolable plans |

---

## 2. The plan object

**`POST /admin/scheme-plans`** — complete body with every field. Cash + fixed-date example.

```json
{
  "name": "Dhanam 11",
  "code": "DH11",
  "displayName": "Dhanam Gold Savings",
  "description": "Pay a fixed amount every month for 11 months and get the 12th month free.",
  "termsText": "1. Installments must be paid by the due date.\n2. Benefit applies only if all 11 installments are paid.",

  "valueBasis": "CASH",
  "paymentPattern": "FIXED",

  "durationMonths": 11,
  "installmentCount": 11,

  "amountRules": {
    "amountMode": "CUSTOMER_CHOSEN",
    "fixedAmountPaise": null,
    "slabsPaise": null,
    "minInstallmentPaise": 100000,
    "maxInstallmentPaise": 5000000,
    "multipleOfPaise": 50000
  },

  "scheduleRules": {
    "dueDateRule": "FIXED_DAY_OF_MONTH",
    "dueDayOfMonth": 10,
    "graceDays": 5,
    "firstInstallmentModeDefault": "COLLECT_NOW",
    "firstInstallmentModeEditable": true
  },

  "paymentRules": {
    "partialPaymentAllowed": false,
    "advancePaymentAllowed": true,
    "maxAdvanceInstallments": 3,
    "minPaymentPaise": null,
    "maxPaymentPerTransactionPaise": null
  },

  "flexibleRules": null,

  "benefit": {
    "type": "ONE_FREE_INSTALLMENT",
    "bonusBasis": null,
    "bonusValue": null,
    "textBenefit": null,
    "eligibility": {
      "requireAllInstallmentsPaid": true,
      "maxAllowedDefaults": 0,
      "minMonthsCompleted": 11
    },
    "displayLabel": "12th installment free"
  },

  "redemptionRules": {
    "prematureClosureAllowed": true,
    "lockInMonths": 3,
    "prematurePenalty": { "mode": "PERCENT_OF_PAID", "value": 2, "benefitTreatment": "FORFEIT" },
    "allowedModes": ["CASH", "GOLD_HANDOVER", "PURCHASE_ADJUSTMENT", "TRANSFER_TO_SCHEME"],
    "redeemAtAnyBranch": false
  },

  "availability": {
    "allBranches": true,
    "branchIds": [],
    "enrolmentOpenFrom": "2026-04-01",
    "enrolmentOpenTo": "2027-03-31",
    "maxEnrolments": null,
    "visibleInCustomerApp": true,
    "customerSelfEnrolAllowed": true
  },

  "status": "DRAFT"
}
```

**Response `201`**

```json
{
  "success": true,
  "data": { "id": "spl_01HQ7...", "status": "DRAFT", "version": 1, "auditEventId": "aud_01PLN..." }
}
```

---

## 3. Amount rules — min and max, per mode

This is the block that governs every amount validation everywhere in the system.

### `amountMode: JEWELLER_FIXED`
```json
{
  "amountMode": "JEWELLER_FIXED",
  "fixedAmountPaise": 500000,
  "slabsPaise": null,
  "minInstallmentPaise": 500000,
  "maxInstallmentPaise": 500000,
  "multipleOfPaise": null
}
```
Customer has no choice. Min and max are echoed equal to the fixed amount so downstream validators have one uniform contract.

### `amountMode: JEWELLER_SLABS`
```json
{
  "amountMode": "JEWELLER_SLABS",
  "fixedAmountPaise": null,
  "slabsPaise": [100000, 200000, 500000, 1000000],
  "minInstallmentPaise": 100000,
  "maxInstallmentPaise": 1000000,
  "multipleOfPaise": null
}
```
Customer picks one slab at enrolment. UI renders chips. Min/max derived from the slab array.

### `amountMode: CUSTOMER_CHOSEN`
```json
{
  "amountMode": "CUSTOMER_CHOSEN",
  "fixedAmountPaise": null,
  "slabsPaise": null,
  "minInstallmentPaise": 100000,
  "maxInstallmentPaise": 5000000,
  "multipleOfPaise": 50000
}
```
Customer types an amount at joining. Validated as `min ≤ amount ≤ max` and `amount % multipleOfPaise == 0`. Once chosen it is frozen on the scheme for all installments.

Validation errors: `AMOUNT_BELOW_MINIMUM`, `AMOUNT_ABOVE_MAXIMUM`, `AMOUNT_NOT_MULTIPLE`, each with the boundary in `details`:
```json
{
  "success": false,
  "error": {
    "code": "AMOUNT_BELOW_MINIMUM",
    "message": "Minimum installment for this plan is ₹1,000.",
    "details": { "minPaise": 100000, "maxPaise": 5000000, "multipleOfPaise": 50000, "providedPaise": 50000 }
  }
}
```

### `paymentRules.minPaymentPaise` / `maxPaymentPerTransactionPaise`

These are **per-transaction** bounds, distinct from the per-installment bounds above. They matter in two places:
- Flexible free window, where there is no installment to bound against.
- Partial payments on fixed plans, where `minPaymentPaise` sets the smallest acceptable part-payment.

---

## 4. Flexible plan rules

`paymentPattern: "FLEXIBLE"` requires `flexibleRules` and ignores `amountRules.amountMode`.

```json
{
  "paymentPattern": "FLEXIBLE",
  "durationMonths": 11,
  "installmentCount": 11,

  "amountRules": {
    "amountMode": "CUSTOMER_CHOSEN",
    "minInstallmentPaise": null,
    "maxInstallmentPaise": null,
    "multipleOfPaise": null
  },

  "flexibleRules": {
    "phaseMode": "FLEXIBLE_THEN_CAPPED",
    "capMode": "FLEXIBLE_PHASE_AVERAGE",
    "carryForwardMode": "NONE",

    "flexiblePhaseCycles": 6,
    "cappedPhaseCycles": 5,
    "averagingDivisor": 6,

    "frequencyMode": "MULTIPLE",

    "flexiblePhase": {
      "minimumPaymentPaise": 100000,
      "maximumPaymentPaise": 2500000,
      "paymentIncrementPaise": 10000,
      "minTotalPaise": 300000,
      "maxPaymentsPerCycle": null,
      "paymentsRequiredPerCycle": 0
    },

    "capComputation": {
      "formula": "FLEXIBLE_PHASE_TOTAL_DIV_AVERAGING_DIVISOR",
      "roundingMode": "ROUND_UP",
      "roundToNearestPaise": 10000,
      "minCycleCapPaise": 50000,
      "maxCycleCapPaise": 10000000,
      "onZeroFlexiblePhaseTotal": "CLOSE_SCHEME",
      "onBelowMinimumTotal": "USE_MINIMUM"
    },

    "cappedPhase": {
      "minimumPaymentPaise": 100000,
      "paymentIncrementPaise": 10000,
      "allowFinalRemainderBelowMinimum": true,
      "allowFutureCyclePayment": false,
      "maxAdvanceCycles": 0
    }
  }
}
```

`averagingDivisor` is configured independently of `flexiblePhaseCycles`. They are normally equal, but a plan may average six cycles of contribution over a different divisor.

### How the cycle cap is computed

At the end of `flexiblePhaseCycles`, a background job computes:

```
cycleCapPaise = round( flexiblePhaseTotalPaise / averagingDivisor )
```

`flexiblePhaseTotalPaise` is **derived from the ledger** — the sum of all confirmed `FREE_WINDOW_PAYMENT` entries on that scheme, never a stored running total. Rounding uses `roundingMode` + `roundToNearestPaise`, then clamps to `[minCycleCapPaise, maxCycleCapPaise]`.

`onZeroFlexiblePhaseTotal`:
- `CLOSE_SCHEME` — scheme moves to `CLOSED_PREMATURE` with zero settlement
- `USE_MINIMUM` — cap set to `minCycleCapPaise`
- `EXTEND_FLEXIBLE_PHASE` (P2) — grants one more cycle

The computed value, its inputs and the formula version are snapshotted onto the scheme as `capSnapshot`. A later plan edit never changes an already-capped scheme.

### How much can be paid in a capped cycle

**Each capped cycle carries its own independent allowance.** The current cycle's cap is never multiplied to produce a single larger payable figure.

```
cycleCap              = capSnapshot.cycleCapPaise
confirmedThisCycle    = Σ confirmed payments allocated to this cycle
pendingReserved       = Σ open payment intents reserving this cycle
remainingThisCycle    = cycleCap − confirmedThisCycle − pendingReserved

maximumPayableNow     = remainingThisCycle
minimumNormalPayment  = cappedPhase.minimumPaymentPaise
```

Unused allowance **expires at cycle end and does not carry forward** (`carryForwardMode: "NONE"`).

**Final-remainder exception.** When `remainingThisCycle` is greater than zero but below `minimumPaymentPaise`, and `allowFinalRemainderBelowMinimum` is `true`, the backend quotes the remainder anyway and returns a `FINAL_REMAINDER_BELOW_MINIMUM` warning. A ₹2,500 cap with ₹1,900 confirmed quotes ₹600 even though the normal minimum is ₹1,000.

### Paying a future cycle

Off by default. When `allowFutureCyclePayment` is `true` and `maxAdvanceCycles` is greater than zero, a customer may pay ahead, subject to four rules the backend enforces:

1. **The current cycle must be fully paid first.** `remainingThisCycle` must be zero → else `CURRENT_CYCLE_INCOMPLETE`.
2. **Future cycles are paid strictly in sequence.** You cannot skip cycle 9 to pay cycle 10 → else `CYCLE_SEQUENCE_VIOLATION`.
3. **Each future cycle consumes its own independently calculated cap.** The payment is allocated to that cycle and bounded by that cycle's own allowance — never by a multiple of the current cycle's cap.
4. **`maxAdvanceCycles` bounds how far ahead you may go**, counted from the current cycle → else `ADVANCE_CYCLE_LIMIT_EXCEEDED`.

With `allowFutureCyclePayment: false` (the default), any `targetCycle` beyond the current one returns `FUTURE_CYCLE_PAYMENT_NOT_ALLOWED`.

There is no "pay N months at once" concept in a flexible-average scheme. Paying two cycles means two allocations against two separately-capped cycles, quoted one at a time. `remainingSchemeValuePaise` remains a hard ceiling across the whole scheme and is enforced with `OVERPAYMENT_BLOCKED`.

The live computation is served by `GET /schemes/:id/payable-range` (see `06 §6`), so no client ever derives it.

---

## 5. Gold-weight plan

Identical to cash except `valueBasis: "GOLD_WEIGHT"`. The plan carries no purity — purity is tenant-wide (`03 §2`). Additional block:

```json
{
  "valueBasis": "GOLD_WEIGHT",
  "goldRules": {
    "rateSource": "TENANT_DAILY_RATE",
    "weightRoundingMode": "HALF_UP",
    "weightPrecisionMg": 1,
    "blockPaymentIfRateNotSet": true
  }
}
```

Every payment on such a scheme snapshots `ratePerGramPaise` and the derived `weightMg` onto its ledger entry. Rate edits after posting never retroactively change it.

---

## 6. Benefit block

### `ONE_FREE_INSTALLMENT`
```json
{
  "type": "ONE_FREE_INSTALLMENT",
  "displayLabel": "12th installment free",
  "eligibility": { "requireAllInstallmentsPaid": true, "maxAllowedDefaults": 0, "minMonthsCompleted": 11 }
}
```
At maturity the system credits one installment's worth. For cash plans that's the installment amount; for gold plans it's converted at the **maturity-date rate**. Posted as a `BENEFIT_CREDIT` ledger entry — computed and shown in the software.

### `FIXED_BONUS_AMOUNT`
```json
{
  "type": "FIXED_BONUS_AMOUNT",
  "bonusBasis": "PERCENT_OF_PAID",
  "bonusValue": 5,
  "maxBonusPaise": 500000,
  "displayLabel": "5% bonus on maturity (max ₹5,000)"
}
```
`bonusBasis` ∈ `FLAT` (`bonusValue` is paise) | `PERCENT_OF_PAID` (`bonusValue` is a percentage). Also computed and posted as `BENEFIT_CREDIT`.

### `TEXT_ONLY`
```json
{
  "type": "TEXT_ONLY",
  "textBenefit": "Zero making charges on gold ornaments purchased at maturity. Wastage capped at 8%.",
  "displayLabel": "Making charges waived"
}
```
Nothing is computed. The text is surfaced verbatim on the customer app scheme screen, the portal scheme page, and the redemption screen so staff can honour it manually. `finalValue` at redemption equals `totalPaid` with no benefit line.

---

## 7. Redemption rules block

```json
{
  "prematureClosureAllowed": true,
  "lockInMonths": 3,
  "prematurePenalty": {
    "mode": "PERCENT_OF_PAID",
    "value": 2,
    "flatPaise": null,
    "benefitTreatment": "FORFEIT"
  },
  "allowedModes": ["CASH", "GOLD_HANDOVER", "PURCHASE_ADJUSTMENT", "TRANSFER_TO_SCHEME"],
  "redeemAtAnyBranch": false
}
```

`prematurePenalty.mode` ∈ `NONE` | `FLAT` | `PERCENT_OF_PAID`.
`benefitTreatment` ∈ `FORFEIT` | `PRORATE` | `FULL`.

**Premature closure and scheme cancellation are the same operation** — one endpoint, one status (`CLOSED_PREMATURE`). Cancelling a scheme that has zero payments simply produces a zero settlement.

---

## 8. Plan editing rules

`PATCH /admin/scheme-plans/:planId` — what can change depends on whether schemes exist against the plan.

| Field group | No schemes yet | Schemes exist |
|---|---|---|
| `name`, `displayName`, `description`, `termsText`, `benefit.displayLabel` | Editable | Editable |
| `availability.*` | Editable | Editable |
| `amountRules.*`, `scheduleRules.*`, `paymentRules.*` | Editable | **Locked** |
| `flexibleRules.*` | Editable | **Locked** |
| `valueBasis`, `paymentPattern`, `durationMonths`, `installmentCount` | Editable | **Locked** |
| `benefit.type`, `benefit.bonusValue`, `benefit.eligibility` | Editable | **Locked** |
| `redemptionRules.*` | Editable | **Locked** |
| `goldRules.*` | Editable | **Locked** |

Locked-field edit attempt:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "This plan has 318 active schemes. Financial rules cannot be changed. Deactivate it and create a new version instead.",
    "details": { "lockedFields": ["amountRules.minInstallmentPaise", "benefit.bonusValue"], "activeSchemes": 318, "suggestion": "DUPLICATE_AND_EDIT" }
  }
}
```

`POST /admin/scheme-plans/:planId/duplicate` is the escape hatch — clones the plan as a `DRAFT` with `code` suffixed (`DH11-V2`) so the jeweller can version rather than mutate.

---

## 9. Schedule preview

**`POST /admin/scheme-plans/preview-schedule`** — no persistence, used by the plan builder and by the enrolment screen so the customer sees exactly what they're signing up for.

```json
{
  "planId": "spl_01HQ7...",
  "installmentAmountPaise": 500000,
  "startDate": "2026-09-14",
  "firstInstallmentMode": "COLLECT_NOW"
}
```
```json
{
  "success": true,
  "data": {
    "summary": {
      "installmentCount": 11,
      "installmentAmount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "totalPayable": { "amountPaise": 5500000, "amountDisplay": "₹55,000" },
      "firstDueDate": "2026-09-14",
      "maturityDate": "2027-07-10",
      "benefit": { "type": "ONE_FREE_INSTALLMENT", "displayLabel": "12th installment free", "estimatedValue": { "amountPaise": 500000, "amountDisplay": "₹5,000" } },
      "estimatedMaturityValue": { "amountPaise": 6000000, "amountDisplay": "₹60,000" },
      "estimatedGoldAtCurrentRate": null
    },
    "schedule": [
      { "installmentNumber": 1, "dueDate": "2026-09-14", "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" }, "note": "Collected at enrolment" },
      { "installmentNumber": 2, "dueDate": "2026-10-10", "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" }, "note": null },
      { "installmentNumber": 3, "dueDate": "2026-11-10", "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" }, "note": null }
    ]
  }
}
```

For a flexible plan the preview returns the two-phase structure instead:
```json
{
  "success": true,
  "data": {
    "summary": {
      "freeWindow": { "months": 6, "from": "2026-09-14", "to": "2027-03-13", "minPerPayment": { "amountPaise": 50000, "amountDisplay": "₹500" }, "maxPerPayment": { "amountPaise": 10000000, "amountDisplay": "₹1,00,000" } },
      "cappedPhase": { "cycles": 5, "from": "2027-03-14", "to": "2027-08-13", "note": "Each of these 5 cycles is capped at the average of your first 6 cycles' payments." },
      "maturityDate": "2027-08-13"
    },
    "schedule": []
  }
}
```

---

## 10. List & detail

**`GET /admin/scheme-plans`** — query `status`, `valueBasis`, `paymentPattern`, `branchId`, `enrolableOnly=true`.

```json
{
  "success": true,
  "data": [
    {
      "id": "spl_01HQ7...",
      "name": "Dhanam 11",
      "code": "DH11",
      "displayName": "Dhanam Gold Savings",
      "valueBasis": "CASH",
      "paymentPattern": "FIXED",
      "durationMonths": 11,
      "amountSummary": {
        "amountMode": "CUSTOMER_CHOSEN",
        "min": { "amountPaise": 100000, "amountDisplay": "₹1,000" },
        "max": { "amountPaise": 5000000, "amountDisplay": "₹50,000" },
        "multipleOf": { "amountPaise": 50000, "amountDisplay": "₹500" },
        "label": "₹1,000 – ₹50,000 (in multiples of ₹500)"
      },
      "benefit": { "type": "ONE_FREE_INSTALLMENT", "displayLabel": "12th installment free" },
      "status": "ACTIVE",
      "availability": { "allBranches": true, "visibleInCustomerApp": true, "customerSelfEnrolAllowed": true },
      "stats": { "activeSchemes": 318, "totalEnrolments": 402, "collectedThisMonth": { "amountPaise": 84200000, "amountDisplay": "₹8,42,000" } },
      "editLocked": true
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false }
}
```

`amountSummary.label` is a server-rendered sentence so every surface (portal, staff app, customer app) shows an identical, correctly formatted range with no client-side formatting logic.

**`GET /admin/scheme-plans/:planId/stats`**
```json
{
  "success": true,
  "data": {
    "enrolments": { "total": 402, "active": 318, "locked": 0, "matured": 12, "redeemed": 64, "closedPremature": 8, "defaulted": 14 },
    "financials": {
      "totalCollected": { "amountPaise": 1842000000, "amountDisplay": "₹1,84,20,000" },
      "outstandingExpected": { "amountPaise": 942000000, "amountDisplay": "₹94,20,000" },
      "goldLiability": { "weightMg": 0, "weightDisplay": "0.000 g" },
      "benefitLiability": { "amountPaise": 15900000, "amountDisplay": "₹1,59,000" }
    },
    "charts": {
      "enrolmentTrend": { "chartType": "bar", "series": [ { "key": "enrolments", "name": "Enrolments", "data": [ { "x": "2026-04", "y": 42 }, { "x": "2026-05", "y": 61 } ] } ] },
      "statusDistribution": { "chartType": "donut", "series": [ { "key": "status", "name": "Schemes", "data": [ { "x": "Active", "y": 318 }, { "x": "Redeemed", "y": 64 }, { "x": "Defaulted", "y": 14 } ] } ] }
    }
  }
}
```

**Plan count limit** — creating beyond the tier cap returns `LIMIT_SCHEME_PLANS`. Creating a `FLEXIBLE` plan on a tier without that feature returns `FEATURE_NOT_IN_PLAN` with `details.featureKey: "flexibleScheme"`.
