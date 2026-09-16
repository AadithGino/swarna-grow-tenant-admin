# 00 — Conventions

Read this before any other file. Everything here is assumed in every subsequent example.

---

## 1. Response envelope

Every response, success or failure, uses the same shape.

**Success**
```json
{
  "success": true,
  "data": { },
  "meta": { }
}
```

**Success — list**
```json
{
  "success": true,
  "data": [ ],
  "meta": {
    "nextCursor": "eyJpZCI6IjY1ZjNhIiwidCI6MTcwOTI4fQ",
    "hasMore": true,
    "limit": 20
  }
}
```

**Failure**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Installment amount is outside the allowed range for this plan.",
    "details": [
      { "field": "installmentAmountPaise", "message": "Must be between 100000 and 1000000" }
    ],
    "traceId": "01HQ8Z3K7M9P2R4T6V8X0Y"
  }
}
```

`error.message` is safe to render directly to the end user. `error.details` is for field-level form highlighting. `traceId` is always present on errors and should be shown in a collapsed "report this" affordance.

---

## 2. Authentication

### Token model

| Token | Lifetime | Delivery |
|---|---|---|
| Access token (JWT) | 30 min (web), 60 min (mobile) | `Authorization: Bearer <token>` |
| Refresh token | 30 days, rotating | Response body; client stores in secure storage |

Refresh tokens are single-use and rotate on every refresh. Reuse of a consumed refresh token revokes the entire device session family and returns `TOKEN_REUSE_DETECTED`.

### Access token claims

```json
{
  "sub": "usr_01HQ8Z3K7M9P2R4T6V8X0Y",
  "typ": "TENANT_USER",
  "tid": "tnt_01HQ7A2B3C4D5E6F7G8H9J",
  "bid": "brn_01HQ7A2B3C4D5E6F7G8H9K",
  "rol": "BRANCH_MANAGER",
  "per": ["customer.read", "customer.write", "payment.record"],
  "did": "dev_01HQ9...",
  "iat": 1757808000,
  "exp": 1757809800
}
```

| Claim | Meaning |
|---|---|
| `typ` | `PLATFORM_USER` \| `TENANT_USER` \| `CUSTOMER` |
| `tid` | Tenant id. Absent for `PLATFORM_USER`. |
| `bid` | Branch id. Present for branch-scoped roles; `null` for `TENANT_OWNER`. |
| `rol` | Role code |
| `per` | Resolved permission list (flattened from role + overrides) |
| `did` | Device id — ties the session to a device row |

**`tenantId` and `branchId` are never read from the request body or query for scoping.** Middleware injects them from the token. A branch-scoped user querying `/admin/customers` silently receives only their branch's customers. If a branch-scoped user requests a resource belonging to another branch by id, the response is `404 RESOURCE_NOT_FOUND` — never `403`, so branch existence is not leaked.

---

## 3. Standard headers

### Request

| Header | Required | Notes |
|---|---|---|
| `Authorization` | On all authenticated routes | `Bearer <access token>` |
| `Content-Type` | On body requests | `application/json` |
| `X-Idempotency-Key` | On every state-changing POST | Client-generated UUID v4. See §5. |
| `X-Device-Id` | Mobile apps, always | Stable per install |
| `X-Platform` | Mobile apps | `android` \| `ios` |
| `X-App-Version` | Mobile apps | Semver, e.g. `1.2.0`. Drives force-update. |
| `X-Tenant-Code` | Customer app, pre-login only | Resolves which tenant the OTP belongs to |
| `X-Acting-Branch-Id` | Optional, `TENANT_OWNER` only | Lets an owner act *as* a branch (e.g. enrol a customer). Rejected for any other role. |

### Response

| Header | Notes |
|---|---|
| `X-Trace-Id` | Echoed on every response |
| `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset` | On rate-limited routes |
| `X-Idempotent-Replay` | `true` when a cached idempotent response is returned |

---

## 4. HTTP status codes

| Code | Used for |
|---|---|
| `200` | Successful read or update |
| `201` | Resource created |
| `202` | Accepted for async processing (exports, bulk resend) |
| `400` | Validation failure, malformed body |
| `401` | Missing/expired/invalid token |
| `403` | Authenticated but lacks permission, or subscription limit blocks the action |
| `404` | Not found, or out of the caller's scope |
| `409` | State conflict (already paid, already closed, version mismatch) |
| `422` | Business rule violation (payable range exceeded, lock-in not met) |
| `429` | Rate limited |
| `500` | Unhandled |
| `503` | Dependency down (gateway, BSP) — client should retry |

---

## 5. Idempotency

Applies to: enrolment, payment recording, payment-link creation, redemption, closure, cash handover, reversal, OTP send, message send.

**Request**
```
POST /api/v1/staff/payments
X-Idempotency-Key: 8f2a4c60-1b3d-4e5f-9a7b-2c4d6e8f0a1b
```

Behaviour:

- First call: processed, response persisted against the key for **24 hours**, keyed by `(tenantId, userId, endpoint, key)`.
- Replay with the **same body hash**: the original response is returned verbatim, `200`/`201` preserved, plus `X-Idempotent-Replay: true` and `"idempotentReplay": true` in `meta`.
- Replay with a **different body hash**: `409 IDEMPOTENCY_KEY_REUSED`.
- Concurrent call while the first is in flight: `409 REQUEST_IN_PROGRESS` — client retries after a short backoff.

**Replay response**
```json
{
  "success": true,
  "data": { "paymentId": "pay_01HQ...", "status": "SUCCESS" },
  "meta": { "idempotentReplay": true }
}
```

---

## 6. Pagination

Cursor-based, everywhere.

**Request**
```
GET /api/v1/admin/customers?limit=20&cursor=eyJpZCI6...&sort=createdAt:desc
```

| Param | Default | Notes |
|---|---|---|
| `limit` | 20 | Max 100 |
| `cursor` | — | Opaque base64. Never construct client-side. |
| `sort` | Endpoint-specific | `field:asc` \| `field:desc`. Only whitelisted fields. |

The cursor encodes `{ lastValue, lastId, sort, filterHash }`. If filters change, the old cursor is rejected with `CURSOR_FILTER_MISMATCH` and the client restarts from page one.

**Total counts are not returned by default** — they are expensive at scale. Where the UI needs a count, call the dedicated `.../count` endpoint or pass `?includeCount=true` (only available on endpoints that document it).

---

## 7. Money and weight

### Money

Stored and transported as **integer paise**. Never a float, never a string decimal.

Every monetary field appears as a pair:

```json
{
  "amountPaise": 500000,
  "amountDisplay": "₹5,000"
}
```

`amountDisplay` is server-rendered with Indian digit grouping so every surface formats identically. UI renders `amountDisplay`; logic uses `amountPaise`.

### Gold weight

Stored and transported as **integer milligrams**.

```json
{
  "weightMg": 8342,
  "weightDisplay": "8.342 g"
}
```

Display precision is 3 decimals (milligram). Rounding on conversion is configured per plan (`HALF_UP` default) and the rounding mode used is snapshotted on the transaction.

### Rates

Gold rate is **paise per gram**.

```json
{
  "ratePerGramPaise": 725000,
  "ratePerGramDisplay": "₹7,250"
}
```

### Conversion rule (authoritative)

```
weightMg = floor_or_round( amountPaise * 1000 / ratePerGramPaise )
```

Computed with `Decimal.js`, rounded per plan config, stored as integer. The `ratePerGramPaise` used is copied onto the ledger entry permanently — later rate edits never retroactively change a posted transaction.

---

## 8. Dates and times

- All timestamps in responses: **ISO 8601 with offset**, `2026-09-14T10:30:00+05:30`.
- All date-only fields: `YYYY-MM-DD`.
- All month fields: `YYYY-MM`.
- Server operates in **Asia/Kolkata**. Due-date rollovers, reminder windows and day-end cutoffs all use IST calendar days.
- Request date filters are inclusive on both ends and interpreted as IST calendar dates.

---

## 9. Error codes

### Generic
| Code | Status |
|---|---|
| `VALIDATION_FAILED` | 400 |
| `UNAUTHENTICATED` | 401 |
| `TOKEN_EXPIRED` | 401 |
| `TOKEN_REUSE_DETECTED` | 401 |
| `FORBIDDEN` | 403 |
| `RESOURCE_NOT_FOUND` | 404 |
| `VERSION_CONFLICT` | 409 |
| `IDEMPOTENCY_KEY_REUSED` | 409 |
| `REQUEST_IN_PROGRESS` | 409 |
| `RATE_LIMITED` | 429 |
| `INTERNAL_ERROR` | 500 |
| `DEPENDENCY_UNAVAILABLE` | 503 |

### Subscription & limits
| Code | Status | Meaning |
|---|---|---|
| `SUBSCRIPTION_INACTIVE` | 403 | Tenant suspended / past grace |
| `LIMIT_ACTIVE_CUSTOMERS` | 403 | Active customer cap reached |
| `LIMIT_BRANCHES` | 403 | Branch cap reached |
| `LIMIT_STAFF` | 403 | Staff seat cap reached |
| `LIMIT_SCHEME_PLANS` | 403 | Plan count cap reached |
| `LIMIT_WHATSAPP_QUOTA` | 403 | Message quota exhausted |
| `FEATURE_NOT_IN_PLAN` | 403 | e.g. flexible scheme on Starter |

Limit errors carry usage context so the UI can render an accurate upsell:

```json
{
  "success": false,
  "error": {
    "code": "LIMIT_ACTIVE_CUSTOMERS",
    "message": "Your Starter plan allows 100 active customers. You have 100.",
    "details": {
      "limitKey": "activeCustomers",
      "limit": 100,
      "used": 100,
      "currentPlan": "STARTER",
      "suggestedPlan": "GROWTH",
      "upgradeUrl": "/settings/subscription"
    }
  }
}
```

### Domain
| Code | Status | Meaning |
|---|---|---|
| `CUSTOMER_MOBILE_EXISTS` | 409 | Mobile already registered in this tenant |
| `KYC_REQUIRED` | 422 | Tenant mandates KYC before enrolment |
| `ONE_SCHEME_POLICY` | 422 | Tenant allows only one active scheme per customer |
| `PLAN_ENROLMENT_CLOSED` | 422 | Outside enrolment window or max enrolments hit |
| `AMOUNT_BELOW_MINIMUM` | 422 | Below plan/scheme minimum |
| `AMOUNT_ABOVE_MAXIMUM` | 422 | Above plan/scheme maximum |
| `AMOUNT_NOT_MULTIPLE` | 422 | Not a multiple of the configured step |
| `OVERPAYMENT_BLOCKED` | 422 | Exceeds remaining scheme value |
| `PARTIAL_PAYMENT_BLOCKED` | 422 | Plan requires full installment |
| `GOLD_RATE_NOT_SET` | 422 | No rate effective for today |
| `SCHEME_NOT_ACTIVE` | 409 | Scheme matured/closed/redeemed |
| `INSTALLMENT_ALREADY_PAID` | 409 | |
| `FREE_WINDOW_CLOSED` | 422 | Flexible: free-window payment after lock |
| `LOCK_NOT_APPLIED` | 409 | Lock-window action before lock computed |
| `LOCK_IN_NOT_MET` | 422 | Premature closure before lock-in period |
| `PREMATURE_CLOSURE_NOT_ALLOWED` | 422 | Plan disallows it |
| `SCHEME_NOT_MATURED` | 422 | Redemption attempted pre-maturity |
| `REDEMPTION_APPROVAL_REQUIRED` | 422 | Needs admin approval |
| `PAYMENT_LINK_EXPIRED` | 410 | |
| `PAYMENT_ALREADY_RECORDED` | 409 | |
| `REVERSAL_NOT_ALLOWED` | 422 | Outside reversal window or already reversed |
| `CASH_HANDOVER_AMOUNT_EXCEEDS_BALANCE` | 422 | |
| `CASH_HANDOVER_ALREADY_SETTLED` | 409 | |
| `TEMPLATE_NOT_CONFIGURED` | 422 | Tenant has no template mapped for this message type |
| `WHATSAPP_OPTED_OUT` | 422 | |
| `FORCE_UPDATE_REQUIRED` | 426 | Client below minimum app version |

### Payment channel
| Code | Status | Meaning |
|---|---|---|
| `PAYMENT_MODE_INVALID` | 400 | Unsupported or deprecated manual mode |
| `MANUAL_GATEWAY_PAYMENT_NOT_ALLOWED` | 422 | Staff attempted to manually post `ONLINE_GATEWAY` |
| `PAYMENT_REFERENCE_TOO_LONG` | 422 | Optional reference exceeds 100 characters |
| `PAYMENT_REMARKS_TOO_LONG` | 422 | Optional remarks exceed 500 characters |

### Flexible-average position
| Code | Status | Meaning |
|---|---|---|
| `PAYMENT_POSITION_CHANGED` | 409 | Payable position changed after the quote was issued |
| `CURRENT_CYCLE_CAP_REACHED` | 422 | No allowance remains in the target cycle |
| `PAYMENT_CONFIRMATION_PENDING` | 409 | A pending gateway attempt reserves the allowance |
| `FUTURE_CYCLE_PAYMENT_NOT_ALLOWED` | 422 | Plan disallows future-cycle payment, or prerequisites unmet |
| `CURRENT_CYCLE_INCOMPLETE` | 422 | Current cycle must be completed before paying a future cycle |
| `ADVANCE_CYCLE_LIMIT_EXCEEDED` | 422 | Target cycle is beyond `maxAdvanceCycles` |
| `CYCLE_SEQUENCE_VIOLATION` | 422 | Future cycles must be paid in order |
| `FLEXIBLE_PHASE_NOT_COMPLETE` | 422 | Cap is not yet snapshotted |
| `FLEXIBLE_PAYMENT_INTENT_REQUIRED` | 422 | Flexible-average customer payments must use the payment-intent route |
| `PAYMENT_INTENT_NOT_APPLICABLE` | 422 | Payment intents are not used for fixed-date schemes |

### Grievances
| Code | Status | Meaning |
|---|---|---|
| `GRIEVANCE_NOT_FOUND` | 404 | Absent or outside caller scope |
| `GRIEVANCE_STATUS_INVALID` | 422 | Invalid status transition |
| `GRIEVANCE_REOPEN_WINDOW_EXPIRED` | 422 | Past the 7-day reopen window |
| `GRIEVANCE_INTERNAL_NOTE_FORBIDDEN` | 403 | Caller cannot create an internal note |

### Nominee
| Code | Status | Meaning |
|---|---|---|
| `NOMINEE_NOT_FOUND` | 404 | Customer has no nominee object |

---

## 10. Rate limits

| Route group | Limit |
|---|---|
| `POST /public/auth/otp/request` | 3 / mobile / 10 min, 10 / IP / hour |
| `POST /public/auth/otp/verify` | 5 attempts per OTP, then OTP invalidated |
| `POST /*/auth/login` | 10 / mobile / 15 min |
| `POST /*/payments/links` | 20 / scheme / hour |
| `POST /admin/reports/*/export` | 5 / tenant / hour |
| `POST /admin/reminders/*/resend` | 100 / tenant / hour |
| All authenticated reads | 300 / user / minute |

---

## 11. Shared objects

These appear embedded across many responses. Defined once here.

### `MoneyRef`
```json
{ "amountPaise": 500000, "amountDisplay": "₹5,000" }
```

### `WeightRef`
```json
{ "weightMg": 8342, "weightDisplay": "8.342 g" }
```

### `BranchRef`
```json
{ "id": "brn_01HQ7A2B3C4D5E6F7G8H9K", "name": "MG Road", "code": "MGR" }
```

### `StaffRef`
```json
{ "id": "usr_01HQ8Z...", "name": "Rahul Nair", "mobile": "9846XXXX21", "role": "BRANCH_STAFF" }
```

Mobile numbers are masked (`9846XXXX21`) in every list response and in any surface below `TENANT_ADMIN`. Full numbers appear only on the customer detail endpoint and only for `customer.read.pii` permission holders.

### `CustomerRef`
```json
{
  "id": "cus_01HQ8...",
  "name": "Anjali Menon",
  "mobile": "9847XXXX55",
  "passbookNumber": "MGR/2026/00412"
}
```

### `SchemeRef`
```json
{
  "id": "sch_01HQ8...",
  "schemeNumber": "MGR/GS/2026/00318",
  "planName": "Swarna Plus 11",
  "valueBasis": "GOLD_WEIGHT",
  "paymentPattern": "FIXED",
  "status": "ACTIVE"
}
```

### `ChartSeries` (used by every chart endpoint)
```json
{
  "chartType": "line",
  "title": "Collection trend",
  "xAxis": { "type": "category", "label": "Date" },
  "yAxis": { "type": "currency", "label": "Amount", "unit": "INR" },
  "series": [
    {
      "key": "COLLECTED",
      "name": "Collected",
      "data": [
        { "x": "2026-09-01", "y": 4520000, "yDisplay": "₹45,200" },
        { "x": "2026-09-02", "y": 3810000, "yDisplay": "₹38,100" }
      ]
    }
  ],
  "summary": {
    "total": { "amountPaise": 8330000, "amountDisplay": "₹83,300" },
    "changePercent": 12.4,
    "changeDirection": "up",
    "comparedTo": "previous_period"
  }
}
```

`chartType` is one of `line` | `bar` | `stackedBar` | `area` | `donut` | `horizontalBar` | `heatmap`. Every series `key` is a stable semantic key; it is never a colour token. The backend must not return chart colours. The frontend maps semantic keys, statuses, `isGood`, `direction` and `severity` to accessible SwarnaGrow design tokens. The designer can key visual treatment off `yAxis.type`: `currency` | `weight` | `count` | `percent`.

### `AuditStamp`
```json
{
  "createdAt": "2026-09-14T10:30:00+05:30",
  "createdBy": { "id": "usr_01HQ...", "name": "Rahul Nair" },
  "updatedAt": "2026-09-14T11:02:00+05:30",
  "updatedBy": { "id": "usr_01HQ...", "name": "Priya S" },
  "version": 4
}
```

`version` must be echoed back in `PATCH` bodies as `expectedVersion` for optimistic concurrency. Mismatch → `409 VERSION_CONFLICT` with the current document in `error.details.current`.

---

## 12. Enums (authoritative list)

```
TenantStatus          PENDING_SETUP | ACTIVE | SUSPENDED | CANCELLED
SubscriptionStatus    TRIAL | ACTIVE | PAST_DUE | GRACE | SUSPENDED | CANCELLED
PlanTier              STARTER | GROWTH | PRO | CUSTOM

UserType              PLATFORM_USER | TENANT_USER | CUSTOMER
TenantRole            TENANT_OWNER | TENANT_ADMIN | BRANCH_MANAGER | BRANCH_STAFF
UserStatus            ACTIVE | INACTIVE

CustomerStatus        ACTIVE | BLOCKED | INACTIVE
KycType               AADHAAR | PAN
KycStatus             NOT_SUBMITTED | SUBMITTED | VERIFIED | REJECTED

ValueBasis            CASH | GOLD_WEIGHT
PaymentPattern        FIXED | FLEXIBLE
AmountMode            JEWELLER_FIXED | JEWELLER_SLABS | CUSTOMER_CHOSEN
DueDateRule           FIXED_DAY_OF_MONTH | JOIN_ANNIVERSARY
FirstInstallmentMode  COLLECT_NOW | START_NEXT_CYCLE
FirstInstallmentAction RECORD_MANUAL_PAYMENT | CREATE_PAYMENT_LINK
BenefitType           FIXED_BONUS_AMOUNT | ONE_FREE_INSTALLMENT | TEXT_ONLY
BonusBasis            FLAT | PERCENT_OF_PAID

SchemePlanStatus      DRAFT | ACTIVE | INACTIVE
SchemeStatus          ACTIVE | LOCKED | DEFAULTED | MATURED | REDEEMED | CLOSED_PREMATURE
SchemeDisplayMode     FIXED | FLEXIBLE_FREE_WINDOW | FLEXIBLE_LOCK_WINDOW
FlexiblePhase         FLEXIBLE | CAPPED
CycleStatus           UPCOMING | PARTIALLY_PAID | PAID | EXPIRED
InstallmentStatus     PENDING | DUE | PARTIALLY_PAID | PAID | OVERDUE | WAIVED

PaymentMode           CASH | CARD | UPI | BANK_TRANSFER | CHEQUE | ONLINE_GATEWAY
                      (read-only legacy: LEGACY_ONLINE)
ManualPaymentMode     CASH | CARD | UPI | BANK_TRANSFER | CHEQUE
PaymentIntentStatus   PENDING | SUCCEEDED | FAILED | EXPIRED | CANCELLED
PaymentStatus         PENDING | SUCCESS | FAILED | REVERSED
PaymentSource         PORTAL | STAFF_APP | CUSTOMER_APP | WEBHOOK | SYSTEM
LinkStatus            CREATED | SENT | OPENED | PAID | EXPIRED | CANCELLED

LedgerEntryType       INSTALLMENT_PAYMENT | FREE_WINDOW_PAYMENT | BENEFIT_CREDIT |
                      REVERSAL | CLOSURE_PENALTY | REDEMPTION_DEBIT | ADJUSTMENT

RedemptionMode        CASH | GOLD_HANDOVER | PURCHASE_ADJUSTMENT | TRANSFER_TO_SCHEME
RedemptionStatus      REQUESTED | PENDING_APPROVAL | APPROVED | COMPLETED | REJECTED
ClosureType           MATURITY_REDEMPTION | PREMATURE_CLOSURE

MessageType           OTP | SCHEME_JOINED | PAYMENT_DUE | PAYMENT_OVERDUE |
                      PAYMENT_SUCCESS | FLEXI_LOCK_APPLIED | SCHEME_MATURED |
                      SCHEME_CLOSED
MessageStatus         QUEUED | SENT | DELIVERED | FAILED

CashHandoverStatus    PENDING | ACCEPTED | DISCREPANCY | REJECTED
HandoverInitiator     STAFF | ADMIN

ExportStatus          QUEUED | PROCESSING | READY | FAILED

NomineeRelationship   SPOUSE | PARENT | CHILD | SIBLING | RELATIVE | FRIEND | OTHER

GrievanceCategory     PAYMENT | RECEIPT | SCHEME_RULE | GOLD_CREDIT | MATURITY |
                      REDEMPTION | KYC | WHATSAPP | STAFF_SERVICE | OTHER
GrievancePriority     LOW | NORMAL | HIGH | URGENT
GrievanceStatus       OPEN | IN_PROGRESS | WAITING_FOR_CUSTOMER | RESOLVED | CLOSED
GrievanceMessageType  PUBLIC_REPLY | INTERNAL_NOTE | SYSTEM_EVENT

AuditActorType        USER | CUSTOMER | SYSTEM | WEBHOOK
AuditEntityType       CUSTOMER | SCHEME | PAYMENT | PAYMENT_LINK | PAYMENT_INTENT |
                      GRIEVANCE | CASH_HANDOVER | REDEMPTION | MESSAGE |
                      GOLD_RATE | STAFF | BRANCH | PLAN

PhaseMode             SINGLE | FLEXIBLE_THEN_CAPPED
CapMode               NONE | FLEXIBLE_PHASE_AVERAGE
CarryForwardMode      NONE
```

### Payment mode labels (authoritative)

Every surface that groups by mode returns these exact keys and labels, in this order, including zero rows:

| `mode` | `label` | Manually recordable | Affects cash-in-hand |
|---|---|:--:|:--:|
| `CASH` | Cash | Yes | **Yes** |
| `CARD` | Card / POS | Yes | No |
| `UPI` | UPI | Yes | No |
| `BANK_TRANSFER` | Bank transfer | Yes | No |
| `CHEQUE` | Cheque | Yes | No |
| `ONLINE_GATEWAY` | Online payment | **No — gateway callback only** | No |
| `LEGACY_ONLINE` | Legacy online | **No — read-only historical** | No |

Only `CASH` moves staff cash-in-hand. `ONLINE_GATEWAY` can only be created by a verified provider callback; a manual attempt returns `MANUAL_GATEWAY_PAYMENT_NOT_ALLOWED`. `LEGACY_ONLINE` exists solely so pre-migration records still reconcile in historical `byMode` results — it is rejected on every new write.

---

## 12.1 Audit events on mutations

A single-entity tenant business mutation writes exactly one immutable audit event inside the same transaction as the business write. If the transaction rolls back, no event is written. Its id is returned as `data.auditEventId`, so the client can link straight to the timeline.

```json
{
  "success": true,
  "data": { "id": "pay_01HQ8Z...", "auditEventId": "aud_01PAY..." }
}
```

Audit events are append-only. No application role can update or delete them. Secrets, OTPs, raw tokens, card data and unrestricted free-text payload snapshots are never written to an audit record. Full contract in `17-audit-timeline.md`.

A bulk mutation is different: it writes one audit event for each independently affected entity. A synchronous response returns `data.auditEventIds` in target order, or places `auditEventId` on each per-entity result row when partial success is possible. For an asynchronous `202` job, no audit id exists merely because work was queued; the completed job result must expose `auditEventId` on every successfully mutated entity. It must never collapse a bulk operation into one audit event.

Validation/preview endpoints, reads, authentication/OTP/session operations, and webhook receipt acknowledgements do not create tenant business audit events. A webhook's later asynchronous business mutation does create the applicable event with `actorType: "WEBHOOK"`.

---

## 13. Webhook security

Both inbound webhooks are unauthenticated by token and verified by signature.

| Source | Header | Verification |
|---|---|---|
| PhonePe | `X-VERIFY` | `SHA256(base64Payload + endpointPath + saltKey) + "###" + saltIndex` |
| WhatsApp BSP | `X-Hub-Signature-256` | `HMAC-SHA256(rawBody, appSecret)` |

Rules:
- Signature verified against **raw body bytes** before JSON parsing.
- Every received webhook is persisted to a `webhook_events` collection **before** processing, keyed by provider event id for dedupe.
- Processing is asynchronous via the outbox/queue. The HTTP handler always returns `200` once persisted, so the provider stops retrying.
- Unknown/duplicate event ids return `200` and are dropped.
- Failures move to a dead-letter queue surfaced in the tenant alert centre.

---

## 14. File uploads

Two-step signed upload. The API never proxies file bytes.

**Step 1**
```
POST /api/v1/admin/uploads/presign
{ "purpose": "KYC_DOCUMENT", "fileName": "aadhaar-front.jpg", "contentType": "image/jpeg", "sizeBytes": 482910 }
```
```json
{
  "success": true,
  "data": {
    "uploadId": "upl_01HQ8...",
    "uploadUrl": "https://storage.../presigned",
    "method": "PUT",
    "headers": { "Content-Type": "image/jpeg" },
    "expiresAt": "2026-09-14T10:45:00+05:30"
  }
}
```

**Step 2** — client `PUT`s the bytes directly to `uploadUrl`, then references `uploadId` in the business call (e.g. `kyc.frontUploadId`).

| Purpose | Max size | Allowed types |
|---|---|---|
| `TENANT_LOGO` | 2 MB | png, jpeg, webp |
| `KYC_DOCUMENT` | 5 MB | jpeg, png, pdf |
| `GRIEVANCE_ATTACHMENT` | 5 MB | jpeg, png, pdf |

Reads use short-lived signed URLs (`expiresIn` 15 min) returned inline on the owning resource.

---

## 15. Health & meta

| Method | Path | Phase | Notes |
|---|---|---|---|
| `GET` | `/health` | P1 | Liveness |
| `GET` | `/health/ready` | P1 | DB + queue readiness |
| `GET` | `/api/v1/public/app-config` | P1 | Min supported app version per platform, force-update flag, maintenance banner |

```json
{
  "success": true,
  "data": {
    "minSupportedVersion": { "android": "1.0.0", "ios": "1.0.0" },
    "latestVersion": { "android": "1.2.0", "ios": "1.2.0" },
    "forceUpdate": false,
    "maintenance": { "active": false, "message": null }
  }
}
```
