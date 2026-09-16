# 16 — Customer Grievances & Support Requests

A customer raises a request from the app. Jeweller staff triage, reply, resolve and close it. Everything is tenant- and branch-scoped, and every mutation writes an audit event.

**No tenant-configurable SLA settings in V1.** First-response targets and the reopen window are fixed server rules. There is no settings screen, no settings API and no extra database fields for them.

---

## 1. Endpoint map

### Customer app
| Method | Path | Phase |
|---|---|---|
| `POST` | `/app/grievances` | P1 |
| `GET` | `/app/grievances` | P1 |
| `GET` | `/app/grievances/:grievanceId` | P1 |
| `POST` | `/app/grievances/:grievanceId/messages` | P1 |
| `POST` | `/app/grievances/:grievanceId/reopen` | P1 |

### Tenant portal
| Method | Path | Phase | Permission |
|---|---|---|---|
| `GET` | `/admin/grievances` | P1 | `grievance.read` |
| `GET` | `/admin/grievances/:grievanceId` | P1 | `grievance.read` |
| `POST` | `/admin/grievances/:grievanceId/assign` | P1 | `grievance.assign` |
| `POST` | `/admin/grievances/:grievanceId/messages` | P1 | `grievance.reply` |
| `POST` | `/admin/grievances/:grievanceId/status` | P1 | `grievance.resolve` |
| `POST` | `/admin/grievances/:grievanceId/priority` | P1 | `grievance.assign` |
| `GET` | `/admin/grievances/:grievanceId/audit-events` | P1 | `audit.read` |

### Staff app
| Method | Path | Phase | Permission |
|---|---|---|---|
| `GET` | `/staff/grievances` | P1 | `grievance.read` |
| `GET` | `/staff/grievances/:grievanceId` | P1 | `grievance.read` |
| `POST` | `/staff/grievances/:grievanceId/messages` | P1 | `grievance.reply` |

Staff see their own branch's queue only, and cannot assign, change priority or change status unless they also hold the relevant permission.

---

## 2. Enums

```
category    PAYMENT | RECEIPT | SCHEME_RULE | GOLD_CREDIT | MATURITY |
            REDEMPTION | KYC | WHATSAPP | STAFF_SERVICE | OTHER
priority    LOW | NORMAL | HIGH | URGENT
status      OPEN | IN_PROGRESS | WAITING_FOR_CUSTOMER | RESOLVED | CLOSED
messageType PUBLIC_REPLY | INTERNAL_NOTE | SYSTEM_EVENT
actorType   USER | CUSTOMER | SYSTEM
```

### Status transitions

```
OPEN ──→ IN_PROGRESS ──┬──→ WAITING_FOR_CUSTOMER ──→ IN_PROGRESS
                       │
                       └──→ RESOLVED ──┬──→ CLOSED        (manual, or auto after 7 days)
                                       └──→ IN_PROGRESS   (customer reopen, within 7 days)
```

`CLOSED` is terminal. Any other transition returns `422 GRIEVANCE_STATUS_INVALID`.

---

## 3. Fixed SLA rules (not configurable)

| Priority | First-response target |
|---|---|
| `URGENT` | 1 hour |
| `HIGH` | 4 hours |
| `NORMAL` | 24 hours |
| `LOW` | 48 hours |

| Rule | Behaviour |
|---|---|
| Default priority | Customer-created tickets are always `NORMAL`. Only staff/admin may change priority. |
| Stored field | `firstResponseDueAt` is stored on the grievance. |
| Priority change **before** the first public staff response | Deadline is recalculated **from the original `createdAt`**, not from the time of the change. |
| Priority change **after** the first public staff response | `firstResponseDueAt` is frozen. The SLA is already complete. |
| Reopen window | A `RESOLVED` ticket may be reopened by the customer for **7 days** after `resolvedAt`. |
| Auto-close | A job closes `RESOLVED` tickets once the 7-day window lapses. |

Elapsed time is wall-clock; there are no business-hour calendars in V1.

Worked example: a `NORMAL` ticket created at 10:00 has `firstResponseDueAt` 10:00 next day. An admin raises it to `URGENT` at 14:00 with no reply yet → the deadline becomes 11:00 the same day, already breached, and `firstResponseOverdue` is `true`. Raising it after a reply has been sent changes nothing.

---

## 4. Create a request

**`POST /app/grievances`** — headers: `X-Idempotency-Key`

```json
{
  "category": "PAYMENT",
  "subject": "Payment is not showing in my passbook",
  "description": "I paid ₹2,500 through UPI on 13 September.",
  "relatedEntity": { "type": "PAYMENT", "id": "pay_01HQ8Z..." },
  "attachmentUploadIds": ["upl_01GRV..."]
}
```

| Field | Required | Rule |
|---|:--:|---|
| `category` | Yes | From the enum |
| `subject` | Yes | 5–140 characters |
| `description` | Yes | 10–4000 characters |
| `relatedEntity` | No | `type` ∈ `PAYMENT` \| `SCHEME` \| `REDEMPTION`; must belong to the signed-in customer |
| `attachmentUploadIds` | No | Max 5, purpose `GRIEVANCE_ATTACHMENT` |

`priority` is **not accepted** from the customer. `branchId` is derived from the customer's branch.

```json
{
  "success": true,
  "data": {
    "id": "grv_01HQ8Z...",
    "ticketNumber": "SG-2026-001284",
    "category": "PAYMENT",
    "subject": "Payment is not showing in my passbook",
    "status": "OPEN",
    "priority": "NORMAL",
    "createdAt": "2026-09-14T11:10:00+05:30",
    "firstResponseDueAt": "2026-09-15T11:10:00+05:30",
    "auditEventId": "aud_01GRV..."
  }
}
```

`ticketNumber` is issued from the transaction-safe counter service, unique per tenant.

---

## 5. List requests

```
GET /app/grievances?status=OPEN&limit=20&cursor=<opaque>
GET /admin/grievances?status=OPEN&category=PAYMENT&priority=HIGH&assigneeId=usr_01&branchId=brn_01&overdueOnly=true&q=Anjali&limit=20&cursor=<opaque>
```

Admin query: `status` (repeatable), `category`, `priority`, `assigneeId`, `unassignedOnly`, `branchId`, `overdueOnly`, `customerId`, `from`, `to`, `q` (ticket number, customer name, mobile, subject), `sort` ∈ `updatedAt:desc` (default) \| `createdAt:desc` \| `firstResponseDueAt:asc`, `includeSummary`.

```json
{
  "success": true,
  "data": [
    {
      "id": "grv_01HQ8Z...",
      "ticketNumber": "SG-2026-001284",
      "customer": { "id": "cus_01HQ8Z...", "name": "Anjali Menon", "mobile": "9847XXXX33", "passbookNumber": "MGR/2026/00412" },
      "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
      "category": "PAYMENT",
      "categoryLabel": "Payment",
      "subject": "Payment is not showing in my passbook",
      "priority": "HIGH",
      "status": "IN_PROGRESS",
      "statusLabel": "In progress",
      "assignee": { "id": "usr_01HQ8...", "name": "Priya S" },
      "createdAt": "2026-09-14T11:10:00+05:30",
      "lastPublicActivityAt": "2026-09-14T12:05:00+05:30",
      "firstResponseDueAt": "2026-09-14T15:10:00+05:30",
      "firstRespondedAt": "2026-09-14T12:05:00+05:30",
      "firstResponseOverdue": false,
      "messageCount": 3,
      "unreadForCaller": 1,
      "version": 3,
      "actions": { "canAssign": true, "canReply": true, "canChangeStatus": true, "canChangePriority": true }
    }
  ],
  "meta": {
    "nextCursor": null,
    "hasMore": false,
    "summary": {
      "open": 18,
      "inProgress": 7,
      "waitingForCustomer": 4,
      "resolved": 22,
      "closed": 104,
      "overdueFirstResponse": 3,
      "unassigned": 5,
      "resolvedToday": 9
    }
  }
}
```

The customer list returns the same rows minus `assignee`, `branch`, internal counts and `actions`, plus `canReopen` and `reopenAvailableUntil` on resolved tickets.

---

## 6. Detail

```
GET /app/grievances/:grievanceId
GET /admin/grievances/:grievanceId
GET /staff/grievances/:grievanceId
```

```json
{
  "success": true,
  "data": {
    "id": "grv_01HQ8Z...",
    "ticketNumber": "SG-2026-001284",
    "category": "PAYMENT",
    "categoryLabel": "Payment",
    "subject": "Payment is not showing in my passbook",
    "description": "I paid ₹2,500 through UPI on 13 September.",
    "priority": "HIGH",
    "status": "IN_PROGRESS",
    "customer": { "id": "cus_01HQ8Z...", "name": "Anjali Menon", "mobile": "9847XXXX33", "passbookNumber": "MGR/2026/00412" },
    "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
    "relatedEntity": {
      "type": "PAYMENT",
      "id": "pay_01HQ8Z...",
      "displayLabel": "Receipt SG/MGR/2026/001271",
      "path": "/payments/pay_01HQ8Z"
    },
    "assignee": { "id": "usr_01HQ8...", "name": "Priya S" },
    "sla": {
      "firstResponseDueAt": "2026-09-14T15:10:00+05:30",
      "firstRespondedAt": "2026-09-14T12:05:00+05:30",
      "firstResponseOverdue": false,
      "slaComplete": true
    },
    "messages": [
      {
        "id": "gmsg_01...",
        "messageType": "PUBLIC_REPLY",
        "body": "We are checking this payment with the branch.",
        "author": { "actorType": "USER", "id": "usr_01HQ8...", "name": "Priya S" },
        "attachments": [],
        "createdAt": "2026-09-14T12:05:00+05:30"
      },
      {
        "id": "gmsg_02...",
        "messageType": "INTERNAL_NOTE",
        "body": "UTR matches a late-success payment, posting now.",
        "author": { "actorType": "USER", "id": "usr_01HQ8...", "name": "Priya S" },
        "attachments": [],
        "createdAt": "2026-09-14T12:07:00+05:30"
      },
      {
        "id": "gmsg_03...",
        "messageType": "SYSTEM_EVENT",
        "body": "Status changed from Open to In progress",
        "author": { "actorType": "SYSTEM", "id": null, "name": "System" },
        "attachments": [],
        "createdAt": "2026-09-14T12:05:01+05:30"
      }
    ],
    "resolution": null,
    "canReopen": false,
    "reopenAvailableUntil": null,
    "version": 3,
    "createdAt": "2026-09-14T11:10:00+05:30",
    "updatedAt": "2026-09-14T12:05:00+05:30"
  }
}
```

**Customer responses never include `INTERNAL_NOTE` messages.** This is enforced at the query layer, not by client-side filtering. A customer response also omits `assignee`, `branch` and `sla`.

Attachment URLs are short-lived signed links, re-issued on each read.

---

## 7. Mutations

Every grievance mutation `POST` requires `X-Idempotency-Key`. Every mutation of an existing grievance also requires `expectedVersion`; creation has no prior version.

### Assign
**`POST /admin/grievances/:grievanceId/assign`** — headers: `X-Idempotency-Key`
```json
{ "assigneeId": "usr_01HQ8...", "expectedVersion": 3 }
```
`assigneeId: null` unassigns. The assignee must be an active tenant user with `grievance.reply` and, for a branch-scoped ticket, access to that branch.

### Change priority
**`POST /admin/grievances/:grievanceId/priority`** — headers: `X-Idempotency-Key`
```json
{ "priority": "URGENT", "reason": "Customer's maturity settlement is blocked", "expectedVersion": 3 }
```
Recalculates `firstResponseDueAt` from `createdAt` if no public staff reply exists yet; otherwise leaves it untouched. The response echoes both values.

### Reply or internal note
**`POST /admin/grievances/:grievanceId/messages`** — headers: `X-Idempotency-Key`
```json
{
  "messageType": "PUBLIC_REPLY",
  "body": "The payment is now visible in your passbook.",
  "attachmentUploadIds": [],
  "setStatus": "WAITING_FOR_CUSTOMER",
  "expectedVersion": 4
}
```
`setStatus` is optional and applies the transition in the same transaction, so replying and moving the ticket is one action.

`INTERNAL_NOTE` requires `grievance.reply` **and** a tenant-user token. A customer token attempting it gets `403 GRIEVANCE_INTERNAL_NOTE_FORBIDDEN`.

`POST /staff/grievances/:grievanceId/messages` uses the same request and response contract as the admin route and also requires `X-Idempotency-Key` plus `expectedVersion`; branch scope is enforced from the staff token.

The first successful `PUBLIC_REPLY` from a tenant user stamps `firstRespondedAt` and completes the SLA.

**`POST /app/grievances/:grievanceId/messages`** requires `X-Idempotency-Key` and takes the same body without `messageType` or `setStatus`; a customer message is always a `PUBLIC_REPLY` and moves `WAITING_FOR_CUSTOMER` back to `IN_PROGRESS`.

### Change status
**`POST /admin/grievances/:grievanceId/status`** — headers: `X-Idempotency-Key`
```json
{
  "status": "RESOLVED",
  "resolutionCode": "PAYMENT_POSTED",
  "resolutionSummary": "The delayed payment was matched and posted.",
  "expectedVersion": 5
}
```
`resolutionCode` ∈ `PAYMENT_POSTED` | `RECEIPT_REISSUED` | `EXPLAINED_TO_CUSTOMER` | `CORRECTED_RECORD` | `NO_ACTION_REQUIRED` | `DUPLICATE` | `OTHER`. Required for `RESOLVED`; `resolutionSummary` is required when the code is `OTHER`.

### Reopen
**`POST /app/grievances/:grievanceId/reopen`** — headers: `X-Idempotency-Key`
```json
{ "reason": "The amount still does not match my passbook.", "expectedVersion": 6 }
```
Allowed only while `status` is `RESOLVED` and within 7 days of `resolvedAt` → else `422 GRIEVANCE_REOPEN_WINDOW_EXPIRED`. Moves the ticket to `IN_PROGRESS`, appends the reason as a `PUBLIC_REPLY`, and clears `resolvedAt`. The first-response SLA is not restarted.

### Common mutation response
```json
{
  "success": true,
  "data": {
    "id": "grv_01HQ8Z...",
    "status": "RESOLVED",
    "priority": "HIGH",
    "firstResponseDueAt": "2026-09-14T15:10:00+05:30",
    "version": 6,
    "updatedAt": "2026-09-14T12:40:00+05:30",
    "auditEventId": "aud_01GRV..."
  }
}
```

Every mutation of an existing grievance takes `expectedVersion`; creation does not. A mismatch returns `409 VERSION_CONFLICT` with the current document in `error.details.current`.

---

## 8. Storage

```json
{
  "id": "grv_01HQ8Z...",
  "tenantId": "tnt_01...",
  "branchId": "brn_01...",
  "customerId": "cus_01...",
  "ticketNumber": "SG-2026-001284",
  "category": "PAYMENT",
  "subject": "Payment is not showing in my passbook",
  "description": "I paid ₹2,500 through UPI on 13 September.",
  "priority": "HIGH",
  "status": "IN_PROGRESS",
  "relatedEntityType": "PAYMENT",
  "relatedEntityId": "pay_01...",
  "assigneeId": "usr_01...",
  "firstResponseDueAt": "2026-09-14T15:10:00+05:30",
  "firstRespondedAt": "2026-09-14T12:05:00+05:30",
  "resolvedAt": null,
  "resolutionCode": null,
  "resolutionSummary": null,
  "reopenCount": 0,
  "closedAt": null,
  "lastPublicActivityAt": "2026-09-14T12:05:00+05:30",
  "version": 3,
  "createdAt": "2026-09-14T11:10:00+05:30",
  "updatedAt": "2026-09-14T12:05:00+05:30"
}
```

Messages live in a separate `grievance_messages` collection so a long thread never bloats the parent document.

```javascript
// grievances
{ tenantId: 1, ticketNumber: 1 }                              // unique
{ tenantId: 1, status: 1, updatedAt: -1 }
{ tenantId: 1, assigneeId: 1, status: 1, updatedAt: -1 }
{ tenantId: 1, customerId: 1, createdAt: -1 }
{ tenantId: 1, branchId: 1, status: 1, updatedAt: -1 }
{ tenantId: 1, status: 1, firstResponseDueAt: 1 }             // overdue queue
{ tenantId: 1, status: 1, resolvedAt: 1 }                     // auto-close job

// grievance_messages
{ tenantId: 1, grievanceId: 1, createdAt: 1 }
```

---

## 9. Notifications

Two new customer notification types (see `12 §8`):

```
GRIEVANCE_REPLY_RECEIVED
GRIEVANCE_STATUS_CHANGED
```

Delivered by FCM push and in-app notification only. **Grievances do not send WhatsApp messages in V1** — no new template, no quota consumption.

Staff/admin receive an in-app notification on assignment and on a customer reply to a ticket they own.

---

## 10. Cross-module surfaces

The customer detail payload (`04 §4`) gains a summary block:

```json
{
  "grievanceSummary": {
    "open": 1,
    "inProgress": 0,
    "waitingForCustomer": 0,
    "lastActivityAt": "2026-09-14T12:05:00+05:30"
  }
}
```

The portal alert centre (`03 §7`) gains two keys: `GRIEVANCE_OVERDUE_FIRST_RESPONSE` and `GRIEVANCE_UNASSIGNED`.

---

## 11. Background jobs

| Job | Cadence | Action |
|---|---|---|
| Overdue sweep | 15 min | Flags tickets past `firstResponseDueAt` with no public reply; feeds the alert centre |
| Auto-close | Hourly | Closes `RESOLVED` tickets older than 7 days from `resolvedAt`, writing a `SYSTEM_EVENT` message and a `GRIEVANCE_STATUS_CHANGED` audit event |

---

## 12. Acceptance criteria

- Customers can create, view, reply to and reopen eligible requests.
- Admin can filter, assign, change priority, reply, add internal notes, resolve and close.
- **Customers never receive internal notes**, enforced server-side.
- Tenant and branch isolation holds on every read and write.
- First-response deadlines follow the fixed table and recalculate correctly on a pre-reply priority change.
- Reopen works for exactly 7 days, then auto-close fires.
- Every mutation emits one audit event and returns its `auditEventId`.
- No tenant SLA configuration API, database field or settings screen exists.
