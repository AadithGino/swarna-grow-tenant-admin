# 08 — Dues, Overdues, Maturity, Lock-due

Persisted single-entity mutations in this file return `data.auditEventId`. Async bulk operations expose per-entity audit ids only on the completed job result, never merely when the job is queued.

All of these are read-only projections over the ledger + installment schedule. Every one supports the same filter set, cursor pagination, an optional summary block, and a CSV export handoff.

---

## 1. Shared query contract

| Param | Applies to | Values |
|---|---|---|
| `branchId` | all | Ignored for branch-scoped users |
| `planId` | all | |
| `staffId` | due/overdue | Enrolling or last-collecting staff |
| `valueBasis` | all | `CASH` \| `GOLD_WEIGHT` |
| `paymentPattern` | all | `FIXED` \| `FLEXIBLE` |
| `q` | all | Customer name, mobile, passbook number, scheme number |
| `from` / `to` | all | Date window relevant to the list |
| `preset` | due/overdue/maturity | See below |
| `sort` | all | Endpoint-specific whitelist |
| `includeSummary` | all | `true` returns `meta.summary` over the whole filtered set |
| `limit`, `cursor` | all | |

**Presets** — server-resolved date windows so the UI's quick-filter chips never compute dates:

| Preset | Resolves to |
|---|---|
| `TODAY` | today..today |
| `TOMORROW` | tomorrow..tomorrow |
| `THIS_WEEK` | Mon..Sun of current week |
| `NEXT_7_DAYS` | today..today+6 |
| `THIS_MONTH` | 1st..last of current month |
| `NEXT_MONTH` | 1st..last of next month |
| `CUSTOM` | requires `from`/`to` |

---

## 2. Due list

| Method | Path | Phase |
|---|---|---|
| `GET` | `/admin/dues` | P1 |
| `GET` | `/staff/dues` | P1 |
| `GET` | `/admin/dues/count` | P1 |

**`GET /admin/dues?preset=TODAY&includeSummary=true`**

```json
{
  "success": true,
  "data": [
    {
      "schemeId": "sch_01HQ8Z...",
      "schemeNumber": "MGR/DH11/2026/00318",
      "installmentNumber": 5,
      "dueDate": "2026-09-14",
      "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "status": "DUE",
      "daysUntilDue": 0,
      "graceEndsOn": "2026-09-19",
      "customer": {
        "id": "cus_01HQ8Z...",
        "name": "Anjali Menon",
        "mobile": "9847XXXX33",
        "passbookNumber": "MGR/2026/00412",
        "whatsappOptIn": true
      },
      "plan": { "id": "spl_01HQ7...", "name": "Dhanam 11", "valueBasis": "CASH", "paymentPattern": "FIXED" },
      "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
      "payableRange": {
        "suggested": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
        "min": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
        "max": { "amountPaise": 1500000, "amountDisplay": "₹15,000" }
      },
      "lastReminder": { "sentAt": "2026-09-13T09:00:00+05:30", "messageType": "PAYMENT_DUE", "status": "DELIVERED" },
      "openPaymentLink": { "id": "plnk_01HQ8Z...", "status": "SENT", "expiresAt": "2026-09-15T09:00:00+05:30" },
      "actions": { "canRecordPayment": true, "canSendLink": true, "canSendReminder": true }
    }
  ],
  "meta": {
    "nextCursor": "eyJpZCI6...",
    "hasMore": true,
    "summary": {
      "count": 47,
      "totalAmount": { "amountPaise": 23500000, "amountDisplay": "₹2,35,000" },
      "byBranch": [
        { "branch": { "id": "brn_01HQ7A...", "name": "MG Road" }, "count": 28, "amount": { "amountPaise": 14000000, "amountDisplay": "₹1,40,000" } },
        { "branch": { "id": "brn_01HQ7B...", "name": "Panampilly Nagar" }, "count": 19, "amount": { "amountPaise": 9500000, "amountDisplay": "₹95,000" } }
      ],
      "remindersSent": 41,
      "remindersPending": 6
    }
  }
}
```

For flexible free-window schemes the row has no installment number:
```json
{
  "schemeId": "sch_01HQ9Z...",
  "installmentNumber": null,
  "phase": "FREE_WINDOW",
  "dueDate": null,
  "amount": null,
  "status": "FREE_WINDOW_NO_PAYMENT_THIS_MONTH",
  "label": "No payment yet this month (optional)",
  "payableRange": { "suggested": null, "min": { "amountPaise": 50000, "amountDisplay": "₹500" }, "max": { "amountPaise": 10000000, "amountDisplay": "₹1,00,000" } }
}
```

These appear only when `?includeFlexibleNudges=true`. They are not dues — a free-window customer owes nothing — but jewellers want to nudge them, so the endpoint can surface them as a distinct, clearly-labelled group.

---

## 3. Overdue list

| Method | Path | Phase |
|---|---|---|
| `GET` | `/admin/overdues` | P1 |
| `GET` | `/staff/overdues` | P1 |

Extra query: `ageingBucket` ∈ `1_7` | `8_15` | `16_30` | `30_PLUS`, and `minOverdueCount`.

```json
{
  "success": true,
  "data": [
    {
      "schemeId": "sch_01HQ7Z...",
      "schemeNumber": "MGR/DH11/2026/00201",
      "customer": { "id": "cus_01HQ7Z...", "name": "Suresh Kumar", "mobile": "9847XXXX88", "passbookNumber": "MGR/2026/00288", "whatsappOptIn": true },
      "plan": { "id": "spl_01HQ7...", "name": "Dhanam 11" },
      "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
      "overdue": {
        "installmentCount": 2,
        "totalAmount": { "amountPaise": 1000000, "amountDisplay": "₹10,000" },
        "oldestDueDate": "2026-07-10",
        "ageingDays": 66,
        "ageingBucket": "30_PLUS",
        "consecutiveMissed": 2,
        "installments": [
          { "installmentNumber": 3, "dueDate": "2026-07-10", "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" }, "daysOverdue": 66 },
          { "installmentNumber": 4, "dueDate": "2026-08-10", "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" }, "daysOverdue": 35 }
        ]
      },
      "schemeStatus": "ACTIVE",
      "atRiskOfDefault": true,
      "defaultAfterMissed": 3,
      "benefitAtRisk": { "type": "ONE_FREE_INSTALLMENT", "willForfeit": true, "message": "Benefit will be forfeited if any installment is missed." },
      "reminders": { "sentForOldest": 4, "lastSentAt": "2026-09-10T09:00:00+05:30", "lastStatus": "DELIVERED", "maxReached": false },
      "lastPaymentAt": "2026-06-10T14:20:00+05:30",
      "actions": { "canRecordPayment": true, "canSendLink": true, "canSendReminder": true, "canClosePremature": true }
    }
  ],
  "meta": {
    "nextCursor": null,
    "hasMore": false,
    "summary": {
      "count": 64,
      "totalOverdueAmount": { "amountPaise": 41200000, "amountDisplay": "₹4,12,000" },
      "ageing": [
        { "bucket": "1_7", "label": "1–7 days", "count": 18, "amount": { "amountPaise": 9000000, "amountDisplay": "₹90,000" } },
        { "bucket": "8_15", "label": "8–15 days", "count": 21, "amount": { "amountPaise": 12600000, "amountDisplay": "₹1,26,000" } },
        { "bucket": "16_30", "label": "16–30 days", "count": 14, "amount": { "amountPaise": 9800000, "amountDisplay": "₹98,000" } },
        { "bucket": "30_PLUS", "label": "30+ days", "count": 11, "amount": { "amountPaise": 9800000, "amountDisplay": "₹98,000" } }
      ],
      "chart": {
        "chartType": "bar",
        "title": "Overdue by ageing",
        "yAxis": { "type": "currency", "label": "Amount" },
        "series": [ { "key": "OVERDUE", "name": "Overdue", "data": [ { "x": "1–7 days", "y": 9000000, "yDisplay": "₹90,000" }, { "x": "8–15 days", "y": 12600000, "yDisplay": "₹1,26,000" }, { "x": "16–30 days", "y": 9800000, "yDisplay": "₹98,000" }, { "x": "30+ days", "y": 9800000, "yDisplay": "₹98,000" } ] } ]
      }
    }
  }
}
```

---

## 4. Defaulters

**`GET /admin/defaulters`** — schemes in `DEFAULTED` status, or above a consecutive-missed threshold.

Query: `minConsecutiveMissed` (default 3), `branchId`, `planId`, `sort=consecutiveMissed:desc`.

```json
{
  "success": true,
  "data": [
    {
      "schemeId": "sch_01HQ6Z...",
      "schemeNumber": "MGR/DH11/2025/00112",
      "customer": { "id": "cus_01HQ6Z...", "name": "Ramesh P", "mobile": "9847XXXX10", "passbookNumber": "MGR/2025/00092" },
      "status": "DEFAULTED",
      "consecutiveMissed": 4,
      "overdueAmount": { "amountPaise": 2000000, "amountDisplay": "₹20,000" },
      "totalPaid": { "amountPaise": 1500000, "amountDisplay": "₹15,000" },
      "lastPaymentAt": "2026-05-10T10:00:00+05:30",
      "daysSinceLastPayment": 127,
      "defaultedAt": "2026-08-11T00:05:00+05:30",
      "recoveryValue": { "amountPaise": 1470000, "amountDisplay": "₹14,700", "note": "After 2% premature closure penalty" },
      "actions": { "canRecordPayment": true, "canClosePremature": true, "canSendReminder": true }
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false }
}
```

---

## 5. Maturity calendar & list

| Method | Path | Phase |
|---|---|---|
| `GET` | `/admin/maturities` | P1 |
| `GET` | `/admin/maturities/calendar` | P1 |

**`GET /admin/maturities?preset=THIS_MONTH`**

Query adds `maturityState` ∈ `UPCOMING` | `MATURED_PENDING_REDEMPTION` | `REDEEMED` | `ALL`.

```json
{
  "success": true,
  "data": [
    {
      "schemeId": "sch_01HQ5Z...",
      "schemeNumber": "MGR/DH11/2025/00088",
      "customer": { "id": "cus_01HQ5Z...", "name": "Lakshmi Nair", "mobile": "9847XXXX02", "passbookNumber": "MGR/2025/00071" },
      "plan": { "id": "spl_01HQ7...", "name": "Dhanam 11", "valueBasis": "CASH" },
      "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
      "maturityDate": "2026-09-20",
      "daysToMaturity": 6,
      "maturityState": "UPCOMING",
      "schemeStatus": "ACTIVE",
      "progress": { "installmentsPaid": 10, "installmentsTotal": 11, "percentComplete": 90.9 },
      "settlement": {
        "totalPaid": { "amountPaise": 5000000, "amountDisplay": "₹50,000" },
        "projectedTotalPaid": { "amountPaise": 5500000, "amountDisplay": "₹55,000" },
        "benefit": { "type": "ONE_FREE_INSTALLMENT", "displayLabel": "12th installment free", "isComputed": true, "value": { "amountPaise": 500000, "amountDisplay": "₹5,000" } },
        "textBenefit": null,
        "projectedFinalValue": { "amountPaise": 6000000, "amountDisplay": "₹60,000" },
        "goldWeight": null
      },
      "benefitEligible": true,
      "blockers": [ { "code": "INSTALLMENT_PENDING", "message": "1 installment still pending", "installmentNumbers": [11] } ],
      "actions": { "canRedeem": false, "canRecordPayment": true }
    }
  ],
  "meta": {
    "nextCursor": null,
    "hasMore": false,
    "summary": {
      "count": 23,
      "upcoming": 18,
      "maturedPendingRedemption": 5,
      "totalMaturityValue": { "amountPaise": 138000000, "amountDisplay": "₹13,80,000" },
      "totalBenefitLiability": { "amountPaise": 11500000, "amountDisplay": "₹1,15,000" },
      "totalGoldToDeliver": { "weightMg": 0, "weightDisplay": "0.000 g" }
    }
  }
}
```

**`GET /admin/maturities/calendar?month=2026-09`** — the month grid.

```json
{
  "success": true,
  "data": {
    "month": "2026-09",
    "days": [
      { "date": "2026-09-10", "count": 3, "totalValue": { "amountPaise": 18000000, "amountDisplay": "₹1,80,000" }, "states": { "upcoming": 0, "maturedPendingRedemption": 3, "redeemed": 0 } },
      { "date": "2026-09-20", "count": 7, "totalValue": { "amountPaise": 42000000, "amountDisplay": "₹4,20,000" }, "states": { "upcoming": 7, "maturedPendingRedemption": 0, "redeemed": 0 } }
    ],
    "monthSummary": { "count": 23, "totalValue": { "amountPaise": 138000000, "amountDisplay": "₹13,80,000" }, "peakDate": "2026-09-20", "peakCount": 7 },
    "chart": {
      "chartType": "bar",
      "title": "Maturities by day",
      "yAxis": { "type": "count", "label": "Schemes" },
      "series": [ { "key": "maturities", "name": "Maturing", "data": [ { "x": "2026-09-10", "y": 3 }, { "x": "2026-09-20", "y": 7 } ] } ]
    }
  }
}
```

Tapping a day calls `GET /admin/maturities?from=<date>&to=<date>`.

---

## 6. Flexible lock-due list

Schemes whose free window closes in the selected period. Jewellers want to see these coming because the customer's monthly amount is about to be fixed.

**`GET /admin/flexible-locks?preset=THIS_MONTH`**

```json
{
  "success": true,
  "data": [
    {
      "schemeId": "sch_01HQ9Z...",
      "schemeNumber": "MGR/FL11/2026/00042",
      "customer": { "id": "cus_01HQ9Z...", "name": "Devika R", "mobile": "9847XXXX77", "passbookNumber": "MGR/2026/00501" },
      "plan": { "id": "spl_01HQ8...", "name": "Flexi Gold 11", "paymentPattern": "FLEXIBLE" },
      "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
      "lockDate": "2026-09-30",
      "daysToLock": 16,
      "lockState": "PENDING",
      "freeWindow": {
        "months": 6,
        "monthsElapsed": 5,
        "totalPaid": { "amountPaise": 2400000, "amountDisplay": "₹24,000" },
        "paymentCount": 9,
        "minTotalRequired": { "amountPaise": 300000, "amountDisplay": "₹3,000" },
        "minTotalMet": true
      },
      "projectedLockedInstallment": { "amountPaise": 400000, "amountDisplay": "₹4,000" },
      "projectionNote": "Based on ₹24,000 paid so far ÷ 6 months, rounded up to the nearest ₹100",
      "warnings": []
    },
    {
      "schemeId": "sch_01HQ9Y...",
      "lockDate": "2026-09-30",
      "lockState": "PENDING",
      "freeWindow": { "totalPaid": { "amountPaise": 0, "amountDisplay": "₹0" }, "paymentCount": 0, "minTotalMet": false },
      "projectedLockedInstallment": null,
      "warnings": [
        { "code": "ZERO_FREE_WINDOW_TOTAL", "severity": "HIGH", "message": "No payments made. This scheme will be closed automatically on the lock date.", "configuredAction": "CLOSE_SCHEME" }
      ]
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false, "summary": { "count": 14, "pendingLock": 12, "atRiskOfAutoClose": 2, "projectedMonthlyTotal": { "amountPaise": 5600000, "amountDisplay": "₹56,000" } } }
}
```

`lockState` ∈ `PENDING` | `APPLIED` | `FAILED`.

`POST /admin/flexible-locks/:schemeId/apply` (P1.5) lets an admin apply the lock early — used when a customer asks to fix their amount before the window closes.

---

## 7. Collection summary

**`GET /admin/collections/summary?preset=TODAY&groupBy=BRANCH`**

`groupBy` ∈ `BRANCH` | `STAFF` | `MODE` | `PLAN` | `DAY`.

```json
{
  "success": true,
  "data": {
    "period": { "from": "2026-09-14", "to": "2026-09-14", "label": "Today" },
    "totals": {
      "count": 84,
      "amount": { "amountPaise": 42800000, "amountDisplay": "₹4,28,000" },
      "goldCredited": { "weightMg": 59034, "weightDisplay": "59.034 g" },
      "newEnrolments": 6,
      "comparedToPrevious": { "amountChangePercent": 8.2, "direction": "up" }
    },
    "groups": [
      {
        "key": "brn_01HQ7A...",
        "label": "MG Road",
        "count": 52,
        "amount": { "amountPaise": 26400000, "amountDisplay": "₹2,64,000" },
        "byMode": [
          { "mode": "CASH", "label": "Cash", "count": 34, "amount": { "amountPaise": 17200000, "amountDisplay": "₹1,72,000" } },
          { "mode": "CARD", "label": "Card / POS", "count": 4, "amount": { "amountPaise": 2000000, "amountDisplay": "₹20,000" } },
          { "mode": "UPI", "label": "UPI", "count": 12, "amount": { "amountPaise": 6100000, "amountDisplay": "₹61,000" } },
          { "mode": "BANK_TRANSFER", "label": "Bank transfer", "count": 0, "amount": { "amountPaise": 0, "amountDisplay": "₹0" } },
          { "mode": "CHEQUE", "label": "Cheque", "count": 0, "amount": { "amountPaise": 0, "amountDisplay": "₹0" } },
          { "mode": "ONLINE_GATEWAY", "label": "Online payment", "count": 2, "amount": { "amountPaise": 1100000, "amountDisplay": "₹11,000" } }
        ]
      }
    ],
    "chart": {
      "chartType": "stackedBar",
      "title": "Collection by branch and mode",
      "yAxis": { "type": "currency", "label": "Amount" },
      "series": [
        { "key": "CASH", "name": "Cash", "data": [ { "x": "MG Road", "y": 17200000, "yDisplay": "₹1,72,000" }, { "x": "Panampilly Nagar", "y": 9800000, "yDisplay": "₹98,000" } ] },
        { "key": "CARD", "name": "Card / POS", "data": [ { "x": "MG Road", "y": 2000000, "yDisplay": "₹20,000" }, { "x": "Panampilly Nagar", "y": 1400000, "yDisplay": "₹14,000" } ] },
        { "key": "UPI", "name": "UPI", "data": [ { "x": "MG Road", "y": 6100000, "yDisplay": "₹61,000" }, { "x": "Panampilly Nagar", "y": 4200000, "yDisplay": "₹42,000" } ] },
        { "key": "BANK_TRANSFER", "name": "Bank transfer", "data": [ { "x": "MG Road", "y": 0, "yDisplay": "₹0" }, { "x": "Panampilly Nagar", "y": 0, "yDisplay": "₹0" } ] },
        { "key": "CHEQUE", "name": "Cheque", "data": [ { "x": "MG Road", "y": 0, "yDisplay": "₹0" }, { "x": "Panampilly Nagar", "y": 0, "yDisplay": "₹0" } ] },
        { "key": "ONLINE_GATEWAY", "name": "Online payment", "data": [ { "x": "MG Road", "y": 1100000, "yDisplay": "₹11,000" }, { "x": "Panampilly Nagar", "y": 1000000, "yDisplay": "₹10,000" } ] }
      ]
    }
  }
}
```

---

## 8. Bulk actions from lists

| Method | Path | Phase | Notes |
|---|---|---|---|
| `POST` | `/admin/dues/bulk-send-links` | P1 | Generate + WhatsApp a link for each selected due |
| `POST` | `/admin/overdues/bulk-send-reminders` | P1 | Fire the overdue template for selected rows |

```json
{
  "schemeIds": ["sch_01HQ8Z...", "sch_01HQ7Z..."],
  "expiresInMinutes": 2880,
  "channels": ["WHATSAPP", "PUSH"]
}
```

Returns `202` with a job handle since these fan out through the outbox:
```json
{
  "success": true,
  "data": {
    "jobId": "job_01HQ8Z...",
    "queued": 2,
    "skipped": [
      { "schemeId": "sch_01HQ6Z...", "reason": "WHATSAPP_OPTED_OUT" }
    ],
    "statusUrl": "/api/v1/admin/jobs/job_01HQ8Z..."
  }
}
```

Queueing does not create audit events. When the job completes, each successfully processed scheme result carries its own `auditEventId`; skipped and failed targets do not claim a mutation event.

Bulk sends are capped by the remaining WhatsApp quota and pre-flight-checked — if the selection would exceed quota, the call fails with `LIMIT_WHATSAPP_QUOTA` and `details.available` before anything is sent.

---

## 9. Export

Every list in this file supports:

```
POST /admin/exports
{
  "reportKey": "OVERDUE_LIST",
  "filters": { "branchId": "brn_01HQ7A...", "ageingBucket": "30_PLUS" },
  "format": "CSV"
}
```
```json
{
  "success": true,
  "data": { "exportId": "exp_01HQ8Z...", "status": "QUEUED", "statusUrl": "/api/v1/admin/exports/exp_01HQ8Z..." }
}
```

`GET /admin/exports/:exportId`
```json
{
  "success": true,
  "data": {
    "id": "exp_01HQ8Z...",
    "status": "READY",
    "rowCount": 64,
    "url": "https://cdn.../exports/exp_01HQ8Z.csv",
    "expiresAt": "2026-09-15T10:30:00+05:30",
    "generatedAt": "2026-09-14T10:31:02+05:30"
  }
}
```

`reportKey` values for this file: `DUE_LIST`, `OVERDUE_LIST`, `DEFAULTER_LIST`, `MATURITY_LIST`, `FLEXIBLE_LOCK_LIST`, `COLLECTION_SUMMARY`.

## Collection plan filters

Enrollment, dues and maturity list responses accept `planId`, `collectionFrequency` and `bonusStatus` filters. The maturity calendar accepts the same filters. For a collection enrollment, `PENDING` means it has no recorded award outcome. The recorded award contains a status and weight in milligrams. A rupee-based award missing a usable gold rate remains `PENDING_RATE` until retried. Plan stats expose `benefitLiabilityGold` for collection plans and show the rupee valuation when a usable rate is available.
