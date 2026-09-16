# 17 — Immutable Audit Timeline

Every single-entity tenant business mutation writes exactly one append-only audit event inside the same transaction as the business write. If the transaction rolls back, no event exists. The event id comes back to the caller as `data.auditEventId`. Bulk mutations write one event per independently affected entity and return those ids as described in §6.

This replaces the ad-hoc audit references scattered through the earlier files with one contract. The platform audit log (`01 §8`) is a separate store for platform-user actions against tenants; this file covers tenant-scoped business events.

---

## 1. Endpoint map

| Method | Path | Phase | Permission |
|---|---|---|---|
| `GET` | `/admin/audit-events` | P1 | `audit.read` |
| `GET` | `/admin/customers/:customerId/audit-events` | P1 | `audit.read` |
| `GET` | `/admin/schemes/:schemeId/audit-events` | P1 | `audit.read` |
| `GET` | `/admin/payments/:paymentId/audit-events` | P1 | `audit.read` |
| `GET` | `/admin/grievances/:grievanceId/audit-events` | P1 | `audit.read` |
| `GET` | `/admin/cash/handovers/:handoverId/audit-events` | P1.5 | `audit.read` |
| `GET` | `/staff/customers/:customerId/audit-events` | P1.5 | `audit.read` |

`audit.read` is held by `TENANT_OWNER` and `TENANT_ADMIN` (see `02 §7`). Branch-scoped callers receive only events for their own branch; a cross-branch entity id returns `404 RESOURCE_NOT_FOUND`.

---

## 2. Global search

```
GET /admin/audit-events?entityType=PAYMENT&entityId=pay_01&actorId=usr_01&action=PAYMENT_RECORDED&from=2026-09-01&to=2026-09-14&limit=50&cursor=<opaque>
```

| Query | Values |
|---|---|
| `entityType` | From `AuditEntityType` |
| `entityId` | Exact id |
| `parentEntityType` / `parentEntityId` | Finds events attached to a parent, e.g. every event under one customer |
| `action` | Repeatable |
| `actorId` | Tenant user or customer id |
| `actorType` | `USER` \| `CUSTOMER` \| `SYSTEM` \| `WEBHOOK` |
| `branchId` | Tenant-scoped callers only |
| `from` / `to` | IST calendar dates, inclusive; max 12-month interactive range |
| `limit`, `cursor` | Standard |

```json
{
  "success": true,
  "data": [
    {
      "id": "aud_01PAY...",
      "occurredAt": "2026-09-14T10:30:00+05:30",
      "action": "PAYMENT_RECORDED",
      "actionLabel": "Payment recorded",
      "entity": {
        "type": "PAYMENT",
        "id": "pay_01HQ8Z...",
        "displayLabel": "Receipt SG/MGR/2026/001284",
        "path": "/payments/pay_01HQ8Z"
      },
      "parentEntities": [
        { "type": "CUSTOMER", "id": "cus_01HQ8Z...", "displayLabel": "Anjali Menon", "path": "/customers/cus_01HQ8Z" },
        { "type": "SCHEME", "id": "sch_01HQ8Z...", "displayLabel": "MGR/DH11/2026/00318", "path": "/schemes/sch_01HQ8Z" }
      ],
      "actor": { "actorType": "USER", "id": "usr_01HQ8...", "name": "Priya S", "role": "BRANCH_STAFF" },
      "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
      "summary": "Recorded ₹5,000 by UPI",
      "changes": [
        { "field": "status", "before": null, "after": "SUCCESS" }
      ],
      "requestId": "req_01..."
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false }
}
```

`summary` is a server-rendered, human-readable sentence. The timeline UI renders it directly; `changes` powers an expandable detail row.

---

## 3. Entity timeline

Entity-scoped endpoints return the same event shape with the subject echoed:

```json
{
  "success": true,
  "data": [ ],
  "meta": {
    "nextCursor": null,
    "hasMore": false,
    "entity": { "type": "CUSTOMER", "id": "cus_01HQ8Z...", "displayLabel": "Anjali Menon" }
  }
}
```

A customer timeline returns events where the customer is the entity **or** appears in `parentEntityRefs` — so enrolments, payments, redemptions, nominee edits and grievances all surface in one chronological thread.

---

## 4. Audited actions

Minimum set, all P1:

```
CUSTOMER_CREATED            CUSTOMER_UPDATED
CUSTOMER_BLOCKED            CUSTOMER_UNBLOCKED
CUSTOMER_KYC_SUBMITTED      CUSTOMER_KYC_DECIDED
CUSTOMER_WHATSAPP_OPT_CHANGED CUSTOMER_NOTE_ADDED

NOMINEE_ADDED               NOMINEE_UPDATED               NOMINEE_REMOVED

SCHEME_ENROLLED             SCHEME_STATUS_CHANGED
FLEXIBLE_CAP_APPLIED

PAYMENT_RECORDED            PAYMENT_STATUS_CHANGED
PAYMENT_ALLOCATED           PAYMENT_REVERSED
PAYMENT_INTENT_CREATED      PAYMENT_INTENT_RELEASED
PAYMENT_LINK_CREATED        PAYMENT_LINK_RESENT             PAYMENT_LINK_CANCELLED
PAYMENT_RECONCILED          PAYMENT_SHARED_WHATSAPP
RECEIPT_ISSUED
GOLD_CREDIT_POSTED          GOLD_RATE_PUBLISHED

MATURITY_RECORDED
REDEMPTION_REQUESTED        REDEMPTION_APPROVED
REDEMPTION_REJECTED         REDEMPTION_COMPLETED
SCHEME_CLOSED_PREMATURE

GRIEVANCE_CREATED           GRIEVANCE_ASSIGNED
GRIEVANCE_REPLIED           GRIEVANCE_STATUS_CHANGED
GRIEVANCE_PRIORITY_CHANGED  GRIEVANCE_REOPENED

CASH_HANDOVER_SUBMITTED     CASH_HANDOVER_ACCEPTED
CASH_HANDOVER_REJECTED      CASH_DISCREPANCY_RESOLVED
CASH_HANDOVER_CANCELLED

MESSAGE_RESENT

STAFF_CREATED               STAFF_DEACTIVATED
BRANCH_CREATED              BRANCH_DEACTIVATED
PLAN_CREATED                PLAN_UPDATED
TENANT_SETTINGS_UPDATED
```

Adding an action is additive. Renaming or removing one is a breaking change, because stored events carry the string.

Each event selects exactly one primary action. For example, a direct payment request uses `PAYMENT_RECORDED`; its allocation, receipt and gold-credit effects are captured in that event's whitelisted changes/metadata rather than generating extra events. `PAYMENT_ALLOCATED`, `RECEIPT_ISSUED` and `GOLD_CREDIT_POSTED` are used only when those actions happen later as independent mutations or jobs.

---

## 5. Storage

```json
{
  "id": "aud_01PAY...",
  "tenantId": "tnt_01...",
  "branchId": "brn_01...",
  "occurredAt": "2026-09-14T10:30:00+05:30",
  "action": "PAYMENT_RECORDED",
  "entityType": "PAYMENT",
  "entityId": "pay_01...",
  "entityDisplayLabel": "Receipt SG/MGR/2026/001284",
  "parentEntityRefs": [
    { "type": "CUSTOMER", "id": "cus_01...", "displayLabel": "Anjali Menon" },
    { "type": "SCHEME", "id": "sch_01...", "displayLabel": "MGR/DH11/2026/00318" }
  ],
  "actor": { "actorType": "USER", "id": "usr_01...", "name": "Priya S", "role": "BRANCH_STAFF" },
  "summary": "Recorded ₹5,000 by UPI",
  "changes": [ { "field": "status", "before": null, "after": "SUCCESS" } ],
  "requestId": "req_01...",
  "ipHash": "sha256:...",
  "userAgentFamily": "Chrome Android",
  "metadata": {}
}
```

```javascript
{ tenantId: 1, occurredAt: -1, id: -1 }
{ tenantId: 1, entityType: 1, entityId: 1, occurredAt: -1 }
{ tenantId: 1, "parentEntityRefs.type": 1, "parentEntityRefs.id": 1, occurredAt: -1 }
{ tenantId: 1, "actor.id": 1, occurredAt: -1 }
{ tenantId: 1, action: 1, occurredAt: -1 }
```

### Hard rules

- **Append-only.** No application role has update or delete rights on the collection. Enforce at the database-user level, not only in code.
- `entityDisplayLabel` and `parentEntityRefs[].displayLabel` are **snapshots** taken at write time. A later rename does not rewrite history.
- The IP is stored as a salted hash, never raw. The user agent is stored as a coarse family string.
- **Never written:** secrets, API keys, OTPs, raw tokens, passwords, full card data, Aadhaar numbers, or unrestricted free-text payload snapshots.
- `changes` carries only whitelisted business fields. Money is recorded in paise; weight in milligrams.
- Retention is indefinite in V1. Archival to cold storage is P2.

---

## 6. Writing events

For a single-entity tenant business mutation, one event is written inside the business transaction:

```
BEGIN TRANSACTION
  … business writes …
  insert audit_event
COMMIT
→ return { ..., auditEventId }
```

Rules:

- A single-entity mutation returns `data.auditEventId`.
- A bulk operation over N independently affected entities writes N events, not one. A synchronous bulk response returns `data.auditEventIds` in target order, or an `auditEventId` on each per-entity result row when partial success is possible. An asynchronous `202` response only confirms queueing; the completed job result exposes `auditEventId` on every successfully mutated entity.
- Supporting document writes inside one single-entity mutation do not create extra request-level events. The event may reference all affected parent entities and record whitelisted changes.
- A webhook-driven write uses `actorType: "WEBHOOK"` with the provider name in `actor.name` and `actor.id: null`.
- A scheduled job uses `actorType: "SYSTEM"` with the job name.
- `requestId` is the same trace id returned in `X-Trace-Id`, so a support ticket can be traced from a customer complaint to the exact request.
- Read operations, validation/preview calls, authentication/OTP/session operations and webhook receipt acknowledgements are **not** tenant business audit events. The asynchronous business write produced by a verified webhook is audited.

---

## 7. UI surface

The timeline appears as a tab on the customer, scheme, payment and grievance pages, plus a tenant-wide "Activity & audit" screen under Settings.

One row renders: icon by `action`, `summary`, actor name, relative time, branch, and an expandable `changes` table. Filters map one-to-one to the query parameters in §2.

This is distinct from `GET /admin/dashboard/activity` (`14 §7`), which is a short, friendly, unfiltered live tail for the owner's dashboard. The audit timeline is the complete, filterable, permission-gated record.

---

## 8. Acceptance criteria

- Every financial, customer, nominee, scheme, cash and grievance mutation is auditable.
- Events are append-only, tenant-scoped and branch-filtered.
- Customer, scheme, payment and grievance timelines are cursor paginated.
- Audit payloads exclude secrets and prohibited sensitive data.
- A rolled-back transaction leaves no event behind.
- Every single-entity tenant business mutation response carries the matching `auditEventId`; bulk mutation responses carry all matching ids.
