# 09 — Maturity, Redemption & Closure

Every persisted single-entity redemption or closure mutation success response returns `data.auditEventId`, including mutations whose full response is omitted for brevity.

Two settlement paths, one shared computation engine:

- **Maturity redemption** — scheme completed, benefit applied, customer takes value.
- **Premature closure** — scheme ended early. This is also what "cancel scheme" means. One endpoint, one status: `CLOSED_PREMATURE`.

---

## 1. Endpoints

| Method | Path | Phase | Permission |
|---|---|---|---|
| `GET` | `/admin/schemes/:schemeId/settlement-preview` | P1 | `redemption.initiate` |
| `POST` | `/admin/schemes/:schemeId/redeem` | P1 | `redemption.initiate` |
| `POST` | `/admin/schemes/:schemeId/close-premature` | P1 | `redemption.initiate` |
| `GET` | `/admin/redemptions` | P1 | `customer.read` |
| `GET` | `/admin/redemptions/:redemptionId` | P1 | `customer.read` |
| `POST` | `/admin/redemptions/:redemptionId/approve` | P1 | `redemption.approve` |
| `POST` | `/admin/redemptions/:redemptionId/reject` | P1 | `redemption.approve` |
| `POST` | `/admin/redemptions/:redemptionId/complete` | P1 | `redemption.initiate` |
| `GET` | `/admin/redemptions/:redemptionId/receipt` | P1 | `customer.read` |
| `POST` | `/app/schemes/:schemeId/redemption-request` | P1 | customer app |
| `GET` | `/app/schemes/:schemeId/settlement-preview` | P1 | customer app |

---

## 2. Settlement preview

**`GET /admin/schemes/:schemeId/settlement-preview?type=MATURITY_REDEMPTION`**

`type` ∈ `MATURITY_REDEMPTION` | `PREMATURE_CLOSURE`. This is a pure computation — no writes, no state change — and it's what the redemption screen renders before anyone commits.

### Maturity redemption, cash scheme
```json
{
  "success": true,
  "data": {
    "type": "MATURITY_REDEMPTION",
    "eligible": true,
    "blockers": [],

    "scheme": {
      "id": "sch_01HQ5Z...",
      "schemeNumber": "MGR/DH11/2025/00088",
      "planName": "Dhanam 11",
      "valueBasis": "CASH",
      "status": "MATURED",
      "maturityDate": "2026-09-10",
      "daysSinceMaturity": 4
    },
    "customer": { "id": "cus_01HQ5Z...", "name": "Lakshmi Nair", "mobile": "9847XXXX02", "passbookNumber": "MGR/2025/00071" },

    "computation": {
      "lines": [
        { "key": "TOTAL_PAID", "label": "Total paid (11 installments)", "amount": { "amountPaise": 5500000, "amountDisplay": "₹55,000" }, "sign": "+" },
        { "key": "BENEFIT", "label": "12th installment free", "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" }, "sign": "+", "isComputed": true },
        { "key": "PENALTY", "label": "Penalty", "amount": { "amountPaise": 0, "amountDisplay": "₹0" }, "sign": "-" }
      ],
      "finalValue": { "amountPaise": 6000000, "amountDisplay": "₹60,000" },
      "goldWeight": null
    },

    "benefit": {
      "type": "ONE_FREE_INSTALLMENT",
      "displayLabel": "12th installment free",
      "isComputed": true,
      "applied": true,
      "value": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "eligibilityMet": true,
      "eligibilityDetail": { "allInstallmentsPaid": true, "defaultsCount": 0, "maxAllowedDefaults": 0 }
    },

    "textBenefits": [],

    "allowedModes": [
      { "mode": "CASH", "label": "Cash payout", "available": true },
      { "mode": "GOLD_HANDOVER", "label": "Take as gold", "available": true, "note": "Weight computed at today's rate" },
      { "mode": "PURCHASE_ADJUSTMENT", "label": "Adjust against purchase", "available": true },
      { "mode": "TRANSFER_TO_SCHEME", "label": "Start a new scheme", "available": true }
    ],

    "modePreviews": {
      "GOLD_HANDOVER": {
        "rateApplied": { "ratePerGramPaise": 725000, "ratePerGramDisplay": "₹7,250" },
        "weight": { "weightMg": 8276, "weightDisplay": "8.276 g" },
        "note": "At today's rate of ₹7,250 per gram"
      }
    },

    "approvalRequired": true,
    "approvalReason": "Tenant setting requires admin approval for all redemptions",
    "redeemAtAnyBranch": false,
    "enrolmentBranch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" }
  }
}
```

### Gold-weight scheme
```json
{
  "computation": {
    "lines": [
      { "key": "TOTAL_PAID", "label": "Total paid (11 installments)", "amount": { "amountPaise": 5500000, "amountDisplay": "₹55,000" }, "sign": "+" },
      { "key": "GOLD_ACCRUED", "label": "Gold accumulated", "weight": { "weightMg": 7586, "weightDisplay": "7.586 g" }, "sign": "+" },
      { "key": "BENEFIT", "label": "5% bonus on maturity", "amount": { "amountPaise": 275000, "amountDisplay": "₹2,750" }, "weight": { "weightMg": 379, "weightDisplay": "0.379 g" }, "sign": "+", "isComputed": true, "note": "Bonus converted to gold at today's rate" }
    ],
    "finalWeight": { "weightMg": 7965, "weightDisplay": "7.965 g" },
    "finalValue": { "amountPaise": 5774625, "amountDisplay": "₹57,746" },
    "valuationRate": { "ratePerGramPaise": 725000, "ratePerGramDisplay": "₹7,250" },
    "valuationNote": "Cash equivalent calculated at today's gold rate. This changes daily."
  }
}
```

### Text-only benefit
```json
{
  "benefit": { "type": "TEXT_ONLY", "isComputed": false, "applied": false, "value": null },
  "textBenefits": [
    { "text": "Zero making charges on gold ornaments purchased at maturity. Wastage capped at 8%.", "displayLabel": "Making charges waived", "note": "Apply this manually at the counter. It is not calculated in the settlement value below." }
  ],
  "computation": { "finalValue": { "amountPaise": 5500000, "amountDisplay": "₹55,000" } }
}
```

The `note` matters — the redemption screen must make it unmistakable that a text benefit is honoured by the staff member, not by the software.

### Premature closure preview
```json
{
  "success": true,
  "data": {
    "type": "PREMATURE_CLOSURE",
    "eligible": true,
    "blockers": [],
    "scheme": { "id": "sch_01HQ8Z...", "status": "ACTIVE", "monthsCompleted": 5, "lockInMonths": 3, "lockInMet": true },
    "computation": {
      "lines": [
        { "key": "TOTAL_PAID", "label": "Total paid (5 installments)", "amount": { "amountPaise": 2500000, "amountDisplay": "₹25,000" }, "sign": "+" },
        { "key": "BENEFIT", "label": "12th installment free — forfeited", "amount": { "amountPaise": 0, "amountDisplay": "₹0" }, "sign": "+", "forfeited": true, "forfeitReason": "Benefit applies only on maturity" },
        { "key": "PENALTY", "label": "Premature closure charge (2% of amount paid)", "amount": { "amountPaise": 50000, "amountDisplay": "₹500" }, "sign": "-" }
      ],
      "finalValue": { "amountPaise": 2450000, "amountDisplay": "₹24,500" },
      "goldWeight": null
    },
    "penalty": { "mode": "PERCENT_OF_PAID", "value": 2, "amount": { "amountPaise": 50000, "amountDisplay": "₹500" }, "benefitTreatment": "FORFEIT" },
    "allowedModes": [ { "mode": "CASH", "label": "Cash payout", "available": true }, { "mode": "GOLD_HANDOVER", "label": "Take as gold", "available": true }, { "mode": "PURCHASE_ADJUSTMENT", "label": "Adjust against purchase", "available": true } ],
    "approvalRequired": true,
    "warningText": "Closing early forfeits the maturity benefit and attracts a 2% charge. This cannot be undone."
  }
}
```

**Not eligible** — lock-in unmet:
```json
{
  "success": true,
  "data": {
    "type": "PREMATURE_CLOSURE",
    "eligible": false,
    "blockers": [
      { "code": "LOCK_IN_NOT_MET", "message": "This scheme has a 3-month lock-in. It can be closed from 14 Dec 2026.", "eligibleFrom": "2026-12-14", "monthsCompleted": 1, "lockInMonths": 3 }
    ]
  }
}
```

Zero-payment cancellation is a legitimate case and produces a zero settlement with `blockers: []` and `finalValue: ₹0`.

---

## 3. Initiate redemption

**`POST /admin/schemes/:schemeId/redeem`**

Headers: `X-Idempotency-Key`

```json
{
  "mode": "PURCHASE_ADJUSTMENT",
  "modeDetails": {
    "billNumber": "SG/INV/2026/8841",
    "billDate": "2026-09-14",
    "billAmountPaise": 8500000,
    "itemDescription": "22K gold necklace, 14.2 g",
    "adjustedAmountPaise": 6000000
  },
  "textBenefitsHonoured": [],
  "remarks": "Customer purchasing today",
  "expectedFinalValuePaise": 6000000
}
```

`expectedFinalValuePaise` is a safety check — if the server's recomputation differs (a gold rate moved between preview and submit), the call fails with `422 SETTLEMENT_VALUE_CHANGED` and returns the fresh computation so staff re-confirm rather than committing a stale figure.

### Mode-specific `modeDetails`

| Mode | Required fields |
|---|---|
| `CASH` | `payoutMode` (`CASH` \| `BANK_TRANSFER` \| `UPI`), `reference` when not cash |
| `GOLD_HANDOVER` | `weightMg`, `ratePerGramPaise`, `itemDescription`, `purity` |
| `PURCHASE_ADJUSTMENT` | `billNumber`, `billDate`, `billAmountPaise`, `adjustedAmountPaise`, `itemDescription` |
| `TRANSFER_TO_SCHEME` | `targetPlanId`, `installmentAmountPaise`, `firstInstallmentMode` |

For `PURCHASE_ADJUSTMENT`, `adjustedAmountPaise` may be less than `finalValue` — the balance is paid out per `balanceHandling` (`CASH` | `RETAIN_AS_CREDIT` is **not** offered in V1, so it's always `CASH`).

**Response — approval required**
```json
{
  "success": true,
  "data": {
    "id": "rdm_01HQ8Z...",
    "redemptionNumber": "SG/RDM/2026/00142",
    "type": "MATURITY_REDEMPTION",
    "status": "PENDING_APPROVAL",
    "scheme": { "id": "sch_01HQ5Z...", "schemeNumber": "MGR/DH11/2025/00088" },
    "customer": { "id": "cus_01HQ5Z...", "name": "Lakshmi Nair" },
    "mode": "PURCHASE_ADJUSTMENT",
    "settlement": {
      "totalPaid": { "amountPaise": 5500000, "amountDisplay": "₹55,000" },
      "benefit": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "penalty": { "amountPaise": 0, "amountDisplay": "₹0" },
      "finalValue": { "amountPaise": 6000000, "amountDisplay": "₹60,000" },
      "goldWeight": null
    },
    "initiatedBy": { "id": "usr_01HQ8...", "name": "Rahul Nair" },
    "initiatedAt": "2026-09-14T10:30:00+05:30",
    "approvalRequired": true,
    "pendingWith": "TENANT_ADMIN",
    "schemeStatus": "MATURED",
    "auditEventId": "aud_01RDM..."
  }
}
```

The scheme is **not** closed yet. It stays `MATURED` with `hasPendingRedemption: true`, which blocks further payments but leaves the record intact if the approval is rejected.

**Response — no approval required** (`redemptionApprovalRequired: false`): `status` comes back `COMPLETED`, scheme moves to `REDEEMED`, ledger entries posted, closure receipt generated and the `SCHEME_CLOSED` message queued — all in one transaction.

---

## 4. Premature closure

**`POST /admin/schemes/:schemeId/close-premature`**

```json
{
  "mode": "CASH",
  "modeDetails": { "payoutMode": "CASH", "reference": null },
  "reason": "CUSTOMER_REQUEST",
  "remarks": "Customer relocating, requested closure",
  "acknowledgePenalty": true,
  "acknowledgeBenefitForfeit": true,
  "expectedFinalValuePaise": 2450000
}
```

`reason` ∈ `CUSTOMER_REQUEST` | `FINANCIAL_DIFFICULTY` | `RELOCATION` | `PROLONGED_DEFAULT` | `DECEASED` | `DUPLICATE_ENROLMENT` | `ENROLMENT_ERROR` | `OTHER`.

`acknowledgePenalty` and `acknowledgeBenefitForfeit` must both be `true` when applicable — the API refuses the call otherwise, which forces the UI to show the consequences explicitly rather than burying them.

A scheme with zero payments and `reason: "ENROLMENT_ERROR"` skips the penalty entirely and settles at zero — that's the cancellation case.

Same approval flow and same response shape as redemption, with `type: "PREMATURE_CLOSURE"`.

---

## 5. Approve / reject / complete

**`POST /admin/redemptions/:redemptionId/approve`**
```json
{ "remarks": "Verified passbook and ID", "expectedVersion": 1 }
```
```json
{
  "success": true,
  "data": {
    "id": "rdm_01HQ8Z...",
    "status": "APPROVED",
    "approvedBy": { "id": "usr_01HQ7...", "name": "Mahesh Kumar" },
    "approvedAt": "2026-09-14T11:00:00+05:30",
    "settlementRecomputed": false,
    "nextAction": "COMPLETE",
    "message": "Approved. Hand over the value and mark as completed.",
    "auditEventId": "aud_01RDM..."
  }
}
```

If the gold rate moved between initiation and approval on a gold scheme, the settlement is recomputed and `settlementRecomputed: true` with both figures returned, so the approver sees what changed.

**`POST /admin/redemptions/:redemptionId/reject`**
```json
{ "reason": "Customer did not bring the original passbook", "remarks": null }
```
Scheme returns to its prior status, `hasPendingRedemption` cleared, nothing posted to the ledger.

**`POST /admin/redemptions/:redemptionId/complete`**
```json
{
  "handoverConfirmed": true,
  "handoverRemarks": "Necklace handed over, bill SG/INV/2026/8841",
  "textBenefitsHonoured": [ { "text": "Zero making charges", "honoured": true } ]
}
```

This is the transaction that actually closes the scheme:
```json
{
  "success": true,
  "data": {
    "id": "rdm_01HQ8Z...",
    "redemptionNumber": "SG/RDM/2026/00142",
    "status": "COMPLETED",
    "completedAt": "2026-09-14T11:05:00+05:30",
    "completedBy": { "id": "usr_01HQ8...", "name": "Rahul Nair" },
    "scheme": { "id": "sch_01HQ5Z...", "status": "REDEEMED", "closedAt": "2026-09-14T11:05:00+05:30" },
    "ledgerEntries": [
      { "id": "led_01HQ9A...", "entryType": "BENEFIT_CREDIT", "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" } },
      { "id": "led_01HQ9B...", "entryType": "REDEMPTION_DEBIT", "amount": { "amountPaise": -6000000, "amountDisplay": "-₹60,000" } }
    ],
    "closureReceipt": { "url": "https://cdn.../closure/rdm_01HQ8Z.pdf", "number": "SG/RDM/2026/00142" },
    "messages": [ { "messageType": "SCHEME_CLOSED", "status": "QUEUED", "messageId": "msg_01HQ9A..." } ],
    "newScheme": null,
    "auditEventId": "aud_01RDM..."
  }
}
```

For `TRANSFER_TO_SCHEME`, `newScheme` carries the newly enrolled scheme and the transferred value posts as its opening credit — created in the same transaction so a transfer can never half-complete.

---

## 6. Customer-initiated redemption request

**`POST /app/schemes/:schemeId/redemption-request`**
```json
{ "preferredMode": "GOLD_HANDOVER", "preferredDate": "2026-09-20", "remarks": "Will visit MG Road branch" }
```
```json
{
  "success": true,
  "data": {
    "id": "rdm_01HQ9Z...",
    "status": "REQUESTED",
    "requestedAt": "2026-09-14T10:30:00+05:30",
    "preferredMode": "GOLD_HANDOVER",
    "message": "Your request has been sent to Sree Gold. Visit the MG Road branch with your passbook and ID.",
    "branch": { "name": "MG Road", "address": "42 MG Road, Kochi 682011", "contactNumber": "9846543211" },
    "auditEventId": "aud_01RDM..."
  }
}
```

A `REQUESTED` redemption carries no settlement figures and posts nothing. It appears in the portal's redemption queue for staff to convert into a real redemption. The customer is never shown an authoritative settlement value from a self-service request — only the preview.

---

## 7. Redemption list

**`GET /admin/redemptions`**

Query: `status`, `type`, `mode`, `branchId`, `from`, `to`, `q`, `pendingApprovalOnly=true`.

```json
{
  "success": true,
  "data": [
    {
      "id": "rdm_01HQ8Z...",
      "redemptionNumber": "SG/RDM/2026/00142",
      "type": "MATURITY_REDEMPTION",
      "status": "PENDING_APPROVAL",
      "customer": { "id": "cus_01HQ5Z...", "name": "Lakshmi Nair", "mobile": "9847XXXX02", "passbookNumber": "MGR/2025/00071" },
      "scheme": { "id": "sch_01HQ5Z...", "schemeNumber": "MGR/DH11/2025/00088", "planName": "Dhanam 11" },
      "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
      "mode": "PURCHASE_ADJUSTMENT",
      "finalValue": { "amountPaise": 6000000, "amountDisplay": "₹60,000" },
      "goldWeight": null,
      "initiatedBy": { "id": "usr_01HQ8...", "name": "Rahul Nair" },
      "initiatedAt": "2026-09-14T10:30:00+05:30",
      "ageHours": 2,
      "actions": { "canApprove": true, "canReject": true, "canComplete": false }
    }
  ],
  "meta": {
    "nextCursor": null,
    "hasMore": false,
    "summary": {
      "count": 34,
      "pendingApproval": 5,
      "completed": 27,
      "rejected": 2,
      "totalSettled": { "amountPaise": 164000000, "amountDisplay": "₹16,40,000" },
      "totalGoldHandedOver": { "weightMg": 128400, "weightDisplay": "128.400 g" },
      "byMode": [
        { "mode": "PURCHASE_ADJUSTMENT", "count": 18, "amount": { "amountPaise": 108000000, "amountDisplay": "₹10,80,000" } },
        { "mode": "CASH", "count": 7, "amount": { "amountPaise": 32000000, "amountDisplay": "₹3,20,000" } },
        { "mode": "GOLD_HANDOVER", "count": 2, "amount": { "amountPaise": 24000000, "amountDisplay": "₹2,40,000" } }
      ]
    }
  }
}
```

---

## 8. Maturity auto-marking

A nightly job marks schemes `MATURED` when either condition holds:

1. All installments are `PAID`, **or**
2. `maturityDate` has passed (regardless of pending installments)

Case 2 schemes carry `maturedWithPendingInstallments: true` and a `pendingSettlement` block showing what's short. The settlement preview surfaces the benefit as forfeited if eligibility isn't met.

```json
{
  "status": "MATURED",
  "maturedWithPendingInstallments": true,
  "pendingSettlement": {
    "installmentsPending": 2,
    "amountShort": { "amountPaise": 1000000, "amountDisplay": "₹10,000" },
    "benefitEligible": false,
    "benefitForfeitReason": "2 installments were not paid",
    "options": ["COLLECT_PENDING_THEN_REDEEM", "REDEEM_WITHOUT_BENEFIT", "CLOSE_PREMATURE"]
  }
}
```

Payments are still accepted on a `MATURED` scheme with pending installments — clearing them restores benefit eligibility if the plan allows. This is the one case where a matured scheme is still collectible.

There is **no redemption validity window and no lapsed-scheme handling** in V1. A matured scheme stays redeemable indefinitely.
