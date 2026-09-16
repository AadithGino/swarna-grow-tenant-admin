# 12 — Customer Mobile App

Namespace `/api/v1/app/*`. Token type `CUSTOMER`. One white-label build for every tenant; branding resolves at runtime.

Auth flow is in `02 §4`. Payments are in `07 §11`. This file covers the app-specific surface.

---

## 1. Endpoint map

| Method | Path | Phase |
|---|---|---|
| `GET` | `/public/tenants/resolve` | P1 |
| `GET` | `/public/app-config` | P1 |
| `GET` | `/app/home` | P1 |
| `GET` | `/app/schemes` | P1 |
| `GET` | `/app/schemes/:schemeId` | P1 |
| `GET` | `/app/schemes/:schemeId/passbook` | P1 |
| `GET` | `/app/schemes/:schemeId/payable-range` | P1 |
| `GET` | `/app/schemes/:schemeId/settlement-preview` | P1 |
| `POST` | `/app/schemes/:schemeId/pay` | P1 |
| `POST` | `/app/schemes/:schemeId/redemption-request` | P1 |
| `GET` | `/app/scheme-plans` | P1 |
| `GET` | `/app/scheme-plans/:planId` | P1 |
| `POST` | `/app/schemes/enrol` | P1 |
| `GET` | `/app/payments` | P1 |
| `GET` | `/app/payments/:paymentId/receipt` | P1 |
| `GET` | `/app/gold-rate/current` | P1 |
| `GET` | `/app/gold-rate/history` | P1.5 |
| `GET` | `/app/profile` | P1 |
| `PATCH` | `/app/profile` | P1 |
| `PUT` | `/app/profile/kyc` | P1 |
| `GET` | `/app/branches` | P1 |
| `GET` | `/app/notifications` | P1 |
| `POST` | `/app/notifications/:id/read` | P1 |
| `POST` | `/app/notifications/read-all` | P1 |
| `POST` | `/app/devices/fcm-token` | P1 |
| `DELETE` | `/app/devices/fcm-token` | P1 |
| `POST` | `/app/grievances` | P1 |
| `GET` | `/app/grievances` | P1 |
| `GET` | `/app/grievances/:grievanceId` | P1 |
| `POST` | `/app/grievances/:grievanceId/messages` | P1 |
| `POST` | `/app/grievances/:grievanceId/reopen` | P1 |
| `POST` | `/app/schemes/:schemeId/payment-intents` | P1 |
| `GET` | `/app/payment-intents/:intentId` | P1 |
| `POST` | `/app/payment-intents/:intentId/cancel` | P1 |
| `GET` | `/app/payments/:linkId/status` | P1 |

Grievance contract is in `16-grievances.md`; payment intents are in `07 §2.2`. `/app/schemes/:schemeId/pay` is fixed-date only. A flexible-average payment must use `/app/schemes/:schemeId/payment-intents`. The customer app has **no nominee screen** in V1.

---

## 2. Home

**`GET /app/home`** — one call renders the entire home screen.

```json
{
  "success": true,
  "data": {
    "customer": { "id": "cus_01HQ8Z...", "name": "Anjali Menon", "passbookNumber": "MGR/2026/00412" },
    "tenant": {
      "displayName": "Sree Gold",
      "appDisplayName": "Sree Gold Savings",
      "logoUrl": "https://cdn.../logo.png",
      "branding": { "primaryColor": "#7B1E1E", "secondaryColor": "#C9A227" },
      "supportNumber": "9846543211"
    },

    "greeting": { "text": "Good morning, Anjali", "subtext": "You're 5 installments into your savings." },

    "summary": {
      "activeSchemeCount": 2,
      "totalPaid": { "amountPaise": 4500000, "amountDisplay": "₹45,000" },
      "goldAccrued": { "weightMg": 3450, "weightDisplay": "3.450 g" },
      "currentValue": { "amountPaise": 2501250, "amountDisplay": "₹25,013" },
      "pastSchemeCount": 2
    },

    "goldRate": {
      "purity": "22K",
      "ratePerGram": { "ratePerGramPaise": 725000, "ratePerGramDisplay": "₹7,250" },
      "asOf": "2026-09-14T09:00:00+05:30",
      "change": { "amountPaise": 6000, "amountDisplay": "₹60", "percent": 0.83, "direction": "up" }
    },

    "actionCard": {
      "type": "PAYMENT_DUE",
      "severity": "MEDIUM",
      "title": "₹5,000 due in 6 days",
      "subtitle": "Dhanam Gold Savings · Installment 5",
      "schemeId": "sch_01HQ8Z...",
      "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "dueDate": "2026-09-20",
      "ctaLabel": "Pay now",
      "ctaAction": "PAY"
    },

    "activeSchemes": [
      {
        "id": "sch_01HQ8Z...",
        "schemeNumber": "MGR/DH11/2026/00318",
        "planDisplayName": "Dhanam Gold Savings",
        "valueBasis": "CASH",
        "displayMode": "FIXED",
        "status": "ACTIVE",
        "progress": { "type": "INSTALLMENT_COUNT", "installmentsPaid": 4, "installmentsTotal": 11, "percentComplete": 36.4, "label": "4 of 11 paid" },
        "totalPaid": { "amountPaise": 2000000, "amountDisplay": "₹20,000" },
        "goldAccrued": null,
        "nextDue": { "date": "2026-09-20", "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" }, "daysAway": 6, "isOverdue": false },
        "maturityDate": "2027-07-10",
        "canPay": true
      },
      {
        "id": "sch_01HQ9Z...",
        "schemeNumber": "MGR/FL11/2026/00042",
        "planDisplayName": "Flexi Gold",
        "valueBasis": "GOLD_WEIGHT",
        "displayMode": "FLEXIBLE_FREE_WINDOW",
        "status": "ACTIVE",
        "progress": { "type": "FREE_WINDOW_MONTHS", "monthsElapsed": 4, "monthsTotal": 6, "percentComplete": 66.7, "label": "Month 4 of 6 — pay any amount" },
        "totalPaid": { "amountPaise": 2400000, "amountDisplay": "₹24,000" },
        "goldAccrued": { "weightMg": 3312, "weightDisplay": "3.312 g" },
        "nextDue": null,
        "freeWindowBanner": { "text": "Pay any amount until 31 Oct. Your monthly amount will be fixed after that.", "daysToLock": 47 },
        "maturityDate": "2027-03-31",
        "canPay": true
      }
    ],

    "quickActions": [
      { "key": "PAY", "label": "Pay installment", "enabled": true },
      { "key": "PASSBOOK", "label": "View passbook", "enabled": true },
      { "key": "JOIN_SCHEME", "label": "Join a new scheme", "enabled": true },
      { "key": "CALL_SHOWROOM", "label": "Call showroom", "enabled": true, "value": "9846543211" },
      { "key": "RAISE_REQUEST", "label": "Raise a request", "enabled": true }
    ],

    "unreadNotifications": 2,

    "trends": {
      "period": { "from": "2026-04-01", "to": "2026-09-30", "label": "Last 6 months" },
      "contributions": {
        "chartType": "bar",
        "title": "Your contributions",
        "subtitle": "Successful payments across all schemes",
        "xAxis": { "type": "category", "label": "Month", "format": "MMM" },
        "yAxis": { "type": "currency", "label": "Amount", "unit": "INR" },
        "series": [ { "key": "paid", "name": "Paid", "data": [
          { "x": "2026-04", "y": 500000, "yDisplay": "₹5,000" },
          { "x": "2026-05", "y": 750000, "yDisplay": "₹7,500" },
          { "x": "2026-06", "y": 500000, "yDisplay": "₹5,000" },
          { "x": "2026-07", "y": 1000000, "yDisplay": "₹10,000" },
          { "x": "2026-08", "y": 750000, "yDisplay": "₹7,500" },
          { "x": "2026-09", "y": 1000000, "yDisplay": "₹10,000" }
        ] } ],
        "summary": {
          "periodTotal": { "amountPaise": 4500000, "amountDisplay": "₹45,000" },
          "averagePerActiveMonth": { "amountPaise": 750000, "amountDisplay": "₹7,500" }
        },
        "drilldown": { "enabled": true, "path": "/payments", "paramKey": "month" }
      },
      "goldAccumulation": {
        "chartType": "area",
        "title": "Gold accumulated",
        "subtitle": "Cumulative credited gold across gold-weight schemes",
        "xAxis": { "type": "category", "label": "Month", "format": "MMM" },
        "yAxis": { "type": "weight", "label": "Gold", "unit": "g" },
        "series": [ { "key": "cumulativeGold", "name": "Gold saved", "data": [
          { "x": "2026-04", "y": 689, "yDisplay": "0.689 g" },
          { "x": "2026-07", "y": 2069, "yDisplay": "2.069 g" },
          { "x": "2026-09", "y": 3450, "yDisplay": "3.450 g" }
        ] } ],
        "summary": {
          "currentGold": { "weightMg": 3450, "weightDisplay": "3.450 g" },
          "valueAtCurrentRate": { "amountPaise": 2501250, "amountDisplay": "₹25,013" },
          "valuationAsOf": "2026-09-14T09:00:00+05:30",
          "valuationNote": "Current valuation at today's rate. This is not a guaranteed redemption value."
        },
        "drilldown": { "enabled": true, "path": "/gold-credits", "paramKey": "month" }
      }
    }
  }
}
```

### Home trends

`GET /app/home?includeTrends=true&trendMonths=6`

| Query | Default | Rule |
|---|---|---|
| `includeTrends` | `true` on supported app versions | Set `false` to skip the extra aggregation |
| `trendMonths` | 6 | Integer 3–12 |

Rules:

- Contribution points sum **successful, non-reversed** payments by customer and calendar month. A reversal removes the amount from the month its original payment was counted in.
- Gold accumulation is cumulative credited gold from the immutable gold ledger, not a recalculation from payment amounts.
- `valueAtCurrentRate` is always labelled as a current valuation.
- No gold-weight scheme or no gold credits → `"goldAccumulation": null`. **Do not fabricate a zero-value history.**
- No successful payments → an empty `contributions.series[].data` array with a valid empty-state label. Do not invent zero months.
- The app renders the server-provided `ChartSeries`. It must not compute totals from the active-scheme cards.

Suggested cache: 30–60 seconds, invalidated on payment or gold-credit mutation.

`actionCard` is the single most important element and is server-decided. Types, in priority order: `PAYMENT_OVERDUE` → `PAYMENT_DUE` → `FLEXI_LOCK_UPCOMING` → `SCHEME_MATURED` → `KYC_PENDING` → `PROFILE_INCOMPLETE` → `NONE`. The app never computes which card to show.

---

## 3. Scheme detail — three display modes

`GET /app/schemes/:schemeId` returns the same object as `06 §5`, trimmed of internal fields. The key the designer builds against is `displayMode`.

### `displayMode: "FIXED"`

Progress bar over installment count.

```json
{
  "displayMode": "FIXED",
  "header": {
    "planDisplayName": "Dhanam Gold Savings",
    "schemeNumber": "MGR/DH11/2026/00318",
    "statusLabel": "Active",
    "statusColor": "SUCCESS"
  },
  "progressCard": {
    "type": "INSTALLMENT_COUNT",
    "primaryLabel": "4 of 11 installments paid",
    "percentComplete": 36.4,
    "secondaryLabel": "₹20,000 of ₹55,000",
    "barSegments": { "filled": 4, "total": 11 }
  },
  "statCards": [
    { "key": "TOTAL_PAID", "label": "Total paid", "value": "₹20,000" },
    { "key": "NEXT_DUE", "label": "Next due", "value": "20 Sep 2026", "subValue": "₹5,000" },
    { "key": "MATURITY", "label": "Matures on", "value": "10 Jul 2027" },
    { "key": "BENEFIT", "label": "On maturity", "value": "12th installment free" }
  ],
  "payButton": { "enabled": true, "label": "Pay ₹5,000", "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" } },
  "payableThisMonth": {
    "suggested": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
    "min": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
    "max": { "amountPaise": 1500000, "amountDisplay": "₹15,000" },
    "isMandatory": false,
    "helperText": "Pay ₹5,000 for this month, or up to ₹15,000 to cover future months."
  }
}
```

### `displayMode: "FLEXIBLE_FREE_WINDOW"`

Progress is over **months of the free window**, not installments — there are none yet.

```json
{
  "displayMode": "FLEXIBLE_FREE_WINDOW",
  "header": { "planDisplayName": "Flexi Gold", "statusLabel": "Free payment period", "statusColor": "INFO" },
  "progressCard": {
    "type": "FREE_WINDOW_MONTHS",
    "primaryLabel": "Month 4 of 6",
    "percentComplete": 66.7,
    "secondaryLabel": "₹24,000 paid across 7 payments",
    "barSegments": { "filled": 4, "total": 6 }
  },
  "freeWindowBanner": {
    "title": "Pay any amount you like",
    "body": "Until 31 Oct 2026 you can pay any amount, any number of times. After that your monthly amount will be fixed based on what you've paid.",
    "daysRemaining": 47,
    "lockDate": "2026-10-31"
  },
  "projectedLockCard": {
    "title": "Your monthly amount will be about",
    "value": "₹4,000",
    "explainer": "₹24,000 paid ÷ 6 months, rounded up to the nearest ₹100. This will change if you pay more before 31 Oct.",
    "isEstimate": true
  },
  "statCards": [
    { "key": "TOTAL_PAID", "label": "Paid so far", "value": "₹24,000" },
    { "key": "GOLD_ACCRUED", "label": "Gold saved", "value": "3.312 g" },
    { "key": "PAYMENT_COUNT", "label": "Payments made", "value": "7" },
    { "key": "MATURITY", "label": "Matures on", "value": "31 Mar 2027" }
  ],
  "monthlyBreakdown": [
    { "month": "2026-05", "monthLabel": "May", "paid": { "amountPaise": 500000, "amountDisplay": "₹5,000" }, "paymentCount": 1 },
    { "month": "2026-06", "monthLabel": "Jun", "paid": { "amountPaise": 800000, "amountDisplay": "₹8,000" }, "paymentCount": 2 },
    { "month": "2026-09", "monthLabel": "Sep", "paid": { "amountPaise": 0, "amountDisplay": "₹0" }, "paymentCount": 0 }
  ],
  "payButton": { "enabled": true, "label": "Pay any amount" },
  "payableThisMonth": {
    "suggested": null,
    "min": { "amountPaise": 50000, "amountDisplay": "₹500" },
    "max": { "amountPaise": 10000000, "amountDisplay": "₹1,00,000" },
    "multipleOf": { "amountPaise": 10000, "amountDisplay": "₹100" },
    "isMandatory": false,
    "helperText": "Enter any amount between ₹500 and ₹1,00,000, in multiples of ₹100.",
    "quickAmounts": [
      { "amountPaise": 100000, "amountDisplay": "₹1,000" },
      { "amountPaise": 200000, "amountDisplay": "₹2,000" },
      { "amountPaise": 500000, "amountDisplay": "₹5,000" }
    ]
  }
}
```

`quickAmounts` are server-suggested chips derived from the customer's own payment history and the plan bounds — so the app doesn't hardcode denominations that might fall outside the allowed range.

### `displayMode: "FLEXIBLE_LOCK_WINDOW"`

```json
{
  "displayMode": "FLEXIBLE_LOCK_WINDOW",
  "header": { "planDisplayName": "Flexi Gold", "statusLabel": "Monthly payments", "statusColor": "SUCCESS" },
  "lockBanner": {
    "title": "Your monthly amount is ₹5,000",
    "body": "Based on the ₹30,000 you paid in your first 6 months.",
    "lockedAt": "2026-11-01",
    "dismissible": true
  },
  "progressCard": {
    "type": "INSTALLMENT_COUNT",
    "primaryLabel": "2 of 5 monthly payments done",
    "percentComplete": 40,
    "secondaryLabel": "₹40,000 of ₹55,000 total",
    "barSegments": { "filled": 2, "total": 5 }
  },
  "statCards": [
    { "key": "MONTHLY_AMOUNT", "label": "Monthly amount", "value": "₹5,000" },
    { "key": "NEXT_DUE", "label": "Next due", "value": "1 Jan 2027", "subValue": "₹5,000" },
    { "key": "TOTAL_PAID", "label": "Total paid", "value": "₹40,000" },
    { "key": "MATURITY", "label": "Matures on", "value": "31 Mar 2027" }
  ],
  "payButton": { "enabled": true, "label": "Pay ₹600" },
  "payableThisMonth": {
    "suggested": { "amountPaise": 60000, "amountDisplay": "₹600" },
    "min": { "amountPaise": 60000, "amountDisplay": "₹600" },
    "max": { "amountPaise": 60000, "amountDisplay": "₹600" },
    "maxReason": "REMAINING_THIS_CYCLE",
    "isMandatory": false,
    "positionVersion": 7,
    "targetCycle": "2026-09",
    "finalRemainderException": true,
    "helperText": "₹600 remains in this month's ₹2,500 allowance.",
    "quickAmounts": [
      { "amountPaise": 60000, "amountDisplay": "₹600", "label": "Pay the balance" }
    ],
    "nextCycleAction": null
  }
}
```

**There is no "Finish scheme" chip on a flexible-average scheme.** Each capped cycle has its own allowance and the cap is never multiplied into one combined payable amount. The maximum the sheet may offer is `remainingThisCycle`.

A **"Pay next cycle"** action appears only when the server says so — when the current cycle is fully paid, the plan sets `allowFutureCyclePayment: true`, the next cycle is the sequentially correct one, and `maxAdvanceCycles` is not exhausted:

```json
{
  "payableThisMonth": {
    "max": { "amountPaise": 0, "amountDisplay": "₹0" },
    "maxReason": "CYCLE_FULLY_PAID",
    "helperText": "This month's ₹2,500 is fully paid.",
    "nextCycleAction": {
      "available": true,
      "targetCycle": "2026-10",
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

Tapping it re-quotes against **October's own cap** via `GET /app/schemes/:id/payable-range?targetCycle=2026-10`. It never combines two cycles into one amount. When `available` is `false`, the action is hidden and `blockedReason` explains why.

The payment sheet reads `payableThisMonth` and nothing else. For a flexible-average scheme it creates the online attempt through `POST /app/schemes/:schemeId/payment-intents`, sending `expectedPositionVersion` (from `payableThisMonth.positionVersion`) and `targetCycle`. It polls the canonical `GET /app/payment-intents/:intentId` endpoint and may cancel through `POST /app/payment-intents/:intentId/cancel`. It must never call the fixed-scheme `/pay` route. On `PAYMENT_POSITION_CHANGED` it refreshes the quote and asks the user to confirm the new amount — **never silently reduces the amount**.

---

## 4. Past schemes

**`GET /app/schemes?group=PAST`**

```json
{
  "success": true,
  "data": [
    {
      "id": "sch_01HQ7Z...",
      "schemeNumber": "MGR/DH11/2025/00104",
      "planDisplayName": "Dhanam Gold Savings",
      "status": "REDEEMED",
      "statusLabel": "Completed",
      "statusColor": "NEUTRAL",
      "startDate": "2025-01-10",
      "closedAt": "2025-12-14",
      "closureType": "MATURITY_REDEMPTION",
      "summaryCard": {
        "totalPaid": { "amountPaise": 2200000, "amountDisplay": "₹22,000" },
        "benefitReceived": { "amountPaise": 200000, "amountDisplay": "₹2,000", "label": "12th installment free" },
        "finalValue": { "amountPaise": 2400000, "amountDisplay": "₹24,000" },
        "redemptionMode": "PURCHASE_ADJUSTMENT",
        "redemptionModeLabel": "Adjusted against purchase",
        "billNumber": "SG/INV/2025/8841"
      },
      "canViewPassbook": true,
      "closureReceiptUrl": "https://cdn.../closure/rdm_01HQ7Z.pdf"
    },
    {
      "id": "sch_01HQ6Z...",
      "status": "CLOSED_PREMATURE",
      "statusLabel": "Closed early",
      "statusColor": "WARNING",
      "closedAt": "2025-06-02",
      "summaryCard": {
        "totalPaid": { "amountPaise": 1500000, "amountDisplay": "₹15,000" },
        "benefitReceived": null,
        "penalty": { "amountPaise": 30000, "amountDisplay": "₹300", "label": "Early closure charge" },
        "finalValue": { "amountPaise": 1470000, "amountDisplay": "₹14,700" },
        "redemptionMode": "CASH",
        "redemptionModeLabel": "Cash payout"
      }
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false }
}
```

Past schemes keep a full readable passbook — closing a scheme never hides its history from the customer.

---

## 5. Browse & join schemes

**`GET /app/scheme-plans`** — only plans with `visibleInCustomerApp` and `customerSelfEnrolAllowed`, available at the customer's branch.

```json
{
  "success": true,
  "data": [
    {
      "id": "spl_01HQ7...",
      "displayName": "Dhanam Gold Savings",
      "description": "Save monthly for 11 months, get the 12th free.",
      "valueBasis": "CASH",
      "valueBasisLabel": "Rupee savings",
      "paymentPattern": "FIXED",
      "paymentPatternLabel": "Fixed monthly",
      "durationMonths": 11,
      "amountSummary": {
        "label": "₹1,000 – ₹50,000 per month",
        "min": { "amountPaise": 100000, "amountDisplay": "₹1,000" },
        "max": { "amountPaise": 5000000, "amountDisplay": "₹50,000" },
        "multipleOf": { "amountPaise": 50000, "amountDisplay": "₹500" },
        "amountMode": "CUSTOMER_CHOSEN",
        "slabs": null
      },
      "benefitLabel": "12th installment free",
      "highlights": ["11 monthly payments", "12th installment free", "Redeem as cash, gold or purchase"],
      "canEnrol": true,
      "blockedReason": null
    },
    {
      "id": "spl_01HQ8...",
      "displayName": "Flexi Gold",
      "paymentPattern": "FLEXIBLE",
      "paymentPatternLabel": "Pay as you like, then monthly",
      "durationMonths": 11,
      "flexibleSummary": {
        "freeWindowMonths": 6,
        "lockWindowMonths": 5,
        "explainer": "Pay any amount for the first 6 months. From month 7, pay the average of what you paid each month.",
        "minPerPayment": { "amountPaise": 50000, "amountDisplay": "₹500" },
        "maxPerPayment": { "amountPaise": 10000000, "amountDisplay": "₹1,00,000" }
      },
      "canEnrol": false,
      "blockedReason": "You already have an active scheme. Complete it before joining another."
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false }
}
```

**`POST /app/schemes/enrol`** — contract in `06 §12`.

---

## 6. Passbook

**`GET /app/schemes/:schemeId/passbook`** — same shape as `06 §7`, with `receiptUrl` and `passbookImageUrl` per row so the customer can re-download any past receipt or passbook image.

For a locked flexible scheme the response carries two sections:
```json
{
  "sections": [
    { "key": "FREE_WINDOW", "label": "Free payment period (May – Oct 2026)", "rows": [ ], "total": { "amountPaise": 3000000, "amountDisplay": "₹30,000" } },
    { "key": "LOCK_WINDOW", "label": "Monthly payments (Nov 2026 – Mar 2027)", "rows": [ ], "total": { "amountPaise": 1000000, "amountDisplay": "₹10,000" } }
  ]
}
```

---

## 7. Profile & KYC

**`GET /app/profile`**
```json
{
  "success": true,
  "data": {
    "id": "cus_01HQ8Z...",
    "name": "Anjali Menon",
    "mobile": "9847112233",
    "dateOfBirth": "1992-04-18",
    "address": { "line1": "18 Kadavanthra Road", "line2": "Near Metro Pillar 412", "city": "Kochi", "pincode": "682020" },
    "passbookNumber": "MGR/2026/00412",
    "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR", "address": "42 MG Road, Kochi 682011", "contactNumber": "9846543211" },
    "kyc": { "type": "AADHAAR", "status": "VERIFIED", "statusLabel": "Verified", "canUpdate": false },
    "whatsappOptIn": true,
    "memberSince": "2026-04-01",
    "profileCompleteness": { "percent": 100, "missing": [] }
  }
}
```

`PATCH /app/profile` accepts `name`, `dateOfBirth`, `address`, `whatsappOptIn`. **Mobile cannot be changed in V1** — it's the identity key. Attempting it returns `403 MOBILE_CHANGE_NOT_SUPPORTED` with a message to visit the showroom.

`PUT /app/profile/kyc` mirrors `04 §8` using the presigned upload flow. Once `VERIFIED`, `canUpdate` is `false` and further uploads are rejected — a customer cannot silently replace verified KYC.

---

## 8. Notifications

**`GET /app/notifications`**
```json
{
  "success": true,
  "data": [
    {
      "id": "ntf_01HQ8Z...",
      "type": "PAYMENT_DUE",
      "title": "₹5,000 due on 20 Sep",
      "body": "Installment 5 of Dhanam Gold Savings is due in 6 days.",
      "createdAt": "2026-09-14T09:00:00+05:30",
      "read": false,
      "deepLink": { "screen": "SCHEME_DETAIL", "params": { "schemeId": "sch_01HQ8Z..." } },
      "cta": { "label": "Pay now", "action": "PAY", "schemeId": "sch_01HQ8Z..." }
    },
    {
      "id": "ntf_01HQ8Y...",
      "type": "PAYMENT_SUCCESS",
      "title": "Payment of ₹5,000 received",
      "body": "Receipt SG/MGR/2026/001284. You've now saved 0.689 g more gold.",
      "createdAt": "2026-08-20T11:14:00+05:30",
      "read": true,
      "deepLink": { "screen": "PAYMENT_DETAIL", "params": { "paymentId": "pay_01HQ8Z..." } },
      "imageUrl": "https://cdn.../passbook/pay_01HQ8.png"
    }
  ],
  "meta": { "unreadCount": 2, "nextCursor": null, "hasMore": false }
}
```

Notification types: `PAYMENT_DUE`, `PAYMENT_OVERDUE`, `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `SCHEME_JOINED`, `FLEXI_LOCK_UPCOMING`, `FLEXI_LOCK_APPLIED`, `SCHEME_MATURED`, `SCHEME_CLOSED`, `REDEMPTION_APPROVED`, `GOLD_RATE_UPDATE`, `KYC_VERIFIED`, `KYC_REJECTED`, `GRIEVANCE_REPLY_RECEIVED`, `GRIEVANCE_STATUS_CHANGED`.

Grievance notifications are push and in-app only — **no WhatsApp message, no template, no quota consumption**.

---

## 9. FCM token management

**`POST /app/devices/fcm-token`**
```json
{
  "fcmToken": "dXNlcl90b2tlbl9oZXJl...",
  "deviceId": "dev_01HQ9...",
  "platform": "android",
  "appVersion": "1.2.0",
  "osVersion": "14",
  "deviceModel": "Redmi Note 12"
}
```
```json
{
  "success": true,
  "data": {
    "registered": true,
    "deviceId": "dev_01HQ9...",
    "topics": ["tenant_tnt_01HQ7A", "branch_brn_01HQ7A", "customer_cus_01HQ8Z"],
    "replacedPreviousToken": true
  }
}
```

Rules:
- Upsert on `(customerId, deviceId)`. A new token for the same device replaces the old one.
- The same FCM token arriving under a different customer detaches it from the previous customer — this is the shared-device case and prevents notification leakage.
- Tokens rejected by FCM as `UNREGISTERED` are pruned by a daily job.
- `DELETE /app/devices/fcm-token` on logout, sent with `deviceId`.

**Push payload shape** (what the app must handle):
```json
{
  "notification": { "title": "₹5,000 due on 20 Sep", "body": "Installment 5 of Dhanam Gold Savings is due in 6 days." },
  "data": {
    "type": "PAYMENT_DUE",
    "tenantId": "tnt_01HQ7A...",
    "schemeId": "sch_01HQ8Z...",
    "notificationId": "ntf_01HQ8Z...",
    "screen": "SCHEME_DETAIL",
    "imageUrl": ""
  }
}
```

---

## 10. Branches & support

**`GET /app/branches`**
```json
{
  "success": true,
  "data": [
    {
      "id": "brn_01HQ7A...",
      "name": "MG Road",
      "code": "MGR",
      "address": "42 MG Road, Kochi 682011",
      "contactNumber": "9846543211",
      "isMyBranch": true
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false, "supportNumber": "9846543211" }
}
```

---

## 11. Force update & maintenance

Every `/app/*` response may carry:
```json
{
  "meta": {
    "appUpdate": { "required": true, "latestVersion": "1.3.0", "message": "Please update to continue.", "storeUrl": "https://play.google.com/store/apps/details?id=..." }
  }
}
```

When `required` is `true` the app blocks with an update gate. A version below `minSupportedVersion` receives `426 FORCE_UPDATE_REQUIRED` on every call including login, so an outdated client cannot transact against a changed contract.

---

## 12. Branding application

The app applies branding at runtime from `tenant.branding` returned at login and on every `/app/home`:

| Token | Source | Applied to |
|---|---|---|
| `primaryColor` | tenant branding | App bar, primary buttons, progress bars, active states |
| `secondaryColor` | tenant branding | Accents, badges, highlights, chart fills |
| `logoUrl` | tenant branding | Splash, app bar, receipts view |
| `appDisplayName` | tenant branding | App bar title, greeting header |

Contrast safety is the server's job: the branding response includes computed foreground colours so a dark brand colour doesn't produce unreadable text.

```json
{
  "branding": {
    "primaryColor": "#7B1E1E",
    "onPrimaryColor": "#FFFFFF",
    "secondaryColor": "#C9A227",
    "onSecondaryColor": "#1A1A1A",
    "primaryColorLight": "#A84B4B",
    "primaryColorDark": "#4E0E0E"
  }
}
```
