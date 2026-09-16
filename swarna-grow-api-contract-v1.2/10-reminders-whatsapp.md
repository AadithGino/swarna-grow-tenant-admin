# 10 — Reminders & WhatsApp

Every persisted single-message mutation returns `data.auditEventId`. Async bulk sends expose per-message audit ids on the completed job result; webhook receipt acknowledgements are excluded under `00 §12.1`.

Deliberately simple. Eight message types, a per-tenant reminder schedule, one flat message log with four statuses, and manual resend. No campaigns, no inbound bot, no read-receipt analytics, no tenant-authored templates.

---

## 1. Message types

| Type | Trigger | Has link | Has media |
|---|---|---|---|
| `OTP` | Auth flows | — | — |
| `SCHEME_JOINED` | Enrolment committed | — | — |
| `PAYMENT_DUE` | Reminder scheduler, pre-due offsets | Payment link | — |
| `PAYMENT_OVERDUE` | Reminder scheduler, post-due offsets | Payment link | — |
| `PAYMENT_SUCCESS` | Payment posted | — | **Passbook image** |
| `FLEXI_LOCK_APPLIED` | Flexible lock job | — | — |
| `SCHEME_MATURED` | Maturity job | — | — |
| `SCHEME_CLOSED` | Redemption / closure completed | — | — |

---

## 2. Template configuration (tenant view — read-only)

Tenants can see which templates are wired and which are missing, but cannot edit them. You configure these from `/platform` (see `01 §5`).

| Method | Path | Phase |
|---|---|---|
| `GET` | `/admin/messaging/templates` | P1 |
| `GET` | `/admin/messaging/templates/:messageType/preview` | P1 |

**`GET /admin/messaging/templates`**
```json
{
  "success": true,
  "data": [
    {
      "messageType": "PAYMENT_DUE",
      "label": "Payment due reminder",
      "configured": true,
      "templateName": "sreegold_payment_due_v1",
      "languageCode": "en",
      "approvalStatus": "APPROVED",
      "hasUrlButton": true,
      "hasMediaHeader": false,
      "sentLast30Days": 842,
      "deliveryRatePercent": 97.2,
      "lastSentAt": "2026-09-14T09:00:00+05:30"
    },
    {
      "messageType": "SCHEME_CLOSED",
      "label": "Scheme closure confirmation",
      "configured": false,
      "templateName": null,
      "approvalStatus": null,
      "warning": "This message type is not configured. Closure confirmations will not be sent. Contact support.",
      "sentLast30Days": 0
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false, "configured": 7, "required": 8, "missing": ["SCHEME_CLOSED"] }
}
```

**`GET /admin/messaging/templates/PAYMENT_DUE/preview`** — renders the template with real sample values so the jeweller can see exactly what their customer receives.
```json
{
  "success": true,
  "data": {
    "messageType": "PAYMENT_DUE",
    "renderedBody": "Hi Anjali Menon, your installment 5 of ₹5,000 for Dhanam 11 is due on 20 Sep 2026. Pay securely using the button below. — Sree Gold",
    "buttonLabel": "Pay Now",
    "buttonUrl": "https://pay.sreegold.app/pl_sample",
    "mediaHeader": null,
    "variablesUsed": [
      { "index": 1, "key": "customerName", "value": "Anjali Menon" },
      { "index": 2, "key": "schemeName", "value": "Dhanam 11" },
      { "index": 3, "key": "installmentNumber", "value": "5" },
      { "index": 4, "key": "amountDisplay", "value": "₹5,000" },
      { "index": 5, "key": "dueDateDisplay", "value": "20 Sep 2026" },
      { "index": 6, "key": "jewellerName", "value": "Sree Gold" }
    ]
  }
}
```

---

## 3. Reminder schedule configuration

| Method | Path | Phase | Permission |
|---|---|---|---|
| `GET` | `/admin/reminders/config` | P1 | any |
| `PUT` | `/admin/reminders/config` | P1 | `reminder.config.write` |

**`GET /admin/reminders/config`**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "offsets": [
      { "key": "D_MINUS_5", "label": "5 days before due", "days": -5, "enabled": true, "messageType": "PAYMENT_DUE" },
      { "key": "D_MINUS_3", "label": "3 days before due", "days": -3, "enabled": false, "messageType": "PAYMENT_DUE" },
      { "key": "D_MINUS_1", "label": "1 day before due", "days": -1, "enabled": true, "messageType": "PAYMENT_DUE" },
      { "key": "D_DAY", "label": "On the due date", "days": 0, "enabled": true, "messageType": "PAYMENT_DUE" },
      { "key": "D_PLUS_1", "label": "1 day after due", "days": 1, "enabled": true, "messageType": "PAYMENT_OVERDUE" },
      { "key": "D_PLUS_3", "label": "3 days after due", "days": 3, "enabled": true, "messageType": "PAYMENT_OVERDUE" },
      { "key": "D_PLUS_7", "label": "7 days after due", "days": 7, "enabled": true, "messageType": "PAYMENT_OVERDUE" },
      { "key": "D_PLUS_15", "label": "15 days after due", "days": 15, "enabled": false, "messageType": "PAYMENT_OVERDUE" }
    ],
    "maxRemindersPerInstallment": 5,
    "sendWindow": { "startTime": "09:00", "endTime": "20:00", "timezone": "Asia/Kolkata" },
    "skipDays": [],
    "attachPaymentLink": true,
    "paymentLinkValidityHours": 72,
    "transactional": {
      "schemeJoined": true,
      "paymentSuccess": true,
      "paymentSuccessAttachPassbook": true,
      "flexiLockApplied": true,
      "schemeMatured": true,
      "schemeClosed": true
    },
    "quota": { "used": 4310, "limit": 5000, "percent": 86.2, "resetsOn": "2026-10-01", "status": "NEAR_LIMIT" },
    "audit": { "version": 3 }
  }
}
```

`PUT` accepts the same shape plus `expectedVersion`. Enabling offsets that would push projected monthly volume past the quota returns a **warning, not a block**:
```json
{
  "success": true,
  "data": { "...": "..." },
  "meta": {
    "warnings": [
      { "code": "QUOTA_PROJECTION_EXCEEDED", "message": "With these offsets you'd send about 6,800 messages a month. Your plan allows 5,000.", "projectedMonthly": 6800, "limit": 5000 }
    ]
  }
}
```

### Scheduler behaviour

A job runs hourly. For each enabled offset it finds installments whose `dueDate + offsetDays` equals today, and queues one message per installment per offset. Guards, all enforced before queueing:

- Installment already `PAID` → skip
- Scheme not `ACTIVE` / `LOCKED` / `DEFAULTED` → skip
- Customer `whatsappOptIn: false` or blocked → skip, logged as `SKIPPED_OPTED_OUT`
- Reminders already sent for this installment ≥ `maxRemindersPerInstallment` → skip
- Outside `sendWindow` → held until the window opens
- Quota exhausted → skip, logged as `SKIPPED_QUOTA`, alert raised
- Template not configured → skip, logged as `SKIPPED_NO_TEMPLATE`, alert raised
- Duplicate `(installmentId, offsetKey)` → skip (this is the idempotency key for reminders)

Flexible free-window schemes receive no due reminders — there is no due date. They receive `PAYMENT_DUE` only after the lock is applied.

---

## 4. Message log (Reminder Centre)

| Method | Path | Phase |
|---|---|---|
| `GET` | `/admin/messaging/messages` | P1 |
| `GET` | `/admin/messaging/messages/:messageId` | P1 |
| `POST` | `/admin/messaging/messages/:messageId/resend` | P1 |
| `POST` | `/admin/messaging/messages/bulk-resend` | P1 |
| `GET` | `/admin/messaging/summary` | P1 |

**`GET /admin/messaging/messages`**

Query: `messageType`, `status`, `branchId`, `customerId`, `schemeId`, `from`, `to`, `q`, `failedOnly=true`, `limit`, `cursor`.

```json
{
  "success": true,
  "data": [
    {
      "id": "msg_01HQ8Z...",
      "messageType": "PAYMENT_DUE",
      "messageTypeLabel": "Payment due reminder",
      "offsetLabel": "5 days before due",
      "customer": { "id": "cus_01HQ8Z...", "name": "Anjali Menon", "mobile": "9847XXXX33", "passbookNumber": "MGR/2026/00412" },
      "scheme": { "id": "sch_01HQ8Z...", "schemeNumber": "MGR/DH11/2026/00318" },
      "installmentNumber": 5,
      "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
      "status": "DELIVERED",
      "queuedAt": "2026-09-15T09:00:00+05:30",
      "sentAt": "2026-09-15T09:00:02+05:30",
      "deliveredAt": "2026-09-15T09:00:04+05:30",
      "failureReason": null,
      "failureCode": null,
      "templateName": "sreegold_payment_due_v1",
      "providerMessageId": "wamid.HBgMOTE5ODQ3...",
      "paymentLink": { "id": "plnk_01HQ8Z...", "status": "OPENED", "expiresAt": "2026-09-18T09:00:00+05:30" },
      "canResend": false,
      "attemptNumber": 1
    },
    {
      "id": "msg_01HQ8Y...",
      "messageType": "PAYMENT_SUCCESS",
      "status": "FAILED",
      "customer": { "id": "cus_01HQ7Z...", "name": "Suresh Kumar", "mobile": "9847XXXX88" },
      "queuedAt": "2026-09-14T11:00:00+05:30",
      "sentAt": "2026-09-14T11:00:01+05:30",
      "deliveredAt": null,
      "failureReason": "Recipient has not opted in to receive messages from this business",
      "failureCode": "131047",
      "failureCategory": "RECIPIENT_OPT_OUT",
      "canResend": false,
      "resendBlockedReason": "Recipient must message the business first to re-open the window",
      "attemptNumber": 2
    }
  ],
  "meta": { "nextCursor": "eyJpZCI6...", "hasMore": true }
}
```

`failureCategory` ∈ `RECIPIENT_OPT_OUT` | `INVALID_NUMBER` | `TEMPLATE_REJECTED` | `RATE_LIMITED` | `PROVIDER_ERROR` | `MEDIA_ERROR` | `UNKNOWN`. `canResend` is server-decided from the category so the UI doesn't have to encode which failures are retryable.

**`GET /admin/messaging/summary`**

Query: `from`, `to`, `branchId`, `groupBy` ∈ `DAY` | `MESSAGE_TYPE` | `BRANCH`.

```json
{
  "success": true,
  "data": {
    "period": { "from": "2026-08-15", "to": "2026-09-14", "label": "Last 30 days" },
    "totals": {
      "queued": 32,
      "sent": 1842,
      "delivered": 1791,
      "failed": 51,
      "deliveryRatePercent": 97.2,
      "failureRatePercent": 2.8
    },
    "byMessageType": [
      { "messageType": "PAYMENT_DUE", "label": "Payment due reminder", "sent": 842, "delivered": 818, "failed": 24, "deliveryRatePercent": 97.2 },
      { "messageType": "PAYMENT_OVERDUE", "label": "Overdue reminder", "sent": 412, "delivered": 401, "failed": 11, "deliveryRatePercent": 97.3 },
      { "messageType": "PAYMENT_SUCCESS", "label": "Payment confirmation", "sent": 486, "delivered": 478, "failed": 8, "deliveryRatePercent": 98.4 },
      { "messageType": "OTP", "label": "Login OTP", "sent": 102, "delivered": 94, "failed": 8, "deliveryRatePercent": 92.2 }
    ],
    "failuresByCategory": [
      { "category": "RECIPIENT_OPT_OUT", "label": "Not opted in", "count": 28 },
      { "category": "INVALID_NUMBER", "label": "Invalid number", "count": 14 },
      { "category": "PROVIDER_ERROR", "label": "Provider error", "count": 9 }
    ],
    "quota": { "used": 4310, "limit": 5000, "percent": 86.2, "resetsOn": "2026-10-01", "status": "NEAR_LIMIT", "projectedMonthEnd": 5240, "willExceed": true },
    "charts": {
      "volumeTrend": {
        "chartType": "line",
        "title": "Messages per day",
        "yAxis": { "type": "count", "label": "Messages" },
        "series": [
          { "key": "DELIVERED", "name": "Delivered", "data": [ { "x": "2026-09-12", "y": 64 }, { "x": "2026-09-13", "y": 71 }, { "x": "2026-09-14", "y": 58 } ] },
          { "key": "FAILED", "name": "Failed", "data": [ { "x": "2026-09-12", "y": 2 }, { "x": "2026-09-13", "y": 1 }, { "x": "2026-09-14", "y": 3 } ] }
        ]
      },
      "deliveryByType": {
        "chartType": "horizontalBar",
        "title": "Delivery rate by message type",
        "yAxis": { "type": "percent", "label": "Delivery rate" },
        "series": [ { "key": "rate", "name": "Delivery rate", "data": [ { "x": "Payment confirmation", "y": 98.4 }, { "x": "Overdue reminder", "y": 97.3 }, { "x": "Payment due reminder", "y": 97.2 }, { "x": "Login OTP", "y": 92.2 } ] } ]
      }
    }
  }
}
```

---

## 5. Resend

**`POST /admin/messaging/messages/:messageId/resend`**
```json
{ "regeneratePaymentLink": true }
```
```json
{
  "success": true,
  "data": {
    "newMessageId": "msg_01HQ9A...",
    "originalMessageId": "msg_01HQ8Y...",
    "status": "QUEUED",
    "attemptNumber": 3,
    "paymentLink": { "id": "plnk_01HQ9A...", "expiresAt": "2026-09-17T10:30:00+05:30" },
    "auditEventId": "aud_01MSG..."
  }
}
```

A resend is a **new message row** referencing the original via `resendOf`. The original is never mutated, so the delivery history stays truthful.

**`POST /admin/messaging/messages/bulk-resend`**
```json
{ "messageIds": ["msg_01HQ8Y...", "msg_01HQ8X..."], "regeneratePaymentLink": true }
```
Returns `202` with a job handle; non-resendable rows come back in `skipped` with a reason.

---

## 6. Delivery status webhook

**`POST /webhooks/whatsapp/:tenantId`**

Header: `X-Hub-Signature-256: sha256=<hmac>`

```json
{
  "entry": [
    {
      "id": "104928374651",
      "changes": [
        {
          "field": "messages",
          "value": {
            "messaging_product": "whatsapp",
            "statuses": [
              {
                "id": "wamid.HBgMOTE5ODQ3...",
                "status": "delivered",
                "timestamp": "1757913604",
                "recipient_id": "919847112233"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

Handler:
1. Verify HMAC over the raw body → failure `401`, persisted.
2. Persist to `webhook_events`, dedupe on `(providerMessageId, status)`.
3. Return `200` immediately.
4. Async: map `providerMessageId` → message row, update status.

Status mapping — `sent` → `SENT`, `delivered` → `DELIVERED`, `failed` → `FAILED` (with `errors[].code` → `failureCode` and `errors[].title` → `failureReason`). **`read` is ignored** — we don't track read receipts.

Inbound messages (`value.messages[]`) are persisted to `inbound_messages` and nothing else. No parsing, no auto-reply, no bot. The collection exists so the data isn't lost when an inbound feature ships later.

**`GET /admin/messaging/inbound`** (P1.5) lists them read-only.

---

## 7. Opt-out

| Method | Path | Phase |
|---|---|---|
| `PATCH` | `/admin/customers/:customerId/whatsapp-opt` | P1 |
| `GET` | `/admin/messaging/opt-outs` | P1.5 |

```json
{ "whatsappOptIn": false, "reason": "Customer requested on call" }
```

Opting out suppresses every message type **except `OTP`** — a customer who opts out can still log in, since OTP is a service message they explicitly requested by tapping login. Skipped messages are logged as `SKIPPED_OPTED_OUT` so the reminder centre shows why a customer received nothing, rather than showing a silent gap.

---

## 8. Quota enforcement

Counted per tenant per billing month across all message types including OTP.

| Threshold | Behaviour |
|---|---|
| 80% | Alert `WHATSAPP_QUOTA_NEAR_LIMIT` raised |
| 95% | Alert escalated to `HIGH` |
| 100% | Non-OTP messages skipped with `SKIPPED_QUOTA`. **OTP continues** — blocking login would lock customers out of a paid service. OTP overage is recorded and surfaced on the platform invoice. |

**`GET /admin/messaging/quota`**
```json
{
  "success": true,
  "data": {
    "used": 4310,
    "limit": 5000,
    "remaining": 690,
    "percent": 86.2,
    "status": "NEAR_LIMIT",
    "periodStart": "2026-09-01",
    "resetsOn": "2026-10-01",
    "byType": [
      { "messageType": "PAYMENT_DUE", "count": 2104 },
      { "messageType": "PAYMENT_OVERDUE", "count": 1012 },
      { "messageType": "PAYMENT_SUCCESS", "count": 986 },
      { "messageType": "OTP", "count": 208 }
    ],
    "projectedMonthEnd": 5240,
    "willExceed": true,
    "recommendation": "Disable the 3-days-before offset or upgrade to Pro for 20,000 messages."
  }
}
```

---

## 9. Outbox & retry

All outbound messages go through an outbox table, never a direct API call from the request path.

| Attempt | Delay |
|---|---|
| 1 | Immediate |
| 2 | 30s |
| 3 | 2 min |
| 4 | 10 min |
| 5 | 1 hour |

After 5 attempts the row moves to the dead-letter queue and is marked `FAILED` with `failureCategory: "PROVIDER_ERROR"`. Non-retryable failures (`RECIPIENT_OPT_OUT`, `INVALID_NUMBER`, `TEMPLATE_REJECTED`) fail immediately without consuming retries.

`GET /admin/messaging/dead-letter` (P1.5) and `POST /admin/messaging/dead-letter/:id/requeue` (P1.5).
