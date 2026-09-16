# 07 — Payments, Links, Webhooks, Receipts

One unified payment recording flow with a mode selector. **Receipt numbers are always issued by the system** — never entered by a user. Overpayment is blocked. Late gateway success is handled explicitly.

Every persisted single-entity payment, payment-link, intent, reversal or reconciliation mutation returns `data.auditEventId`. Webhook receipt acknowledgements and non-persisting provider status checks are excluded; the later asynchronous payment write is audited.

**Payment modes** (full list, labels and cash-in-hand impact in `00-conventions.md §12`):

| Manually recordable | Gateway only | Read-only legacy |
|---|---|---|
| `CASH`, `CARD`, `UPI`, `BANK_TRANSFER`, `CHEQUE` | `ONLINE_GATEWAY` | `LEGACY_ONLINE` |

Only `CASH` affects staff cash-in-hand. There are **no channel-specific forms** — no terminal ID, RRN, card network, last four, bank name, UTR type, provider field or payment-proof upload. A manual payment carries its mode plus an optional free-text `reference` and optional `remarks`, and nothing else.

---

## 1. Endpoints

| Method | Path | Phase | Permission |
|---|---|---|---|
| `POST` | `/admin/payments` | P1 | `payment.record` |
| `GET` | `/admin/payments` | P1 | `customer.read` |
| `GET` | `/admin/payments/pending` | P1 | `customer.read` |
| `GET` | `/admin/payments/late-success` | P1 | `customer.read` |
| `GET` | `/admin/payments/:paymentId` | P1 | `customer.read` |
| `POST` | `/admin/payments/:paymentId/reverse` | P1 | `payment.reverse` |
| `GET` | `/admin/payments/:paymentId/receipt` | P1 | `customer.read` |
| `GET` | `/admin/payments/:paymentId/passbook-image` | P1 | `customer.read` |
| `POST` | `/admin/payments/:paymentId/share-whatsapp` | P1 | `payment.record` |
| `POST` | `/admin/payment-links` | P1 | `payment.record` |
| `GET` | `/admin/payment-links` | P1 | `customer.read` |
| `POST` | `/admin/payment-links/:linkId/resend` | P1 | `payment.record` |
| `POST` | `/admin/payment-links/:linkId/cancel` | P1 | `payment.record` |
| `POST` | `/admin/payments/:paymentId/reconcile` | P1 | `payment.reverse` |
| `POST` | `/webhooks/phonepe/:tenantId` | P1 | signature |
| `GET` | `/public/pay/:linkToken` | P1 | public link landing |
| `POST` | `/public/pay/:linkToken/initiate` | P1 | public |

Staff app mirrors: `POST /staff/payments`, `POST /staff/payment-links`, `GET /staff/payments`.
Customer app uses `POST /app/schemes/:schemeId/pay` for fixed-date schemes and `POST /app/schemes/:schemeId/payment-intents` for flexible-average schemes.

Register the literal `/admin/payments/pending` and `/admin/payments/late-success` routes before `/admin/payments/:paymentId`, and cover both with routing tests so neither literal can be parsed as a payment id.

---

## 2. Record a payment

**`POST /admin/payments`** (and `/staff/payments`, identical)

Headers: `X-Idempotency-Key` **required**.

```json
{
  "schemeId": "sch_01HQ8Z...",
  "amountPaise": 500000,
  "mode": "UPI",
  "paidAt": "2026-09-14T10:30:00+05:30",
  "reference": "424873198221",
  "remarks": "Paid at MG Road counter",
  "targetInstallments": null,
  "targetCycle": null,
  "expectedPositionVersion": null,
  "sendWhatsappConfirmation": true
}
```

| Field | Required | Notes |
|---|:--:|---|
| `schemeId` | Yes | Active scheme visible to the caller |
| `amountPaise` | Yes | Must satisfy the authoritative payable quote |
| `mode` | Yes | One of the five manually recordable modes. `ONLINE_GATEWAY` and `LEGACY_ONLINE` are rejected. |
| `paidAt` | Yes | Cannot be in the future; cannot be more than 7 days back without `backdateReason` |
| `reference` | No | Free-form transaction/cheque reference, max 100 chars → `PAYMENT_REFERENCE_TOO_LONG` |
| `remarks` | No | Free-form staff note, max 500 chars → `PAYMENT_REMARKS_TOO_LONG` |
| `targetInstallments` | No | Fixed-date schemes only. Omit to auto-allocate oldest-first. |
| `targetCycle` | No | **Flexible-average schemes only.** `YYYY-MM`. Defaults to the current cycle. |
| `expectedPositionVersion` | Conditional | **Required for flexible-average schemes.** The `positionVersion` from the quote. |
| `sendWhatsappConfirmation` | No | Defaults to the tenant setting |

`reference` is optional for **every** mode including Cheque and Bank transfer. The UI may suggest one for non-cash payments but must never block submission when it is empty.

### Allocation rule

Money is always allocated **oldest pending installment first**. Any remainder cascades forward. The allocation is returned explicitly so staff can see what the payment covered.

### Validation order (fail fast, one error at a time)

1. Scheme exists, in caller's scope, status `ACTIVE` / `LOCKED` / `DEFAULTED` → else `SCHEME_NOT_ACTIVE`
2. Customer not blocked → else `FORBIDDEN`
3. Gold plan and rate set for today → else `GOLD_RATE_NOT_SET`
4. Amount within `payable-range` min/max → else `AMOUNT_BELOW_MINIMUM` / `AMOUNT_ABOVE_MAXIMUM`
5. Amount multiple check → `AMOUNT_NOT_MULTIPLE`
6. Amount ≤ remaining scheme value → else `OVERPAYMENT_BLOCKED`
7. Partial allowed if amount < installment → else `PARTIAL_PAYMENT_BLOCKED`
8. Target installments not already `PAID` → else `INSTALLMENT_ALREADY_PAID`

**Flexible-average schemes replace steps 4–8** with the position check:

4. `mode` is manually recordable → else `MANUAL_GATEWAY_PAYMENT_NOT_ALLOWED` / `PAYMENT_MODE_INVALID`
5. Cap is snapshotted → else `FLEXIBLE_PHASE_NOT_COMPLETE`
6. `expectedPositionVersion` matches the live position → else `PAYMENT_POSITION_CHANGED`
7. `targetCycle` resolves and is permitted (see `05 §4`) → else `FUTURE_CYCLE_PAYMENT_NOT_ALLOWED` / `CURRENT_CYCLE_INCOMPLETE` / `CYCLE_SEQUENCE_VIOLATION` / `ADVANCE_CYCLE_LIMIT_EXCEEDED`
8. No open intent reserves the allowance → else `PAYMENT_CONFIRMATION_PENDING`
9. `amountPaise` ≤ that cycle's `remainingThisCyclePaise` → else `CURRENT_CYCLE_CAP_REACHED`
10. `amountPaise` ≥ `minimumPaymentPaise`, unless the final-remainder exception applies
11. `amountPaise` is a multiple of `paymentIncrementPaise`, unless it is the exact final remainder

Quote validation and posting happen **atomically**. The server re-reads the position inside the transaction; it never trusts the quote alone.

**Response `201`**
```json
{
  "success": true,
  "data": {
    "id": "pay_01HQ8Z3K7M9P2R4T6V8X0Y",
    "receiptNumber": "SG/MGR/2026/001284",
    "scheme": { "id": "sch_01HQ8Z...", "schemeNumber": "MGR/DH11/2026/00318", "planName": "Dhanam 11" },
    "customer": { "id": "cus_01HQ8Z...", "name": "Anjali Menon", "mobile": "9847XXXX33", "passbookNumber": "MGR/2026/00412" },
    "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
    "mode": "UPI",
    "modeLabel": "UPI",
    "reference": "424873198221",
    "remarks": "Paid at MG Road counter",
    "status": "SUCCESS",
    "paidAt": "2026-09-14T10:30:00+05:30",
    "source": "STAFF_APP",
    "collectedBy": { "id": "usr_01HQ8...", "name": "Rahul Nair" },
    "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },

    "allocation": [
      { "installmentNumber": 5, "dueDate": "2026-10-10", "allocated": { "amountPaise": 500000, "amountDisplay": "₹5,000" }, "installmentStatusAfter": "PAID" }
    ],

    "goldCredited": { "weightMg": 689, "weightDisplay": "0.689 g" },
    "rateApplied": { "ratePerGramPaise": 725000, "ratePerGramDisplay": "₹7,250" },

    "schemeAfter": {
      "status": "ACTIVE",
      "installmentsPaid": 5,
      "installmentsTotal": 11,
      "percentComplete": 45.5,
      "totalPaid": { "amountPaise": 2500000, "amountDisplay": "₹25,000" },
      "goldAccrued": { "weightMg": 3450, "weightDisplay": "3.450 g" },
      "nextDue": { "installmentNumber": 6, "dueDate": "2026-11-10", "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" } },
      "isMatured": false
    },

    "receiptUrl": "https://cdn.../receipt/pay_01HQ8.pdf",
    "passbookImage": {
      "status": "GENERATING",
      "url": null,
      "pollUrl": "/api/v1/admin/payments/pay_01HQ8Z.../passbook-image"
    },

    "cashInHandAfter": null,

    "messages": [
      { "messageType": "PAYMENT_SUCCESS", "status": "QUEUED", "messageId": "msg_01HQ8...", "willAttachPassbookImage": true }
    ],

    "auditEventId": "aud_01PAY..."
  }
}
```

`cashInHandAfter` is populated **only** when `mode` is `CASH` and the caller is a staff/branch user. For `CARD`, `UPI`, `BANK_TRANSFER`, `CHEQUE` and `ONLINE_GATEWAY` it is `null` — those modes never move cash-in-hand.

### Flexible-average response addition

A payment on a flexible-average scheme replaces `allocation` with the post-payment position:

```json
{
  "success": true,
  "data": {
    "id": "pay_01FINAL...",
    "receiptNumber": "SG/MGR/2026/001284",
    "mode": "UPI",
    "modeLabel": "UPI",
    "reference": "424873198221",
    "amount": { "amountPaise": 60000, "amountDisplay": "₹600" },
    "targetCycle": "2026-09",
    "cycleNumber": 8,
    "isAdvanceCycle": false,
    "positionAfterPayment": {
      "positionVersion": 8,
      "currentCycleCapPaise": 250000,
      "confirmedThisCyclePaise": 250000,
      "pendingReservedPaise": 0,
      "remainingThisCyclePaise": 0,
      "cycleFullyPaid": true,
      "nextCycleAction": { "available": false, "blockedReason": { "code": "FUTURE_CYCLE_PAYMENT_NOT_ALLOWED" } }
    },
    "auditEventId": "aud_01PAY..."
  }
}
```

### Stale quote

```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_POSITION_CHANGED",
    "message": "The payable amount changed because another payment was recorded.",
    "details": {
      "currentPositionVersion": 8,
      "maximumPayableNowPaise": 20000,
      "maximumPayableNowDisplay": "₹200"
    }
  }
}
```

The client must refresh the position and ask the user to confirm the new amount. **It must never silently reduce the submitted amount.**

**Overpayment failure**
```json
{
  "success": false,
  "error": {
    "code": "OVERPAYMENT_BLOCKED",
    "message": "This scheme has ₹15,000 remaining. You cannot pay more than that.",
    "details": { "remainingPaise": 1500000, "attemptedPaise": 2000000, "maxAllowedPaise": 1500000 }
  }
}
```

**Gateway mode rejected**
```json
{
  "success": false,
  "error": {
    "code": "MANUAL_GATEWAY_PAYMENT_NOT_ALLOWED",
    "message": "Online gateway payments can only be confirmed by the payment provider."
  }
}
```

`ONLINE_GATEWAY` payments are created **only** from an authenticated provider callback (§5) or a confirmed payment intent (§3.1). No staff or admin action can mark a payment as gateway-confirmed. `LEGACY_ONLINE` is rejected on every write with `PAYMENT_MODE_INVALID`.

**Cap reached**
```json
{
  "success": false,
  "error": {
    "code": "CURRENT_CYCLE_CAP_REACHED",
    "message": "This month's allowance of ₹2,500 is fully paid.",
    "details": { "targetCycle": "2026-09", "currentCycleCapPaise": 250000, "confirmedThisCyclePaise": 250000, "remainingThisCyclePaise": 0, "positionVersion": 8 }
  }
}
```

---

## 2.1 Storage and migration

The Payment record needs only these channel-related fields:

```json
{ "mode": "UPI", "reference": "424873198221", "remarks": "Paid at MG Road counter" }
```

Do **not** add `channelDetails`, POS-terminal fields, card details, bank details, proof arrays or channel-verification state.

Indexes:

```javascript
{ tenantId: 1, mode: 1, status: 1, paidAt: -1 }
{ tenantId: 1, reference: 1 }                      // non-unique, sparse
{ tenantId: 1, branchId: 1, status: 1, mode: 1, paidAt: -1 }
{ tenantId: 1, status: 1, source: 1, paidAt: -1 }
{ tenantId: 1, schemeId: 1, targetCycle: 1, status: 1 }
```

The reference index is non-unique and sparse. A transaction reference is optional operational text, never an idempotency key.

**Migrating existing `ONLINE` records:**

| Historical record | New `mode` | Writable |
|---|---|:--:|
| Has an authenticated gateway order/payment relation | `ONLINE_GATEWAY` | Yes, by gateway only |
| No gateway relation | `LEGACY_ONLINE` | **No** |

`LEGACY_ONLINE` is labelled "Legacy online" and is kept as its own row in historical `byMode` results so pre-migration totals still reconcile. Both `LEGACY_ONLINE` and the deprecated `ONLINE` value are rejected on new writes with `PAYMENT_MODE_INVALID`.

---

## 2.2 Payment intents (flexible-average online payments)

An online attempt on a flexible-average scheme must **reserve** part of the cycle allowance, so two devices cannot both spend the same ₹600.

| Method | Path | Phase | Permission |
|---|---|---|---|
| `POST` | `/app/schemes/:schemeId/payment-intents` | P1 | customer |
| `GET` | `/app/payment-intents/:intentId` | P1 | customer |
| `POST` | `/app/payment-intents/:intentId/cancel` | P1 | customer |
| `GET` | `/admin/schemes/:schemeId/payment-intents` | P1 | `customer.read` |

**`POST /app/schemes/:schemeId/payment-intents`** — headers: `X-Idempotency-Key`

```json
{
  "amountPaise": 60000,
  "targetCycle": "2026-09",
  "expectedPositionVersion": 7
}
```

```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pint_01...",
    "status": "PENDING",
    "amount": { "amountPaise": 60000, "amountDisplay": "₹600" },
    "targetCycle": "2026-09",
    "expiresAt": "2026-09-14T14:00:00+05:30",
    "paymentUrl": "https://pay.<domain>/pl_8f2a4c601b3d",
    "statusPollUrl": "/api/v1/app/payment-intents/pint_01...",
    "position": {
      "positionVersion": 8,
      "confirmedThisCyclePaise": 190000,
      "pendingReservedPaise": 60000,
      "remainingThisCyclePaise": 0
    },
    "auditEventId": "aud_01INT..."
  }
}
```

Lifecycle:

```
PENDING ──→ SUCCEEDED   (verified gateway callback → creates an ONLINE_GATEWAY Payment)
   ├──────→ FAILED      (gateway decline → releases the reservation)
   ├──────→ EXPIRED     (TTL lapses → releases the reservation)
   └──────→ CANCELLED   (customer abandons → releases the reservation)
```

Rules:

- Creating an intent increments `positionVersion` and reduces `remainingThisCyclePaise`.
- **Only a verified gateway success creates an `ONLINE_GATEWAY` Payment.** The intent itself is never a payment.
- Release on failure, expiry or cancellation increments `positionVersion` again and restores the allowance.
- Default TTL is 30 minutes. A reaper job expires stale intents and releases their reservations.
- While an intent is open, a manual payment for the same cycle that would exceed the unreserved remainder fails with `PAYMENT_CONFIRMATION_PENDING`, listing the blocking intent.
- Intents apply to flexible-average schemes only. Fixed-date schemes continue to use ordinary payment links (§3).

**`GET /app/payment-intents/:intentId`** is the only intent status endpoint. It returns the current intent status, payment details when `SUCCEEDED`, the current position, and `retryAfterSeconds` while pending. There is no `/status` suffix route.

**`POST /app/payment-intents/:intentId/cancel`** — headers: `X-Idempotency-Key`

```json
{ "expectedPositionVersion": 8 }
```

```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pint_01...",
    "status": "CANCELLED",
    "position": { "positionVersion": 9, "remainingThisCyclePaise": 60000 },
    "auditEventId": "aud_01INT..."
  }
}
```

Cancellation is allowed only from `PENDING`. It releases the reservation atomically; a late verified gateway success is still handled by the late-success rules rather than discarded.

---

## 3. Payment links

**`POST /admin/payment-links`**

Headers: `X-Idempotency-Key`

```json
{
  "schemeId": "sch_01HQ8Z...",
  "amountPaise": 500000,
  "installmentNumbers": [5],
  "targetCycle": null,
  "expectedPositionVersion": null,
  "expiresInMinutes": 1440,
  "deliver": { "whatsapp": true, "push": true },
  "note": null
}
```

- `amountPaise` must satisfy the same payable-range validation as a direct payment.
- The example is fixed-date: `installmentNumbers` may be supplied or omitted for auto-allocation, and cycle/version fields are `null`.
- For a flexible-average scheme, `installmentNumbers` is forbidden and both `targetCycle` and `expectedPositionVersion` are required. The link and a `PENDING` PaymentIntent reservation are created atomically; the response additionally returns `paymentIntentId`, `position`, and `statusPollUrl` using the canonical intent endpoint.
- A flexible-average link therefore consumes the target cycle's unreserved allowance immediately. Failure, expiry or cancellation releases it and advances `positionVersion`, exactly as in §2.2.
- A link for an installment that already has an open link returns the existing link rather than creating a duplicate (`meta.reusedExisting: true`).

**Response `201`**
```json
{
  "success": true,
  "data": {
    "id": "plnk_01HQ8Z...",
    "token": "pl_8f2a4c601b3d",
    "shortUrl": "https://pay.<domain>/pl_8f2a4c601b3d",
    "gatewayUrl": "https://mercury.phonepe.com/transact/pg?token=...",
    "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
    "scheme": { "id": "sch_01HQ8Z...", "schemeNumber": "MGR/DH11/2026/00318" },
    "customer": { "id": "cus_01HQ8Z...", "name": "Anjali Menon", "mobile": "9847XXXX33" },
    "installmentNumbers": [5],
    "status": "CREATED",
    "expiresAt": "2026-09-15T10:30:00+05:30",
    "delivery": [
      { "channel": "WHATSAPP", "status": "QUEUED", "messageId": "msg_01HQ8..." },
      { "channel": "PUSH", "status": "QUEUED" }
    ],
    "createdAt": "2026-09-14T10:30:00+05:30",
    "auditEventId": "aud_01LNK..."
  },
  "meta": { "reusedExisting": false }
}
```

`shortUrl` is what goes into the WhatsApp template's URL button variable. It resolves server-side to the gateway, which lets us track `OPENED` and regenerate an expired gateway session without reissuing the customer-facing link.

**Link lifecycle**

```
CREATED ──→ SENT ──→ OPENED ──→ PAID
   │          │         │
   └──────────┴─────────┴──→ EXPIRED
   │
   └──→ CANCELLED
```

`EXPIRED` is **not terminal for money**. A gateway success arriving after expiry is accepted — see §6.

---

## 4. Public payment landing

**`GET /public/pay/:linkToken`** — unauthenticated, rendered as a branded page.

```json
{
  "success": true,
  "data": {
    "status": "CREATED",
    "jeweller": { "displayName": "Sree Gold", "logoUrl": "https://cdn.../logo.png", "branding": { "primaryColor": "#7B1E1E" }, "supportNumber": "9846543211" },
    "customer": { "name": "Anjali Menon", "maskedMobile": "9847XXXX33" },
    "scheme": { "schemeNumber": "MGR/DH11/2026/00318", "planName": "Dhanam 11" },
    "installmentLabel": "Installment 5 of 11",
    "dueDate": "2026-10-10",
    "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
    "expiresAt": "2026-09-15T10:30:00+05:30",
    "canPay": true
  }
}
```

Expired:
```json
{
  "success": true,
  "data": {
    "status": "EXPIRED",
    "canPay": false,
    "message": "This payment link has expired. Please contact Sree Gold for a fresh link.",
    "supportNumber": "9846543211",
    "jeweller": { "displayName": "Sree Gold", "logoUrl": "https://cdn.../logo.png" }
  }
}
```

**`POST /public/pay/:linkToken/initiate`**
```json
{ "redirectUrl": "https://pay.<domain>/pl_8f2a4c601b3d/done" }
```
```json
{
  "success": true,
  "data": {
    "gatewayUrl": "https://mercury.phonepe.com/transact/pg?token=...",
    "merchantTransactionId": "SREEGOLD_PAY_01HQ8Z3K7M",
    "expiresAt": "2026-09-14T11:00:00+05:30"
  }
}
```

**`GET /public/pay/:linkToken/status`** — polled by the return page after redirect.
```json
{
  "success": true,
  "data": {
    "status": "PAID",
    "paymentId": "pay_01HQ8Z...",
    "receiptNumber": "SG/MGR/2026/001284",
    "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
    "receiptUrl": "https://cdn.../receipt/pay_01HQ8.pdf",
    "message": "Payment successful. Your receipt has been sent on WhatsApp."
  }
}
```

---

## 5. PhonePe webhook

**`POST /webhooks/phonepe/:tenantId`**

Headers: `X-VERIFY: <sha256hash>###<saltIndex>`

Body (base64-wrapped, as PhonePe sends it):
```json
{ "response": "eyJzdWNjZXNzIjp0cnVlLCJjb2RlIjoiUEFZTUVOVF9TVUNDRVNTIi..." }
```

Decoded:
```json
{
  "success": true,
  "code": "PAYMENT_SUCCESS",
  "message": "Your payment is successful.",
  "data": {
    "merchantId": "SREEGOLDONLINE",
    "merchantTransactionId": "SREEGOLD_PAY_01HQ8Z3K7M",
    "transactionId": "T2409141030123456789",
    "amount": 500000,
    "state": "COMPLETED",
    "responseCode": "SUCCESS",
    "paymentInstrument": { "type": "UPI", "utr": "426823145879" }
  }
}
```

**Handler contract**

1. Read raw body, verify `X-VERIFY` against the tenant's salt. Failure → `401`, persisted to `webhook_events` as `SIGNATURE_FAILED`, surfaced in the alert centre.
2. Persist the event to `webhook_events` keyed by `(tenantId, transactionId)`. Duplicate → `200`, dropped.
3. Enqueue for async processing. Return `200` immediately.

Always `200` once persisted:
```json
{ "success": true, "data": { "received": true, "eventId": "whe_01HQ8Z..." } }
```

**Async processing**, inside one transaction:
- Resolve the link by `merchantTransactionId`
- Assert gateway amount equals link amount → mismatch parks it as `AMOUNT_MISMATCH` for manual review, never auto-posts
- Post the payment, issue the receipt number, write the ledger entry, update installment state, advance counters
- Queue the `PAYMENT_SUCCESS` message and the passbook image render
- Mark the link `PAID`

`PAYMENT_ERROR` / `PAYMENT_DECLINED` → link stays open (if unexpired), the pending payment row is marked `FAILED`, no ledger entry is created.

---

## 6. Late-success handling

The case the requirements called out: a UPI payment where the link expired or the user saw a failure, but the gateway settles it afterwards.

**Detection paths**
1. Webhook arrives with `PAYMENT_SUCCESS` for a link in `EXPIRED` or `CANCELLED` state.
2. The reconciliation job polls PhonePe's status API for every link that ended `EXPIRED` or `FAILED` in the last 72 hours and finds `COMPLETED`.

**Behaviour** — the money is real, so it is always accepted:
- Payment posted normally with a real receipt number.
- Flagged `isLateSuccess: true` with `lateSuccessDetectedVia: "WEBHOOK" | "RECONCILIATION_JOB"` and the delay recorded.
- If the same installment was meanwhile paid in cash, the late payment is **not** force-allocated to it — it cascades to the next pending installment. If nothing is pending, it is held as `UNALLOCATED_PENDING_REVIEW` and raised in the alert centre, because auto-refunding is not something software should decide.
- `PAYMENT_SUCCESS` message dispatched.
- Row appears in the late-success queue.

**`GET /admin/payments/late-success`**
```json
{
  "success": true,
  "data": [
    {
      "id": "pay_01HQ9Z...",
      "receiptNumber": "SG/MGR/2026/001299",
      "customer": { "id": "cus_01HQ8Z...", "name": "Anjali Menon", "mobile": "9847XXXX33" },
      "scheme": { "id": "sch_01HQ8Z...", "schemeNumber": "MGR/DH11/2026/00318" },
      "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "linkStatusAtSuccess": "EXPIRED",
      "gatewayCompletedAt": "2026-09-14T23:52:00+05:30",
      "postedAt": "2026-09-15T06:00:12+05:30",
      "delayMinutes": 368,
      "detectedVia": "RECONCILIATION_JOB",
      "allocation": [ { "installmentNumber": 6, "allocated": { "amountPaise": 500000, "amountDisplay": "₹5,000" } } ],
      "requiresReview": false,
      "reviewReason": null,
      "utr": "426823145879"
    },
    {
      "id": "pay_01HQ9Y...",
      "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "requiresReview": true,
      "reviewReason": "DUPLICATE_INSTALLMENT_ALREADY_PAID_IN_CASH",
      "allocation": [],
      "status": "UNALLOCATED_PENDING_REVIEW",
      "suggestedActions": ["ALLOCATE_TO_NEXT_INSTALLMENT", "REVERSE_AND_REFUND"]
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false, "summary": { "total": 2, "requiringReview": 1 } }
}
```

**`POST /admin/payments/:paymentId/reconcile`**
```json
{ "action": "ALLOCATE_TO_NEXT_INSTALLMENT", "remarks": "Customer confirmed on call" }
```
`action` ∈ `ALLOCATE_TO_NEXT_INSTALLMENT` | `ALLOCATE_TO_INSTALLMENTS` (with `installmentNumbers`) | `REVERSE_AND_REFUND` | `MARK_RESOLVED`.

---

## 7. Pending payments queue

**`GET /admin/payments/pending`** — online payments initiated but not confirmed.

```json
{
  "success": true,
  "data": [
    {
      "id": "pay_01HQ9X...",
      "customer": { "id": "cus_01HQ8Z...", "name": "Anjali Menon" },
      "scheme": { "schemeNumber": "MGR/DH11/2026/00318" },
      "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "status": "PENDING",
      "initiatedAt": "2026-09-14T10:28:00+05:30",
      "ageMinutes": 4,
      "merchantTransactionId": "SREEGOLD_PAY_01HQ8Z3K7M",
      "lastPolledAt": "2026-09-14T10:31:00+05:30",
      "pollAttempts": 2,
      "canPollNow": true
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false }
}
```

`POST /admin/payments/:paymentId/poll-status` forces an immediate gateway status check.

**Automatic polling schedule** for a pending payment: 20s, 40s, 1m, 2m, 5m, 10m, 20m, 30m, then every hour to 24h, then hourly against the reconciliation job to 72h. After 72h it is marked `FAILED` and moved out of the queue.

---

## 8. Reversal

**`POST /admin/payments/:paymentId/reverse`**

```json
{
  "reason": "CHEQUE_BOUNCED",
  "remarks": "Cheque 442891 returned by bank on 21 Sep",
  "notifyCustomer": true
}
```

`reason` ∈ `CHEQUE_BOUNCED` | `DUPLICATE_ENTRY` | `WRONG_CUSTOMER` | `WRONG_AMOUNT` | `CUSTOMER_REQUEST` | `GATEWAY_REFUND` | `OTHER`.

Rules:
- Only within `paymentReversalWindowHours` → else `REVERSAL_NOT_ALLOWED`
- Requires `payment.reverse`
- Cannot reverse a payment on a `REDEEMED` or `CLOSED_PREMATURE` scheme
- Cannot reverse an already-reversed payment
- Cash reversals **increase** the collecting staff's cash-in-hand back, unless already handed over and accepted — in which case the reversal creates a negative adjustment row visible in the cash module rather than silently rewriting a settled handover

The original ledger entry is never mutated. A `REVERSAL` entry is appended.

```json
{
  "success": true,
  "data": {
    "reversalId": "rev_01HQ9Z...",
    "originalPayment": { "id": "pay_01HQ8...", "receiptNumber": "SG/MGR/2026/001284", "status": "REVERSED" },
    "ledgerEntryId": "led_01HQ9Z...",
    "schemeAfter": {
      "installmentsPaid": 4,
      "totalPaid": { "amountPaise": 2000000, "amountDisplay": "₹20,000" },
      "goldAccrued": { "weightMg": 2761, "weightDisplay": "2.761 g" },
      "affectedInstallments": [ { "installmentNumber": 5, "statusAfter": "OVERDUE" } ]
    },
    "cashAdjustment": { "staffId": "usr_01HQ8...", "amountPaise": -500000, "appliedTo": "CASH_IN_HAND" },
    "auditEventId": "aud_01REV..."
  }
}
```

---

## 9. Receipt & passbook image

### Receipt
**`GET /admin/payments/:paymentId/receipt`**
```json
{
  "success": true,
  "data": {
    "receiptNumber": "SG/MGR/2026/001284",
    "url": "https://cdn.../receipt/pay_01HQ8.pdf",
    "expiresAt": "2026-09-14T11:15:00+05:30",
    "generatedAt": "2026-09-14T10:30:05+05:30"
  }
}
```

### Passbook image

Rendered server-side as a PNG after every successful payment and attached as the **header media** of the `PAYMENT_SUCCESS` WhatsApp template.

**`GET /admin/payments/:paymentId/passbook-image`**
```json
{
  "success": true,
  "data": {
    "status": "READY",
    "url": "https://cdn.../passbook/pay_01HQ8.png",
    "width": 1080,
    "height": 1350,
    "expiresAt": "2026-09-14T11:15:00+05:30",
    "generatedAt": "2026-09-14T10:30:07+05:30",
    "regenerateAvailable": true
  }
}
```

`status` ∈ `GENERATING` | `READY` | `FAILED`. When `GENERATING`, the client polls this endpoint. When `FAILED`, the WhatsApp message is still sent — without the image header, using a text-only fallback template — so a rendering bug never blocks a payment confirmation.

**Image content** (what the designer needs to lay out — 1080×1350, tenant-branded):

- Header: tenant logo, display name, branch name
- Customer name, passbook number
- Scheme number, plan display name
- This payment: amount, date, receipt number, mode
- For gold plans: rate applied, grams credited
- Progress: "Installment 5 of 11 paid" with a progress bar; for a flexible free window, "Month 4 of 6 — ₹24,000 paid so far"
- Totals: total paid, total grams accrued, next due date and amount
- Footer: support number, "This is a computer-generated passbook entry"

`POST /admin/payments/:paymentId/passbook-image/regenerate` re-renders (used after a branding change).

### Share to WhatsApp
**`POST /admin/payments/:paymentId/share-whatsapp`**
```json
{ "include": ["PASSBOOK_IMAGE"], "toMobile": null }
```
`toMobile` defaults to the customer's registered number. Passing a different number requires `customer.read.pii` and is audited.

---

## 10. Payment list

**`GET /admin/payments`**

| Query | Values |
|---|---|
| `q` | Receipt number, customer name, mobile, scheme number, UTR |
| `schemeId`, `customerId`, `branchId`, `collectedByStaffId` | |
| `mode` | Repeatable |
| `status` | `SUCCESS` \| `PENDING` \| `FAILED` \| `REVERSED` |
| `source` | `PORTAL` \| `STAFF_APP` \| `CUSTOMER_APP` \| `WEBHOOK` |
| `isLateSuccess` | `true` \| `false` |
| `from` / `to` | Paid date range |
| `minAmountPaise` / `maxAmountPaise` | |
| `sort` | `paidAt:desc` (default), `amount:desc` |

```json
{
  "success": true,
  "data": [
    {
      "id": "pay_01HQ8Z...",
      "receiptNumber": "SG/MGR/2026/001284",
      "paidAt": "2026-09-14T10:30:00+05:30",
      "customer": { "id": "cus_01HQ8Z...", "name": "Anjali Menon", "mobile": "9847XXXX33", "passbookNumber": "MGR/2026/00412" },
      "scheme": { "id": "sch_01HQ8Z...", "schemeNumber": "MGR/DH11/2026/00318", "planName": "Dhanam 11" },
      "installmentLabel": "Installment 5",
      "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "goldCredited": { "weightMg": 689, "weightDisplay": "0.689 g" },
      "mode": "CASH",
      "status": "SUCCESS",
      "source": "STAFF_APP",
      "collectedBy": { "id": "usr_01HQ8...", "name": "Rahul Nair" },
      "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
      "isLateSuccess": false,
      "isReversed": false
    }
  ],
  "meta": {
    "nextCursor": "eyJpZCI6...",
    "hasMore": true,
    "summary": {
      "count": 184,
      "successfulCount": 171,
      "pendingCount": 6,
      "failedCount": 4,
      "reversedCount": 3,
      "totalAmount": { "amountPaise": 94000000, "amountDisplay": "₹9,40,000" },
      "successfulAmount": { "amountPaise": 88400000, "amountDisplay": "₹8,84,000" },
      "reversedAmount": { "amountPaise": 1500000, "amountDisplay": "₹15,000" },
      "averageSuccessfulPayment": { "amountPaise": 516959, "amountDisplay": "₹5,170" },
      "byMode": [
        { "mode": "CASH", "label": "Cash", "count": 72, "amount": { "amountPaise": 35200000, "amountDisplay": "₹3,52,000" } },
        { "mode": "CARD", "label": "Card / POS", "count": 21, "amount": { "amountPaise": 10400000, "amountDisplay": "₹1,04,000" } },
        { "mode": "UPI", "label": "UPI", "count": 58, "amount": { "amountPaise": 28400000, "amountDisplay": "₹2,84,000" } },
        { "mode": "BANK_TRANSFER", "label": "Bank transfer", "count": 12, "amount": { "amountPaise": 6800000, "amountDisplay": "₹68,000" } },
        { "mode": "CHEQUE", "label": "Cheque", "count": 13, "amount": { "amountPaise": 5600000, "amountDisplay": "₹56,000" } },
        { "mode": "ONLINE_GATEWAY", "label": "Online payment", "count": 8, "amount": { "amountPaise": 7600000, "amountDisplay": "₹76,000" } }
      ],
      "byStatus": [
        { "status": "SUCCESS", "count": 171, "amount": { "amountPaise": 88400000, "amountDisplay": "₹8,84,000" } },
        { "status": "PENDING", "count": 6, "amount": { "amountPaise": 3000000, "amountDisplay": "₹30,000" } },
        { "status": "FAILED", "count": 4, "amount": { "amountPaise": 1100000, "amountDisplay": "₹11,000" } },
        { "status": "REVERSED", "count": 3, "amount": { "amountPaise": 1500000, "amountDisplay": "₹15,000" } }
      ],
      "bySource": [
        { "source": "PORTAL", "count": 62, "amount": { "amountPaise": 31400000, "amountDisplay": "₹3,14,000" } },
        { "source": "STAFF_APP", "count": 81, "amount": { "amountPaise": 40200000, "amountDisplay": "₹4,02,000" } },
        { "source": "CUSTOMER_APP", "count": 28, "amount": { "amountPaise": 16800000, "amountDisplay": "₹1,68,000" } },
        { "source": "WEBHOOK", "count": 13, "amount": { "amountPaise": 5600000, "amountDisplay": "₹56,000" } }
      ],
      "comparedToPrevious": { "amountChangePercent": 8.2, "countChangePercent": 4.6, "direction": "up" },
      "charts": {
        "paymentTrend": {
          "chartType": "line",
          "title": "Successful payments",
          "xAxis": { "type": "category", "label": "Date", "format": "d MMM" },
          "yAxis": { "type": "currency", "label": "Amount" },
          "series": [ { "key": "successfulAmount", "name": "Successful amount", "data": [ { "x": "2026-09-13", "y": 4210000, "yDisplay": "₹42,100" }, { "x": "2026-09-14", "y": 4280000, "yDisplay": "₹42,800" } ] } ],
          "summary": { "total": { "amountPaise": 88400000, "amountDisplay": "₹8,84,000" } }
        },
        "modeDistribution": {
          "chartType": "donut",
          "title": "Filtered payments by mode",
          "yAxis": { "type": "currency", "label": "Amount" },
          "series": [ { "key": "PAYMENT_MODE", "name": "Amount", "data": [ { "x": "Cash", "y": 35200000, "yDisplay": "₹3,52,000", "modeKey": "CASH" }, { "x": "Card / POS", "y": 10400000, "yDisplay": "₹1,04,000", "modeKey": "CARD" }, { "x": "UPI", "y": 28400000, "yDisplay": "₹2,84,000", "modeKey": "UPI" }, { "x": "Bank transfer", "y": 6800000, "yDisplay": "₹68,000", "modeKey": "BANK_TRANSFER" }, { "x": "Cheque", "y": 5600000, "yDisplay": "₹56,000", "modeKey": "CHEQUE" }, { "x": "Online payment", "y": 7600000, "yDisplay": "₹76,000", "modeKey": "ONLINE_GATEWAY" } ] } ],
          "drilldown": { "enabled": true, "path": "/payments", "paramKey": "mode", "paramSource": "modeKey" }
        }
      }
    }
  }
}
```

### Summary query flags

| Flag | Default | Notes |
|---|---|---|
| `includeSummary` | `false` | Returns the full `meta.summary` block |
| `includeCharts` | `false` | Requires `includeSummary=true` |
| `summaryGroupBy` | `DAY` | `DAY` \| `WEEK` \| `MONTH` — drives `paymentTrend` |
| `compareToPrevious` | `false` | Adds `comparedToPrevious` |

Rules:

- Summary and charts operate over the **complete filtered result**, never the cursor page. Every filter applied to rows applies identically to totals and charts.
- `totalAmount` spans every returned status so the filtered set reconciles.
- `successfulAmount` and `paymentTrend` include `SUCCESS` only.
- **Reversed payments are reported separately and never inflate collection totals.**
- `byMode` always returns the six current modes in the authoritative order from `00 §12`, including zero rows. Append `LEGACY_ONLINE` only when the complete filtered period actually contains historical legacy payments. It respects the active status filter; with no status filter it covers all matching records and the UI must label it accordingly.
- The `COLLECTION` report (`14`) remains the accounting source of truth. This block exists for the operational cards directly above the payment list.

---

## 11. Customer app payment

The route is selected by scheme payment model. The server rejects the wrong route rather than translating between contracts:

| Scheme model | Canonical create route | Concurrency/allocation fields |
|---|---|---|
| Fixed-date | `POST /app/schemes/:schemeId/pay` | `installmentNumbers` under fixed-plan rules |
| Flexible-average | `POST /app/schemes/:schemeId/payment-intents` | required `targetCycle` + `expectedPositionVersion` |

`POST /app/schemes/:schemeId/pay` on a flexible-average scheme returns `422 FLEXIBLE_PAYMENT_INTENT_REQUIRED`. `POST .../payment-intents` on a fixed-date scheme returns `422 PAYMENT_INTENT_NOT_APPLICABLE`.

**`POST /app/schemes/:schemeId/pay` — fixed-date schemes only**
```json
{ "amountPaise": 500000, "installmentNumbers": null }
```

Validated against `payable-range` exactly as the portal is. Always returns a payment link (customers cannot self-record cash).

```json
{
  "success": true,
  "data": {
    "paymentLinkId": "plnk_01HQ8Z...",
    "gatewayUrl": "https://mercury.phonepe.com/transact/pg?token=...",
    "merchantTransactionId": "SREEGOLD_PAY_01HQ8Z3K7M",
    "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
    "expiresAt": "2026-09-14T11:00:00+05:30",
    "statusPollUrl": "/api/v1/app/payments/plnk_01HQ8Z.../status",
    "auditEventId": "aud_01LNK..."
  }
}
```

**`GET /app/payments/:linkId/status`** — polled after the customer returns from the gateway.
```json
{
  "success": true,
  "data": {
    "status": "PAID",
    "payment": {
      "id": "pay_01HQ8Z...",
      "receiptNumber": "SG/MGR/2026/001284",
      "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "goldCredited": { "weightMg": 689, "weightDisplay": "0.689 g" },
      "receiptUrl": "https://cdn.../receipt/pay_01HQ8.pdf",
      "passbookImageUrl": "https://cdn.../passbook/pay_01HQ8.png"
    },
    "schemeAfter": { "installmentsPaid": 5, "installmentsTotal": 11, "percentComplete": 45.5, "nextDueDate": "2026-11-10" }
  }
}
```

When still processing:
```json
{
  "success": true,
  "data": { "status": "PROCESSING", "message": "We're confirming your payment. This usually takes a few seconds.", "retryAfterSeconds": 3 }
}
```
