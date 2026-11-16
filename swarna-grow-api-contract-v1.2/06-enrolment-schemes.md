# 06 — Enrolment & Scheme Accounts

A scheme is a customer's instance of a plan. Everything in the responses below is **derived from the ledger** at read time.

Every persisted enrolment or scheme mutation success response returns `data.auditEventId`; validate and preview calls do not persist and are excluded.

---

## 1. Endpoints

| Method | Path | Phase | Permission |
|---|---|---|---|
| `POST` | `/admin/schemes/enrol/validate` | P1 | `scheme.enrol` |
| `POST` | `/admin/schemes/enrol` | P1 | `scheme.enrol` |
| `GET` | `/admin/schemes` | P1 | `customer.read` |
| `GET` | `/admin/schemes/:schemeId` | P1 | `customer.read` |
| `GET` | `/admin/schemes/:schemeId/passbook` | P1 | `customer.read` |
| `GET` | `/admin/schemes/:schemeId/ledger` | P1 | `customer.read` |
| `GET` | `/admin/schemes/:schemeId/payable-range` | P1 | `payment.record` |
| `GET` | `/admin/schemes/:schemeId/maturity-projection` | P1 | `customer.read` |
| `POST` | `/admin/schemes/:schemeId/recompute` | P1.5 | `TENANT_OWNER` |
| `POST` | `/staff/schemes/enrol` | P1 | staff app, same contract |
| `POST` | `/app/schemes/enrol` | P1 | customer app self-enrol |

---

## 2. Pre-enrolment validation

**`POST /admin/schemes/enrol/validate`** — called on form change so the UI can show blockers before the customer signs anything. Never writes.

```json
{
  "customerId": "cus_01HQ8Z...",
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
    "canEnrol": false,
    "blockers": [
      { "code": "KYC_REQUIRED", "message": "KYC is mandatory for this jeweller. Upload Aadhaar or PAN before enrolling.", "resolvable": true, "actionPath": "/customers/cus_01HQ8Z/kyc" }
    ],
    "warnings": [
      { "code": "ACTIVE_CUSTOMERS_NEAR_LIMIT", "message": "You are at 96 of 100 active customers on the Starter plan." }
    ],
    "preview": {
      "installmentAmount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "installmentCount": 11,
      "totalPayable": { "amountPaise": 5500000, "amountDisplay": "₹55,000" },
      "firstDueDate": "2026-09-14",
      "maturityDate": "2027-07-10",
      "benefit": { "type": "ONE_FREE_INSTALLMENT", "displayLabel": "12th installment free", "estimatedValue": { "amountPaise": 500000, "amountDisplay": "₹5,000" } },
      "estimatedMaturityValue": { "amountPaise": 6000000, "amountDisplay": "₹60,000" },
      "schedulePreview": [
        { "installmentNumber": 1, "dueDate": "2026-09-14", "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" }, "note": "Collected at enrolment" },
        { "installmentNumber": 2, "dueDate": "2026-10-10", "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" }, "note": null }
      ]
    }
  }
}
```

Blocker codes: `KYC_REQUIRED`, `ONE_SCHEME_POLICY`, `LIMIT_ACTIVE_CUSTOMERS`, `PLAN_ENROLMENT_CLOSED`, `PLAN_NOT_AVAILABLE_AT_BRANCH`, `CUSTOMER_BLOCKED`, `AMOUNT_BELOW_MINIMUM`, `AMOUNT_ABOVE_MAXIMUM`, `AMOUNT_NOT_MULTIPLE`, `GOLD_RATE_NOT_SET`, `SUBSCRIPTION_INACTIVE`, `FEATURE_NOT_IN_PLAN`.

---

## 3. The first-installment decision

This is the one modelling choice that makes the mid-month joining case unambiguous. At enrolment the staff picks one of two modes and the system stores a single derived field, `firstDueDate`. Every other due date derives from it. There is no "is this September's or October's payment" question afterwards, because money is always posted against a **numbered installment**, never against a month.

### `firstInstallmentMode: "COLLECT_NOW"`

Customer pays on the day they join. Installment 1's due date **is the enrolment date**, and the payment posts against it immediately. Installment 2 falls on the next occurrence of the plan's due-day rule.

Joining 14 Sep on a plan with `dueDayOfMonth: 10`:

| # | Due date | Note |
|---|---|---|
| 1 | 2026-09-14 | Paid at enrolment |
| 2 | 2026-10-10 | |
| 3 | 2026-11-10 | |
| … | | |
| 11 | 2027-07-10 | Maturity 2027-07-10 |

### `firstInstallmentMode: "START_NEXT_CYCLE"`

No money changes hands at enrolment. Installment 1 is due on the next occurrence of the due-day rule. Scheme is `ACTIVE` with zero paid.

Joining 14 Sep, `dueDayOfMonth: 10`:

| # | Due date |
|---|---|
| 1 | 2026-10-10 |
| 2 | 2026-11-10 |
| … | |
| 11 | 2027-08-10 |

### Edge cases, resolved deterministically

- **Joining before the due day in the same month** — joining 5 Sep with `dueDayOfMonth: 10` and `START_NEXT_CYCLE` → installment 1 is due **10 Sep**, the same month, because that occurrence hasn't passed yet. The plan can force skipping it with `scheduleRules.minDaysToFirstDue` (default 0); if the gap is smaller than that, the schedule rolls to the next month.
- **Due day 29/30/31 in a short month** — clamped to the last day of that month. February due-day-31 becomes 28 (or 29).
- **`dueDateRule: JOIN_ANNIVERSARY`** — due dates are the same day-of-month as `firstDueDate`, with the same clamping.

`scheduleRules.firstInstallmentModeEditable: false` on the plan forces the jeweller's default and hides the toggle in the UI.

---

## 4. Enrol

**`POST /admin/schemes/enrol`**

Headers: `X-Idempotency-Key` required.

```json
{
  "customerId": "cus_01HQ8Z...",
  "planId": "spl_01HQ7...",
  "installmentAmountPaise": 500000,
  "startDate": "2026-09-14",
  "firstInstallmentMode": "COLLECT_NOW",
  "firstInstallmentAction": "RECORD_MANUAL_PAYMENT",
  "firstPayment": {
    "mode": "CASH",
    "amountPaise": 500000,
    "reference": null,
    "remarks": "Collected at counter"
  },
  "sendWelcomeMessage": true
}
```

- `installmentAmountPaise` required when `amountMode` is `CUSTOMER_CHOSEN` or `JEWELLER_SLABS`; ignored (and echoed from the plan) for `JEWELLER_FIXED`; omitted for flexible plans.
- When `firstInstallmentMode` is `COLLECT_NOW`, `firstInstallmentAction` is required and is either `RECORD_MANUAL_PAYMENT` or `CREATE_PAYMENT_LINK`.
- For `RECORD_MANUAL_PAYMENT`, `firstPayment` is required and its `mode` accepts only the five manually recordable modes (`CASH`, `CARD`, `UPI`, `BANK_TRANSFER`, `CHEQUE`).
- For `CREATE_PAYMENT_LINK`, `firstPayment` is forbidden. The scheme is created and the opening amount stays unconfirmed until the gateway callback. A fixed-date scheme returns `paymentLink`; a flexible-average scheme returns `paymentIntent` and reserves the quoted cycle allowance. A link is an action, never a stored payment mode.
- When `firstInstallmentMode` is `START_NEXT_CYCLE`, both `firstInstallmentAction` and `firstPayment` are forbidden.
- `ONLINE_LINK`, `ONLINE_GATEWAY`, deprecated `ONLINE` and `LEGACY_ONLINE` are never accepted in `firstPayment.mode`. Only a verified gateway callback creates an `ONLINE_GATEWAY` payment.
- `branchId` is **never** in the body. Derived from token.

Enrolment, schedule generation, first-payment posting, ledger entry, receipt-number issue, counter increments and the outbox message all happen inside **one MongoDB transaction**.

**Response `201`**
```json
{
  "success": true,
  "data": {
    "scheme": {
      "id": "sch_01HQ8Z3K7M9P2R4T6V8X0Y",
      "schemeNumber": "MGR/DH11/2026/00318",
      "customer": { "id": "cus_01HQ8Z...", "name": "Anjali Menon", "mobile": "9847XXXX33", "passbookNumber": "MGR/2026/00412" },
      "plan": { "id": "spl_01HQ7...", "name": "Dhanam 11", "valueBasis": "CASH", "paymentPattern": "FIXED" },
      "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
      "status": "ACTIVE",
      "startDate": "2026-09-14",
      "firstDueDate": "2026-09-14",
      "maturityDate": "2027-07-10",
      "installmentAmount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "installmentCount": 11,
      "firstInstallmentMode": "COLLECT_NOW",
      "firstInstallmentAction": "RECORD_MANUAL_PAYMENT",
      "enrolledBy": { "id": "usr_01HQ8...", "name": "Rahul Nair" }
    },
    "firstPayment": {
      "id": "pay_01HQ8...",
      "receiptNumber": "SG/MGR/2026/001284",
      "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "installmentNumber": 1,
      "status": "SUCCESS",
      "receiptUrl": "https://cdn.../receipt/pay_01HQ8.pdf",
      "passbookImageUrl": "https://cdn.../passbook/pay_01HQ8.png"
    },
    "messages": [
      { "messageType": "SCHEME_JOINED", "status": "QUEUED", "messageId": "msg_01HQ8..." },
      { "messageType": "PAYMENT_SUCCESS", "status": "QUEUED", "messageId": "msg_01HQ9..." }
    ],
    "auditEventId": "aud_01ENR..."
  }
}
```

For `firstInstallmentAction: "CREATE_PAYMENT_LINK"`, `firstPayment` is `null`. Fixed-date enrolment returns `paymentLink`; flexible-average enrolment returns the reservation-backed `paymentIntent` contract from `07 §2.2`. The same enrolment response carries one `auditEventId`.

---

## 5. Scheme detail

**`GET /admin/schemes/:schemeId`**

The response shape adapts to the scheme type. This is the payload the designer builds all three scheme screens from (portal, staff app, customer app) — the same object, rendered differently.

### Fixed scheme, active

```json
{
  "success": true,
  "data": {
    "id": "sch_01HQ8Z...",
    "schemeNumber": "MGR/DH11/2026/00318",
    "customer": { "id": "cus_01HQ8Z...", "name": "Anjali Menon", "mobile": "9847XXXX33", "passbookNumber": "MGR/2026/00412" },
    "plan": { "id": "spl_01HQ7...", "name": "Dhanam 11", "displayName": "Dhanam Gold Savings", "valueBasis": "CASH", "paymentPattern": "FIXED", "termsText": "..." },
    "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
    "status": "ACTIVE",
    "statusLabel": "Active",

    "displayMode": "FIXED",

    "dates": {
      "startDate": "2026-09-14",
      "firstDueDate": "2026-09-14",
      "maturityDate": "2027-07-10",
      "daysToMaturity": 299
    },

    "installmentAmount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },

    "progress": {
      "type": "INSTALLMENT_COUNT",
      "installmentsPaid": 4,
      "installmentsTotal": 11,
      "installmentsRemaining": 7,
      "percentComplete": 36.4,
      "amountPaid": { "amountPaise": 2000000, "amountDisplay": "₹20,000" },
      "amountRemaining": { "amountPaise": 3500000, "amountDisplay": "₹35,000" },
      "totalPayable": { "amountPaise": 5500000, "amountDisplay": "₹55,000" }
    },

    "goldAccrued": null,

    "nextDue": {
      "installmentNumber": 5,
      "dueDate": "2026-10-10",
      "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "daysAway": 26,
      "status": "PENDING",
      "graceEndsOn": "2026-10-15"
    },

    "overdue": { "count": 0, "amount": { "amountPaise": 0, "amountDisplay": "₹0" }, "oldestDueDate": null, "ageingDays": 0 },

    "benefit": {
      "type": "ONE_FREE_INSTALLMENT",
      "displayLabel": "12th installment free",
      "isComputed": true,
      "estimatedValue": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "textBenefit": null,
      "eligibility": { "onTrack": true, "reason": null }
    },

    "projection": {
      "estimatedMaturityValue": { "amountPaise": 6000000, "amountDisplay": "₹60,000" },
      "estimatedGoldAtCurrentRate": null
    },

    "actions": {
      "canRecordPayment": true,
      "canGeneratePaymentLink": true,
      "canRedeem": false,
      "canClosePremature": true,
      "canReverseLastPayment": true
    },

    "audit": { "createdAt": "2026-09-14T10:30:00+05:30", "createdBy": { "id": "usr_01HQ8...", "name": "Rahul Nair" }, "version": 9 }
  }
}
```

### Gold-weight scheme — additional fields

```json
{
  "displayMode": "FIXED",
  "plan": { "valueBasis": "GOLD_WEIGHT" },
  "goldAccrued": {
    "weightMg": 2761,
    "weightDisplay": "2.761 g",
    "valueAtCurrentRate": { "amountPaise": 2001725, "amountDisplay": "₹20,017" },
    "currentRate": { "ratePerGramPaise": 725000, "ratePerGramDisplay": "₹7,250" },
    "averageRatePaid": { "ratePerGramPaise": 724376, "ratePerGramDisplay": "₹7,244" },
    "gainLoss": { "amountPaise": 1725, "amountDisplay": "₹17", "percent": 0.09, "direction": "up" }
  },
  "projection": {
    "estimatedGoldAtCurrentRate": { "weightMg": 7586, "weightDisplay": "7.586 g" },
    "estimatedMaturityValue": { "amountPaise": 6000000, "amountDisplay": "₹60,000" }
  }
}
```

### Flexible scheme — free window

```json
{
  "displayMode": "FLEXIBLE_FREE_WINDOW",
  "status": "ACTIVE",

  "flexible": {
    "phase": "FREE_WINDOW",
    "freeWindow": {
      "months": 6,
      "from": "2026-05-01",
      "to": "2026-10-31",
      "monthsElapsed": 4,
      "monthsRemaining": 2,
      "percentElapsed": 66.7,
      "lockDate": "2026-11-01",
      "daysToLock": 48,
      "totalPaid": { "amountPaise": 2400000, "amountDisplay": "₹24,000" },
      "paymentCount": 7,
      "minPerPayment": { "amountPaise": 50000, "amountDisplay": "₹500" },
      "maxPerPayment": { "amountPaise": 10000000, "amountDisplay": "₹1,00,000" },
      "multipleOf": { "amountPaise": 10000, "amountDisplay": "₹100" },
      "minTotalRequired": { "amountPaise": 300000, "amountDisplay": "₹3,000" },
      "minTotalMet": true,
      "monthlyBreakdown": [
        { "month": "2026-05", "paid": { "amountPaise": 500000, "amountDisplay": "₹5,000" }, "paymentCount": 1 },
        { "month": "2026-06", "paid": { "amountPaise": 800000, "amountDisplay": "₹8,000" }, "paymentCount": 2 },
        { "month": "2026-07", "paid": { "amountPaise": 600000, "amountDisplay": "₹6,000" }, "paymentCount": 2 },
        { "month": "2026-08", "paid": { "amountPaise": 500000, "amountDisplay": "₹5,000" }, "paymentCount": 2 },
        { "month": "2026-09", "paid": { "amountPaise": 0, "amountDisplay": "₹0" }, "paymentCount": 0 }
      ]
    },
    "projectedLock": {
      "ifWindowClosedToday": { "amountPaise": 400000, "amountDisplay": "₹4,000" },
      "formulaLabel": "Total paid ÷ 6 months, rounded up to the nearest ₹100",
      "note": "This is an estimate. The final monthly amount is fixed on 1 Nov 2026."
    },
    "lockWindow": { "months": 5, "from": "2026-11-01", "to": "2027-03-31" }
  },

  "progress": {
    "type": "FREE_WINDOW_MONTHS",
    "percentComplete": 66.7,
    "amountPaid": { "amountPaise": 2400000, "amountDisplay": "₹24,000" },
    "label": "Month 4 of 6 — pay any amount"
  },

  "nextDue": null,

  "payableThisMonth": {
    "suggested": null,
    "min": { "amountPaise": 50000, "amountDisplay": "₹500" },
    "max": { "amountPaise": 10000000, "amountDisplay": "₹1,00,000" },
    "isMandatory": false,
    "helperText": "Pay any amount between ₹500 and ₹1,00,000 this month."
  }
}
```

### Flexible scheme — capped phase

Multiple payments are allowed inside one capped cycle. **The cycle, not the installment, is the unit of allowance.**

`displayMode` keeps the value `FLEXIBLE_LOCK_WINDOW` so existing clients don't break, but the phase is `CAPPED` and the model is per-cycle. Read `paymentPosition`, not `nextDue`, for anything financial.

```json
{
  "displayMode": "FLEXIBLE_LOCK_WINDOW",
  "status": "LOCKED",

  "flexible": {
    "phase": "CAPPED",
    "capSnapshot": {
      "cappedAt": "2026-11-01T00:05:00+05:30",
      "flexiblePhaseTotal": { "amountPaise": 1500000, "amountDisplay": "₹15,000" },
      "flexiblePhaseCycles": 6,
      "averagingDivisor": 6,
      "rawAverage": { "amountPaise": 250000, "amountDisplay": "₹2,500" },
      "roundingApplied": "ROUND_UP to nearest ₹100",
      "cycleCap": { "amountPaise": 250000, "amountDisplay": "₹2,500" },
      "formulaLabel": "₹15,000 ÷ 6 = ₹2,500 per cycle",
      "explainerText": "Each remaining month is capped at ₹2,500, based on what you paid in your first 6 months."
    },
    "cappedPhase": {
      "cycles": 5,
      "from": "2026-11-01",
      "to": "2027-03-31",
      "cyclesFullyPaid": 2,
      "cyclesTotal": 5,
      "cyclesRemaining": 3,
      "carryForward": false,
      "allowFutureCyclePayment": false,
      "maxAdvanceCycles": 0
    },
    "flexiblePhase": { "cycles": 6, "from": "2026-05-01", "to": "2026-10-31", "totalPaid": { "amountPaise": 1500000, "amountDisplay": "₹15,000" }, "paymentCount": 11 }
  },

  "paymentPosition": {
    "phase": "CAPPED",
    "targetCycle": "2026-09",
    "cycleNumber": 8,
    "cycleLabel": "September 2026",
    "currentCycleCap": { "amountPaise": 250000, "amountDisplay": "₹2,500" },
    "confirmedThisCycle": { "amountPaise": 190000, "amountDisplay": "₹1,900" },
    "pendingReserved": { "amountPaise": 0, "amountDisplay": "₹0" },
    "remainingThisCycle": { "amountPaise": 60000, "amountDisplay": "₹600" },
    "successfulPaymentCountThisCycle": 3,
    "finalRemainderException": true,
    "cycleFullyPaid": false,
    "positionVersion": 7
  },

  "progress": {
    "type": "CYCLE_COUNT",
    "cyclesFullyPaid": 2,
    "cyclesTotal": 5,
    "percentComplete": 40,
    "amountPaid": { "amountPaise": 1690000, "amountDisplay": "₹16,900" },
    "amountRemaining": { "amountPaise": 810000, "amountDisplay": "₹8,100" },
    "totalPayable": { "amountPaise": 2750000, "amountDisplay": "₹27,500" },
    "label": "Cycle 3 of 5 — ₹1,900 of ₹2,500 paid"
  },

  "nextDue": {
    "cycleNumber": 8,
    "cycleLabel": "September 2026",
    "dueDate": "2026-09-30",
    "amount": { "amountPaise": 60000, "amountDisplay": "₹600" },
    "daysAway": 16,
    "status": "PARTIALLY_PAID"
  },

  "payableThisMonth": {
    "suggested": { "amountPaise": 60000, "amountDisplay": "₹600" },
    "min": { "amountPaise": 60000, "amountDisplay": "₹600" },
    "max": { "amountPaise": 60000, "amountDisplay": "₹600" },
    "maxReason": "REMAINING_THIS_CYCLE",
    "isMandatory": false,
    "positionVersion": 7,
    "targetCycle": "2026-09",
    "helperText": "₹600 remains in this month's ₹2,500 allowance.",
    "finalRemainderException": true,
    "nextCycleAction": null
  }
}
```

When the current cycle is fully paid and the plan allows advance payment, `nextCycleAction` is populated and the UI may offer a "Pay next cycle" action:

```json
{
  "payableThisMonth": {
    "suggested": null,
    "min": null,
    "max": { "amountPaise": 0, "amountDisplay": "₹0" },
    "maxReason": "CYCLE_FULLY_PAID",
    "helperText": "This month's ₹2,500 is fully paid.",
    "nextCycleAction": {
      "available": true,
      "targetCycle": "2026-10",
      "cycleNumber": 9,
      "cycleLabel": "October 2026",
      "cycleCap": { "amountPaise": 250000, "amountDisplay": "₹2,500" },
      "remainingThatCycle": { "amountPaise": 250000, "amountDisplay": "₹2,500" },
      "cyclesAheadUsed": 1,
      "maxAdvanceCycles": 2,
      "label": "Pay October in advance"
    }
  }
}
```

`nextCycleAction.available` is `false` — with a `blockedReason` — whenever the plan disallows advance payment, the current cycle is incomplete, the sequence would be broken, or `maxAdvanceCycles` is exhausted. The client never decides this.

`payableThisMonth` is present on **every** scheme, in every phase, so the payment screen on all three surfaces reads one field and never computes a range itself.

---

## 6. Payable position (standalone)

```
GET /admin/schemes/:schemeId/payable-range?targetCycle=2026-09
GET /staff/schemes/:schemeId/payable-range?targetCycle=2026-09
GET /app/schemes/:schemeId/payable-range?targetCycle=2026-09
```

This endpoint is the **single authoritative source** of what may be paid. No client computes eligibility, caps, remainders or allocations.

`targetCycle` is `YYYY-MM` and optional; it defaults to the current cycle. For fixed-date schemes the legacy `month` parameter remains accepted as an alias.

### Fixed-date scheme (unchanged)

```json
{
  "success": true,
  "data": {
    "schemeId": "sch_01HQ8Z...",
    "paymentPattern": "FIXED",
    "month": "2027-01",
    "eligible": true,
    "suggested": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
    "min": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
    "max": { "amountPaise": 1500000, "amountDisplay": "₹15,000" },
    "isMandatory": false,
    "allowPartial": false,
    "multipleOf": null,
    "helperText": "Your monthly amount is ₹5,000. You may pay up to ₹15,000 to cover future months.",
    "coversInstallments": [3, 4, 5],
    "constraints": [
      { "key": "INSTALLMENT_AMOUNT", "value": { "amountPaise": 500000, "amountDisplay": "₹5,000" }, "label": "Monthly installment" },
      { "key": "MAX_ADVANCE_INSTALLMENTS", "value": { "amountPaise": 1500000, "amountDisplay": "₹15,000" }, "label": "Up to 3 installments in advance" },
      { "key": "REMAINING_SCHEME_VALUE", "value": { "amountPaise": 1500000, "amountDisplay": "₹15,000" }, "label": "Total remaining on this scheme" }
    ],
    "bindingConstraint": "REMAINING_SCHEME_VALUE"
  }
}
```

Fixed-date schemes keep `maxAdvanceInstallments`. They have **no** `positionVersion`, no `targetCycle` semantics, no average-derived cap and no final-remainder exception. Those belong to flexible-average schemes only.

### Flexible-average scheme, capped phase

```json
{
  "success": true,
  "data": {
    "schemeId": "sch_01AVG...",
    "schemeNumber": "MGR/AVG11/2026/00418",
    "paymentPattern": "FLEXIBLE",
    "plan": {
      "name": "Golden Average 11",
      "presetCode": "FLEXIBLE_AVERAGE_CAP",
      "ruleSummary": "Months 1–6 are flexible. Months 7–11 are capped at the flexible-phase monthly average."
    },
    "eligible": true,
    "currentPhase": "CAPPED",
    "targetCycle": "2026-09",
    "cycleNumber": 8,
    "cycleLabel": "September 2026",
    "positionVersion": 7,

    "limits": {
      "minimumNormalPaymentPaise": 100000,
      "minimumNormalPaymentDisplay": "₹1,000",
      "maximumPayableNowPaise": 60000,
      "maximumPayableNowDisplay": "₹600",
      "recommendedAmountPaise": 60000,
      "recommendedAmountDisplay": "₹600",
      "incrementPaise": 10000,
      "incrementDisplay": "₹100",
      "finalRemainderException": true
    },

    "capPosition": {
      "capMode": "FLEXIBLE_PHASE_AVERAGE",
      "flexiblePhaseTotalPaise": 1500000,
      "flexiblePhaseTotalDisplay": "₹15,000",
      "averagingDivisor": 6,
      "currentCycleCapPaise": 250000,
      "currentCycleCapDisplay": "₹2,500",
      "confirmedThisCyclePaise": 190000,
      "confirmedThisCycleDisplay": "₹1,900",
      "pendingReservedPaise": 0,
      "pendingReservedDisplay": "₹0",
      "remainingThisCyclePaise": 60000,
      "remainingThisCycleDisplay": "₹600",
      "unusedAllowanceCarryForward": false
    },

    "successfulPaymentsThisCycle": [
      { "paymentId": "pay_01A...", "receiptNumber": "SG/MGR/2026/001271", "paidAt": "2026-09-02T10:10:00+05:30", "mode": "UPI", "modeLabel": "UPI", "amountPaise": 70000, "amountDisplay": "₹700" },
      { "paymentId": "pay_01B...", "receiptNumber": "SG/MGR/2026/001278", "paidAt": "2026-09-08T16:30:00+05:30", "mode": "CASH", "modeLabel": "Cash", "amountPaise": 80000, "amountDisplay": "₹800" },
      { "paymentId": "pay_01C...", "receiptNumber": "SG/MGR/2026/001281", "paidAt": "2026-09-12T11:45:00+05:30", "mode": "CARD", "modeLabel": "Card / POS", "amountPaise": 40000, "amountDisplay": "₹400" }
    ],

    "pendingAttempts": [],

    "futureCycle": {
      "allowFutureCyclePayment": false,
      "maxAdvanceCycles": 0,
      "available": false,
      "blockedReason": {
        "code": "FUTURE_CYCLE_PAYMENT_NOT_ALLOWED",
        "message": "This scheme does not allow paying future months in advance."
      },
      "nextEligibleCycle": null
    },

    "blockingReasons": [],
    "warnings": [
      {
        "code": "FINAL_REMAINDER_BELOW_MINIMUM",
        "message": "₹600 is the final remaining allowance for this month and may be paid even though the normal minimum is ₹1,000."
      }
    ],
    "calculatedAt": "2026-09-14T13:40:00+05:30"
  }
}
```

### Rules

- `maximumPayableNowPaise` equals `remainingThisCyclePaise`. **The cycle cap is never multiplied** to produce one combined payable amount.
- When the cycle is fully consumed, `eligible` is `false`, `maximumPayableNowPaise` is `0`, and `blockingReasons` contains `CURRENT_CYCLE_CAP_REACHED`.
- A pending gateway attempt reduces the remaining amount through `pendingReservedPaise` and lands in `pendingAttempts`. Its blocking code is `PAYMENT_CONFIRMATION_PENDING`.
- `positionVersion` increments on every confirmed payment, reversal, intent creation, intent expiry and cap recomputation. It is the concurrency token for recording a payment.
- `warnings` are advisory and never block. `blockingReasons` always block.
- Fixed-date schemes never return `capPosition`, `positionVersion` or `futureCycle`.

### Future-cycle quote

When `allowFutureCyclePayment` is `true`, the current cycle is complete, and the requested cycle is the next unpaid one within `maxAdvanceCycles`:

```json
{
  "targetCycle": "2026-10",
  "cycleNumber": 9,
  "eligible": true,
  "isAdvanceCycle": true,
  "cyclesAheadOfCurrent": 1,
  "limits": {
    "maximumPayableNowPaise": 250000,
    "maximumPayableNowDisplay": "₹2,500",
    "recommendedAmountPaise": 250000
  },
  "capPosition": {
    "currentCycleCapPaise": 250000,
    "confirmedThisCyclePaise": 0,
    "remainingThisCyclePaise": 250000
  },
  "warnings": [
    { "code": "ADVANCE_CYCLE_PAYMENT", "message": "This payment will be applied to October 2026." }
  ]
}
```

Each advance cycle is quoted **separately, against its own cap**. There is no combined multi-cycle quote.

Failure cases, in the order the server checks them:

| Condition | Code |
|---|---|
| Plan disallows advance payment | `FUTURE_CYCLE_PAYMENT_NOT_ALLOWED` |
| Current cycle still has a remaining allowance | `CURRENT_CYCLE_INCOMPLETE` |
| A nearer cycle is unpaid | `CYCLE_SEQUENCE_VIOLATION` |
| Target beyond `maxAdvanceCycles` | `ADVANCE_CYCLE_LIMIT_EXCEEDED` |
| Target beyond the scheme's last cycle | `OVERPAYMENT_BLOCKED` |

`bindingConstraint` / `maxReason` tells the UI which limit to cite when the user types too much, so the error message is specific rather than generic.

---

## 6.1 Enrolment detail schedule (flexible-average)

Admin, staff and customer scheme-detail responses expose completed, current and upcoming cycles alongside the position:

```json
{
  "schedule": {
    "completed": [
      { "cycleNumber": 7, "cycleLabel": "August 2026", "capPaise": 250000, "paidPaise": 250000, "status": "PAID" }
    ],
    "current": {
      "cycleNumber": 8,
      "cycleLabel": "September 2026",
      "capPaise": 250000,
      "paidPaise": 190000,
      "remainingPaise": 60000,
      "paymentCount": 3,
      "status": "PARTIALLY_PAID"
    },
    "upcoming": [
      { "cycleNumber": 9, "cycleLabel": "October 2026", "capPaise": 250000, "status": "UPCOMING" }
    ]
  }
}
```

Cycle status ∈ `UPCOMING` | `PARTIALLY_PAID` | `PAID` | `EXPIRED`. `EXPIRED` means the cycle ended with unused allowance, which does not carry forward.

---

## 7. Passbook

**`GET /admin/schemes/:schemeId/passbook`**

Query: `limit`, `cursor`, `includeUnpaid=true` (default true).

### Fixed / lock-window scheme
```json
{
  "success": true,
  "data": {
    "scheme": { "id": "sch_01HQ8Z...", "schemeNumber": "MGR/DH11/2026/00318", "displayMode": "FIXED" },
    "rows": [
      {
        "installmentNumber": 1,
        "dueDate": "2026-09-14",
        "amountDue": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
        "status": "PAID",
        "payment": {
          "id": "pay_01HQ8...",
          "receiptNumber": "SG/MGR/2026/001284",
          "paidAt": "2026-09-14T10:30:00+05:30",
          "amountPaid": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
          "mode": "CASH",
          "rateApplied": null,
          "goldCredited": null,
          "collectedBy": { "id": "usr_01HQ8...", "name": "Rahul Nair" },
          "receiptUrl": "https://cdn.../receipt/pay_01HQ8.pdf",
          "passbookImageUrl": "https://cdn.../passbook/pay_01HQ8.png"
        }
      },
      {
        "installmentNumber": 5,
        "dueDate": "2026-10-10",
        "amountDue": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
        "status": "PENDING",
        "payment": null
      }
    ],
    "totals": {
      "paid": { "amountPaise": 2000000, "amountDisplay": "₹20,000" },
      "pending": { "amountPaise": 3500000, "amountDisplay": "₹35,000" },
      "installmentsPaid": 4,
      "installmentsTotal": 11
    }
  },
  "meta": { "nextCursor": null, "hasMore": false }
}
```

### Flexible free window — rows are payments, not installments
```json
{
  "success": true,
  "data": {
    "scheme": { "id": "sch_01HQ9Z...", "displayMode": "FLEXIBLE_FREE_WINDOW" },
    "rows": [
      {
        "entryNumber": 7,
        "phase": "FREE_WINDOW",
        "paidAt": "2026-08-22T15:40:00+05:30",
        "amountPaid": { "amountPaise": 200000, "amountDisplay": "₹2,000" },
        "mode": "UPI",
        "modeLabel": "UPI",
        "receiptNumber": "SG/MGR/2026/001301",
        "goldCredited": { "weightMg": 276, "weightDisplay": "0.276 g" },
        "rateApplied": { "ratePerGramPaise": 724000, "ratePerGramDisplay": "₹7,240" },
        "receiptUrl": "https://cdn.../receipt/pay_01HQ9.pdf",
        "passbookImageUrl": "https://cdn.../passbook/pay_01HQ9.png"
      }
    ],
    "totals": { "paid": { "amountPaise": 2400000, "amountDisplay": "₹24,000" }, "paymentCount": 7 }
  }
}
```

After lock, the passbook returns **both sections** — `freeWindowRows` and `lockWindowRows` — so the customer sees their full history in one view.

---

## 8. Ledger (audit view)

**`GET /admin/schemes/:schemeId/ledger`** — the immutable truth. Every derived number on every screen traces back to these rows.

```json
{
  "success": true,
  "data": [
    {
      "id": "led_01HQ8...",
      "sequence": 1,
      "entryType": "INSTALLMENT_PAYMENT",
      "postedAt": "2026-09-14T10:30:00+05:30",
      "valueDate": "2026-09-14",
      "installmentNumber": 1,
      "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "weight": null,
      "rateApplied": null,
      "direction": "CREDIT",
      "paymentId": "pay_01HQ8...",
      "receiptNumber": "SG/MGR/2026/001284",
      "reversedBy": null,
      "isReversal": false,
      "runningTotals": {
        "totalPaid": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
        "goldAccrued": null
      },
      "postedBy": { "id": "usr_01HQ8...", "name": "Rahul Nair" }
    },
    {
      "id": "led_01HQ9...",
      "sequence": 5,
      "entryType": "REVERSAL",
      "postedAt": "2026-09-21T12:00:00+05:30",
      "installmentNumber": 4,
      "amount": { "amountPaise": -500000, "amountDisplay": "-₹5,000" },
      "direction": "DEBIT",
      "reversalOf": "led_01HQ8B...",
      "isReversal": true,
      "reason": "Cheque bounced",
      "postedBy": { "id": "usr_01HQ8...", "name": "Priya S" }
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false }
}
```

`runningTotals` is computed on read, not stored. Corrections are always a new `REVERSAL` row — no row is ever mutated or deleted.

---

## 9. Maturity projection

**`GET /admin/schemes/:schemeId/maturity-projection`**
```json
{
  "success": true,
  "data": {
    "maturityDate": "2027-07-10",
    "daysToMaturity": 299,
    "assumptions": { "goldRateBasis": "CURRENT_RATE", "ratePerGram": { "ratePerGramPaise": 725000, "ratePerGramDisplay": "₹7,250" } },
    "projected": {
      "totalPaid": { "amountPaise": 5500000, "amountDisplay": "₹55,000" },
      "benefit": { "type": "ONE_FREE_INSTALLMENT", "value": { "amountPaise": 500000, "amountDisplay": "₹5,000" }, "isComputed": true },
      "textBenefit": null,
      "finalValue": { "amountPaise": 6000000, "amountDisplay": "₹60,000" },
      "goldWeight": null
    },
    "eligibility": { "onTrack": true, "installmentsRemaining": 7, "defaultsSoFar": 0, "maxAllowedDefaults": 0, "riskOfBenefitLoss": false },
    "chart": {
      "chartType": "area",
      "title": "Projected accumulation",
      "series": [
        { "key": "paid", "name": "Paid so far", "data": [ { "x": "2026-09", "y": 500000 }, { "x": "2026-10", "y": 1000000 } ] },
        { "key": "projected", "name": "Projected", "data": [ { "x": "2027-06", "y": 5000000 }, { "x": "2027-07", "y": 6000000 } ] }
      ]
    }
  }
}
```

---

## 10. Scheme list

**`GET /admin/schemes`**

| Query | Values |
|---|---|
| `q` | Scheme number, customer name, mobile, passbook number |
| `status` | Repeatable |
| `planId`, `branchId`, `valueBasis`, `paymentPattern` | |
| `maturingFrom` / `maturingTo` | `YYYY-MM-DD` |
| `enrolledFrom` / `enrolledTo` | |
| `hasOverdue` | `true` \| `false` |
| `lockDueFrom` / `lockDueTo` | Flexible schemes hitting the lock cut-off |
| `sort` | `createdAt:desc`, `maturityDate:asc`, `nextDueDate:asc` |

Row shape matches the scheme summary in `04 §5`, plus `customer` inline.

---

## 11. Status transitions

```
ACTIVE ──────────────┬─→ MATURED ──→ REDEEMED
   │                 │
   │                 └─→ DEFAULTED ──→ ACTIVE   (on payment)
   │                              └──→ CLOSED_PREMATURE
   │
   ├─→ LOCKED (flexible only, at lock event) ──→ MATURED ──→ REDEEMED
   │                                         └──→ CLOSED_PREMATURE
   │
   └─→ CLOSED_PREMATURE   (premature closure / cancellation — same operation)
```

| Transition | Trigger |
|---|---|
| `ACTIVE → LOCKED` | Flexible lock job at the end of the free window |
| `ACTIVE/LOCKED → DEFAULTED` | Overdue job, after N consecutive missed installments (`scheduleRules.defaultAfterMissedInstallments`, default 3) |
| `DEFAULTED → ACTIVE` | Any successful payment clearing the oldest overdue |
| `→ MATURED` | Maturity job when all installments are `PAID` **or** `maturityDate` reached |
| `MATURED → REDEEMED` | Redemption completed |
| `ANY → CLOSED_PREMATURE` | Premature closure / cancellation |

Terminal states (`REDEEMED`, `CLOSED_PREMATURE`) reject every write with `SCHEME_NOT_ACTIVE`.

---

## 12. Customer app enrolment

**`POST /app/schemes/enrol`** — same contract minus `customerId` (from token) and all manual payment modes. Self-enrol always uses `firstInstallmentMode` from the plan default. If the customer chooses to pay now, fixed-date schemes return a payment link and flexible-average schemes return a payment intent; the app never posts a manual payment.

```json
{
  "planId": "spl_01HQ7...",
  "installmentAmountPaise": 500000,
  "payNow": true
}
```
```json
{
  "success": true,
  "data": {
    "scheme": { "id": "sch_01HQ8Z...", "schemeNumber": "MGR/DH11/2026/00319", "status": "ACTIVE", "firstDueDate": "2026-10-10" },
    "paymentLink": {
      "id": "plnk_01HQ8...",
      "url": "https://mercury.phonepe.com/transact/pg?token=...",
      "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "installmentNumber": 1,
      "expiresAt": "2026-09-14T11:00:00+05:30"
    },
    "auditEventId": "aud_01ENR..."
  }
}
```

The example above is fixed-date. For a flexible-average self-enrolment with `payNow: true`, the response uses `paymentIntent` (including `paymentIntentId`, `targetCycle`, `position.positionVersion` and the canonical `statusPollUrl`) instead of `paymentLink`. The server creates that first reservation immediately after creating the new scheme, so no client-supplied `expectedPositionVersion` exists for this one compound enrolment request. Every later flexible-average payment uses `POST /app/schemes/:schemeId/payment-intents` with the quoted version.

Blocked when `customerSelfEnrolAllowed` is false on the plan or `customerSelfEnrolEnabled` is off for the tenant → `403 FEATURE_NOT_IN_PLAN`.

## Collection schedule enrollment

Supply `collectionFrequency` when the selected plan has `collectionRules`. Enrollment stores the frequency and snapshots the rules. The preview returns the first collection amount, total payable, first due date, maturity date and whether maturity is provisional. The original amount input field is `installmentAmountPaise`. For `TOTAL_TARGET`, that field carries the total target and the backend calculates actual collections.

When maturity is anchored to verified payment, the server preserves the agreed installment dates and amounts and sets the maturity anniversary from the confirmation date. Gateway reservations retain the 22K rate validated at reservation. Enrollment validates that scheduled amounts can credit positive gold at the applicable current rate. Maturity waits for open grace on unpaid collections to end. Collection awards are written to the scheme ledger at maturity. The redemption flow consumes the posted weight. Refunds before settlement can generate a signed bonus adjustment.
