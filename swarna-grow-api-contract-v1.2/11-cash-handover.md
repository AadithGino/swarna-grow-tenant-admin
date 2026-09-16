# 11 — Cash Handover (staff → branch)

Every persisted single-handover mutation success response returns `data.auditEventId`, including cancel, discrepancy resolution and reject responses whose full payloads are omitted for brevity.

One movement only: **liquid cash from a staff member to their branch/shop**. No branch-to-head-office submission, no cross-branch movement.

The module exists on **both** surfaces:
- **Staff app** — see own cash-in-hand, create a handover, see own history.
- **Branch/admin portal** — see every staff member's cash-in-hand, accept/reject/flag discrepancy, create a handover on a staff member's behalf ("mark as submitted"), and see full history.

---

## 1. Cash-in-hand definition

`cashInHand` for a staff member is **derived from the ledger**, never stored as a mutable counter:

```
cashInHand = Σ(CASH payments collected by staff, status SUCCESS)   ← CASH only; CARD, UPI,
                                                                   BANK_TRANSFER, CHEQUE and
                                                                   ONLINE_GATEWAY never count
           − Σ(CASH payment reversals attributed to staff)
           − Σ(handover amounts in status ACCEPTED)
           − Σ(handover amounts in status PENDING)          ← held, not yet accepted
           ± Σ(manual cash adjustments)
```

Pending handovers reduce the available balance so a staff member cannot submit the same cash twice. A rejected handover releases it back.

The response distinguishes three figures, and the UI should show all three because they answer different questions:

| Field | Meaning |
|---|---|
| `cashCollected` | Total cash ever collected, lifetime or period |
| `cashInHand` | What the staff member is holding right now and must hand over |
| `cashPendingAcceptance` | Submitted, awaiting the branch's confirmation |

---

## 2. Endpoints

### Staff app
| Method | Path | Phase | Permission |
|---|---|---|---|
| `GET` | `/staff/cash/summary` | P1 | `cash.handover.create` |
| `GET` | `/staff/cash/collections` | P1 | `cash.handover.create` |
| `POST` | `/staff/cash/handovers` | P1 | `cash.handover.create` |
| `GET` | `/staff/cash/handovers` | P1 | `cash.handover.create` |
| `GET` | `/staff/cash/handovers/:handoverId` | P1 | `cash.handover.create` |
| `POST` | `/staff/cash/handovers/:handoverId/cancel` | P1 | own, while `PENDING` |

### Branch / admin portal
| Method | Path | Phase | Permission |
|---|---|---|---|
| `GET` | `/admin/cash/overview` | P1 | `cash.handover.accept` |
| `GET` | `/admin/cash/staff-balances` | P1 | `cash.handover.accept` |
| `GET` | `/admin/cash/staff-balances/:staffId` | P1 | `cash.handover.accept` |
| `GET` | `/admin/cash/handovers` | P1 | `cash.handover.accept` |
| `GET` | `/admin/cash/handovers/:handoverId` | P1 | `cash.handover.accept` |
| `POST` | `/admin/cash/handovers` | P1 | `cash.handover.accept` — admin-initiated, marks staff cash submitted |
| `POST` | `/admin/cash/handovers/:handoverId/accept` | P1 | `cash.handover.accept` |
| `POST` | `/admin/cash/handovers/:handoverId/reject` | P1 | `cash.handover.accept` |
| `POST` | `/admin/cash/adjustments` | P1.5 | `TENANT_ADMIN` |
| `GET` | `/admin/cash/report` | P1 | `report.read` |

---

## 3. Staff — cash summary

**`GET /staff/cash/summary`**

The staff app home card. One call, everything the collector needs to know.

```json
{
  "success": true,
  "data": {
    "staff": { "id": "usr_01HQ8Z...", "name": "Rahul Nair" },
    "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },

    "cashInHand": { "amountPaise": 1850000, "amountDisplay": "₹18,500" },
    "cashPendingAcceptance": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
    "availableToHandover": { "amountPaise": 1850000, "amountDisplay": "₹18,500" },

    "today": {
      "cashCollected": { "amountPaise": 700000, "amountDisplay": "₹7,000" },
      "nonCashCollected": { "amountPaise": 650000, "amountDisplay": "₹6,500" },
      "totalCollected": { "amountPaise": 1350000, "amountDisplay": "₹13,500" },
      "receiptCount": 8,
      "cashReceiptCount": 4
    },

    "period": {
      "from": "2026-09-12",
      "to": "2026-09-14",
      "label": "Since last accepted handover",
      "cashCollected": { "amountPaise": 1850000, "amountDisplay": "₹18,500" },
      "receiptCount": 14
    },

    "lastHandover": {
      "id": "hov_01HQ8Y...",
      "handoverNumber": "MGR/CH/2026/00184",
      "amount": { "amountPaise": 2400000, "amountDisplay": "₹24,000" },
      "status": "ACCEPTED",
      "submittedAt": "2026-09-12T19:40:00+05:30",
      "acceptedAt": "2026-09-12T19:55:00+05:30",
      "acceptedBy": { "id": "usr_01HQ7...", "name": "Priya S" }
    },

    "pendingHandovers": [
      {
        "id": "hov_01HQ8Z...",
        "handoverNumber": "MGR/CH/2026/00191",
        "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
        "status": "PENDING",
        "submittedAt": "2026-09-14T13:10:00+05:30",
        "ageMinutes": 82
      }
    ],

    "alert": {
      "severity": "MEDIUM",
      "message": "You're holding ₹18,500. Hand over to your branch before closing.",
      "thresholdPaise": 1000000
    },

    "actions": { "canCreateHandover": true }
  }
}
```

---

## 4. Staff — collections behind the balance

**`GET /staff/cash/collections?sinceLastHandover=true`**

The itemised list of cash receipts that make up `cashInHand`. This is what the staff member reviews before submitting, and the receipt count they'll be asked to confirm.

```json
{
  "success": true,
  "data": [
    {
      "paymentId": "pay_01HQ8Z...",
      "receiptNumber": "SG/MGR/2026/001284",
      "paidAt": "2026-09-14T10:30:00+05:30",
      "customer": { "id": "cus_01HQ8Z...", "name": "Anjali Menon", "passbookNumber": "MGR/2026/00412" },
      "scheme": { "schemeNumber": "MGR/DH11/2026/00318" },
      "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "includedInHandover": null
    }
  ],
  "meta": {
    "nextCursor": null,
    "hasMore": false,
    "summary": {
      "receiptCount": 14,
      "totalAmount": { "amountPaise": 1850000, "amountDisplay": "₹18,500" },
      "from": "2026-09-12T19:40:00+05:30",
      "to": "2026-09-14T14:32:00+05:30"
    }
  }
}
```

---

## 5. Staff — create handover

**`POST /staff/cash/handovers`**

Headers: `X-Idempotency-Key`

```json
{
  "amountPaise": 1850000,
  "receiptCount": 14,
  "coversUntil": "2026-09-14T14:32:00+05:30",
  "denominations": [
    { "denomination": 500, "count": 30 },
    { "denomination": 200, "count": 10 },
    { "denomination": 100, "count": 15 }
  ],
  "remarks": "End of day collection"
}
```

| Field | Notes |
|---|---|
| `amountPaise` | Must be ≤ `availableToHandover` → else `CASH_HANDOVER_AMOUNT_EXCEEDS_BALANCE`. Partial handovers are allowed. |
| `receiptCount` | Staff's own count. Compared against the system count; a mismatch is recorded, not blocked. |
| `coversUntil` | Cutoff timestamp. Payments after this stay in cash-in-hand. Defaults to now. |
| `denominations` | Optional. Sum is validated against `amountPaise` if provided. |

**Response `201`**
```json
{
  "success": true,
  "data": {
    "id": "hov_01HQ8Z...",
    "handoverNumber": "MGR/CH/2026/00192",
    "staff": { "id": "usr_01HQ8Z...", "name": "Rahul Nair" },
    "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
    "initiatedBy": "STAFF",
    "amount": { "amountPaise": 1850000, "amountDisplay": "₹18,500" },
    "declaredReceiptCount": 14,
    "systemReceiptCount": 14,
    "systemAmount": { "amountPaise": 1850000, "amountDisplay": "₹18,500" },
    "countMatches": true,
    "amountMatches": true,
    "status": "PENDING",
    "submittedAt": "2026-09-14T14:35:00+05:30",
    "coversFrom": "2026-09-12T19:40:00+05:30",
    "coversUntil": "2026-09-14T14:32:00+05:30",
    "paymentIds": ["pay_01HQ8Z...", "pay_01HQ8Y..."],
    "denominations": [ { "denomination": 500, "count": 30, "value": { "amountPaise": 1500000, "amountDisplay": "₹15,000" } } ],
    "cashInHandAfter": { "amountPaise": 0, "amountDisplay": "₹0" },
    "notifiedTo": [ { "id": "usr_01HQ7...", "name": "Priya S", "role": "BRANCH_MANAGER" } ],
    "auditEventId": "aud_01HOV..."
  }
}
```

Declared amount below the system amount is allowed but flagged for the accepting admin to see:
```json
{
  "amount": { "amountPaise": 1800000, "amountDisplay": "₹18,000" },
  "systemAmount": { "amountPaise": 1850000, "amountDisplay": "₹18,500" },
  "amountMatches": false,
  "declaredVariance": { "amountPaise": -50000, "amountDisplay": "-₹500", "type": "SHORT" }
}
```

**`POST /staff/cash/handovers/:handoverId/cancel`** — withdraws a `PENDING` handover, releasing the amount back to cash-in-hand. Only by the submitting staff, only while `PENDING`.

---

## 6. Admin — cash overview

**`GET /admin/cash/overview`** — the branch cash dashboard.

```json
{
  "success": true,
  "data": {
    "scope": { "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" } },
    "totals": {
      "totalCashInHand": { "amountPaise": 4260000, "amountDisplay": "₹42,600" },
      "pendingAcceptance": { "amountPaise": 1850000, "amountDisplay": "₹18,500" },
      "acceptedToday": { "amountPaise": 2400000, "amountDisplay": "₹24,000" },
      "staffHoldingCash": 4,
      "pendingHandoverCount": 3,
      "discrepancyOpenCount": 1
    },
    "alerts": [
      { "severity": "MEDIUM", "message": "3 handovers awaiting acceptance (₹18,500)", "actionPath": "/cash-handovers?status=PENDING" },
      { "severity": "HIGH", "message": "Rahul Nair is holding ₹18,500 for 3 days", "staffId": "usr_01HQ8Z...", "daysHeld": 3 }
    ],
    "chart": {
      "chartType": "horizontalBar",
      "title": "Cash in hand by staff",
      "yAxis": { "type": "currency", "label": "Amount" },
      "series": [ { "key": "CASH_IN_HAND", "name": "Cash in hand", "data": [ { "x": "Rahul Nair", "y": 1850000, "yDisplay": "₹18,500" }, { "x": "Anoop M", "y": 1420000, "yDisplay": "₹14,200" }, { "x": "Sneha K", "y": 990000, "yDisplay": "₹9,900" } ] } ]
    }
  }
}
```

---

## 7. Admin — staff balances

**`GET /admin/cash/staff-balances`**

Query: `branchId`, `hasBalance=true`, `sort=cashInHand:desc`.

```json
{
  "success": true,
  "data": [
    {
      "staff": { "id": "usr_01HQ8Z...", "name": "Rahul Nair", "mobile": "9846XXXX99", "role": "BRANCH_STAFF" },
      "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
      "cashInHand": { "amountPaise": 1850000, "amountDisplay": "₹18,500" },
      "cashPendingAcceptance": { "amountPaise": 0, "amountDisplay": "₹0" },
      "receiptCount": 14,
      "oldestUnhandedOverAt": "2026-09-12T19:45:00+05:30",
      "daysHolding": 2,
      "lastHandoverAt": "2026-09-12T19:40:00+05:30",
      "cashCollectedToday": { "amountPaise": 950000, "amountDisplay": "₹9,500" },
      "riskFlag": "HOLDING_TOO_LONG",
      "actions": { "canMarkSubmitted": true, "canViewCollections": true }
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false, "summary": { "staffCount": 4, "totalCashInHand": { "amountPaise": 4260000, "amountDisplay": "₹42,600" } } }
}
```

`riskFlag` ∈ `null` | `HOLDING_TOO_LONG` (> configured days) | `HIGH_BALANCE` (> configured amount).

**`GET /admin/cash/staff-balances/:staffId`** returns the same object plus the itemised collections list (same shape as `/staff/cash/collections`), which is what the admin reviews before marking cash submitted.

---

## 8. Admin — mark cash submitted (admin-initiated handover)

This is the "branch marks the staff member's in-hand cash as submitted, and their balance reduces" flow. It creates a handover that is **already accepted**, in one step.

**`POST /admin/cash/handovers`**

Headers: `X-Idempotency-Key`

```json
{
  "staffId": "usr_01HQ8Z...",
  "amountPaise": 1850000,
  "receiptCount": 14,
  "coversUntil": "2026-09-14T14:32:00+05:30",
  "autoAccept": true,
  "acceptanceRemarks": "Cash counted and received at counter",
  "denominations": null
}
```

`autoAccept: true` creates and accepts it in the same transaction — the balance drops immediately. `autoAccept: false` creates it as `PENDING` on the staff member's behalf, which is useful when a manager records it but wants a second person to verify.

```json
{
  "success": true,
  "data": {
    "id": "hov_01HQ8Z...",
    "handoverNumber": "MGR/CH/2026/00193",
    "initiatedBy": "ADMIN",
    "initiatedByUser": { "id": "usr_01HQ7...", "name": "Priya S" },
    "staff": { "id": "usr_01HQ8Z...", "name": "Rahul Nair" },
    "amount": { "amountPaise": 1850000, "amountDisplay": "₹18,500" },
    "status": "ACCEPTED",
    "submittedAt": "2026-09-14T14:40:00+05:30",
    "acceptedAt": "2026-09-14T14:40:00+05:30",
    "acceptedBy": { "id": "usr_01HQ7...", "name": "Priya S" },
    "staffCashInHandAfter": { "amountPaise": 0, "amountDisplay": "₹0" },
    "notifiedStaff": true,
    "auditEventId": "aud_01HOV..."
  }
}
```

The staff member receives a push notification confirming their balance was cleared, so the reduction is never a silent change they discover later.

---

## 9. Admin — accept / reject

**`POST /admin/cash/handovers/:handoverId/accept`**

```json
{
  "acceptedAmountPaise": 1850000,
  "remarks": "Counted and matched",
  "expectedVersion": 1
}
```

If `acceptedAmountPaise` differs from the submitted amount, the handover is accepted with a **discrepancy** rather than rejected — the cash physically arrived, just not the declared amount.

```json
{
  "success": true,
  "data": {
    "id": "hov_01HQ8Z...",
    "status": "DISCREPANCY",
    "submittedAmount": { "amountPaise": 1850000, "amountDisplay": "₹18,500" },
    "acceptedAmount": { "amountPaise": 1800000, "amountDisplay": "₹18,000" },
    "discrepancy": {
      "amount": { "amountPaise": -50000, "amountDisplay": "-₹500" },
      "type": "SHORT",
      "status": "OPEN",
      "remarks": "₹500 short on counting",
      "raisedBy": { "id": "usr_01HQ7...", "name": "Priya S" },
      "raisedAt": "2026-09-14T14:45:00+05:30"
    },
    "acceptedAt": "2026-09-14T14:45:00+05:30",
    "acceptedBy": { "id": "usr_01HQ7...", "name": "Priya S" },
    "staffCashInHandAfter": { "amountPaise": 50000, "amountDisplay": "₹500" },
    "note": "The shortfall remains against the staff member's cash-in-hand until resolved.",
    "auditEventId": "aud_01HOV..."
  }
}
```

A shortfall keeps sitting on the staff member's balance. An excess (`type: "EXCESS"`) creates a positive adjustment. Neither ever touches a payment ledger entry — cash discrepancies are a cash-module concern, not a scheme-ledger concern.

**`POST /admin/cash/handovers/:handoverId/resolve-discrepancy`** (P1)
```json
{ "resolution": "RECOVERED_FROM_STAFF", "remarks": "₹500 recovered in cash on 15 Sep", "adjustmentAmountPaise": 50000 }
```
`resolution` ∈ `RECOVERED_FROM_STAFF` | `WRITTEN_OFF` | `COUNTING_ERROR_CORRECTED` | `OTHER`.

**`POST /admin/cash/handovers/:handoverId/reject`**
```json
{ "reason": "Staff did not bring the cash", "remarks": null }
```
Full amount returns to the staff member's cash-in-hand; status `REJECTED`; staff notified.

---

## 10. Handover list

**`GET /admin/cash/handovers`** and **`GET /staff/cash/handovers`** (own only)

Query: `status`, `staffId`, `branchId`, `initiatedBy`, `hasDiscrepancy=true`, `from`, `to`, `sort=submittedAt:desc`.

```json
{
  "success": true,
  "data": [
    {
      "id": "hov_01HQ8Z...",
      "handoverNumber": "MGR/CH/2026/00192",
      "staff": { "id": "usr_01HQ8Z...", "name": "Rahul Nair" },
      "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
      "initiatedBy": "STAFF",
      "amount": { "amountPaise": 1850000, "amountDisplay": "₹18,500" },
      "acceptedAmount": null,
      "receiptCount": 14,
      "status": "PENDING",
      "submittedAt": "2026-09-14T14:35:00+05:30",
      "ageMinutes": 82,
      "acceptedAt": null,
      "acceptedBy": null,
      "hasDiscrepancy": false,
      "coversFrom": "2026-09-12T19:40:00+05:30",
      "coversUntil": "2026-09-14T14:32:00+05:30",
      "actions": { "canAccept": true, "canReject": true, "canCancel": false }
    }
  ],
  "meta": {
    "nextCursor": null,
    "hasMore": false,
    "summary": {
      "count": 42,
      "pending": 3,
      "accepted": 37,
      "discrepancy": 1,
      "rejected": 1,
      "totalSubmitted": { "amountPaise": 84200000, "amountDisplay": "₹8,42,000" },
      "totalAccepted": { "amountPaise": 83700000, "amountDisplay": "₹8,37,000" },
      "totalDiscrepancy": { "amountPaise": -50000, "amountDisplay": "-₹500" }
    }
  }
}
```

**`GET /admin/cash/handovers/:handoverId`** adds the full `payments[]` list covered by the handover, the denomination breakdown, and the complete status timeline:

```json
{
  "timeline": [
    { "at": "2026-09-14T14:35:00+05:30", "event": "SUBMITTED", "by": { "id": "usr_01HQ8Z...", "name": "Rahul Nair" }, "note": "End of day collection" },
    { "at": "2026-09-14T14:45:00+05:30", "event": "ACCEPTED_WITH_DISCREPANCY", "by": { "id": "usr_01HQ7...", "name": "Priya S" }, "note": "₹500 short on counting" },
    { "at": "2026-09-15T10:00:00+05:30", "event": "DISCREPANCY_RESOLVED", "by": { "id": "usr_01HQ7...", "name": "Priya S" }, "note": "Recovered from staff" }
  ]
}
```

---

## 11. Cash report

**`GET /admin/cash/report`**

Query: `from`, `to`, `branchId`, `staffId`, `groupBy` ∈ `STAFF` | `DAY` | `BRANCH`.

```json
{
  "success": true,
  "data": {
    "period": { "from": "2026-09-01", "to": "2026-09-14" },
    "totals": {
      "cashCollected": { "amountPaise": 94200000, "amountDisplay": "₹9,42,000" },
      "handedOver": { "amountPaise": 89400000, "amountDisplay": "₹8,94,000" },
      "currentlyInHand": { "amountPaise": 4260000, "amountDisplay": "₹42,600" },
      "discrepancyTotal": { "amountPaise": -50000, "amountDisplay": "-₹500" },
      "handoverCount": 42,
      "averageHoldingDays": 1.4
    },
    "groups": [
      {
        "key": "usr_01HQ8Z...",
        "label": "Rahul Nair",
        "cashCollected": { "amountPaise": 28400000, "amountDisplay": "₹2,84,000" },
        "handedOver": { "amountPaise": 26550000, "amountDisplay": "₹2,65,500" },
        "inHand": { "amountPaise": 1850000, "amountDisplay": "₹18,500" },
        "handoverCount": 12,
        "discrepancies": 1,
        "averageHoldingDays": 1.8
      }
    ],
    "charts": {
      "collectedVsHandedOver": {
        "chartType": "bar",
        "title": "Collected vs handed over by staff",
        "yAxis": { "type": "currency", "label": "Amount" },
        "series": [
          { "key": "COLLECTED", "name": "Collected", "data": [ { "x": "Rahul Nair", "y": 28400000, "yDisplay": "₹2,84,000" } ] },
          { "key": "HANDED_OVER", "name": "Handed over", "data": [ { "x": "Rahul Nair", "y": 26550000, "yDisplay": "₹2,65,500" } ] }
        ]
      },
      "dailyHandovers": {
        "chartType": "line",
        "title": "Daily handovers",
        "yAxis": { "type": "currency", "label": "Amount" },
        "series": [ { "key": "handedOver", "name": "Handed over", "data": [ { "x": "2026-09-12", "y": 6400000, "yDisplay": "₹64,000" }, { "x": "2026-09-13", "y": 7100000, "yDisplay": "₹71,000" } ] } ]
      }
    }
  }
}
```

Export via `POST /admin/exports` with `reportKey: "CASH_HANDOVER_REPORT"`.

---

## 12. Interaction with payment reversal

A cash payment reversed **before** its handover is accepted simply reduces cash-in-hand and drops out of the pending handover's coverage.

A cash payment reversed **after** its handover was accepted cannot rewrite a settled handover. Instead a `CASH_ADJUSTMENT` row is created:

```json
{
  "id": "cadj_01HQ9Z...",
  "type": "REVERSAL_AFTER_HANDOVER",
  "staff": { "id": "usr_01HQ8Z...", "name": "Rahul Nair" },
  "amount": { "amountPaise": -500000, "amountDisplay": "-₹500" },
  "relatedPaymentId": "pay_01HQ8Z...",
  "relatedHandoverId": "hov_01HQ8Y...",
  "remarks": "Cheque bounced after handover was accepted",
  "createdAt": "2026-09-16T10:00:00+05:30"
}
```

The adjustment appears in the staff balance calculation and in the cash report, so the books reconcile without any historical record being altered.
