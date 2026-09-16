# 04 — Customers

Fields captured: name, mobile, date of birth, address. KYC is Aadhaar (front + back) **or** PAN, optional unless the tenant mandates it. Identifier is the **passbook number**.

Branch is never selected in the UI — it comes from the acting user's token (or `X-Acting-Branch-Id` for an owner).

Every customer, KYC and customer-status mutation success response returns `data.auditEventId` under `00 §12.1`, including endpoints whose full response is omitted for brevity.

---

## 1. Endpoints

| Method | Path | Phase | Permission |
|---|---|---|---|
| `GET` | `/admin/customers` | P1 | `customer.read` |
| `POST` | `/admin/customers` | P1 | `customer.write` |
| `GET` | `/admin/customers/analytics` | P1 | `report.read` |
| `GET` | `/admin/customers/check-mobile` | P1 | `customer.read` |
| `GET` | `/admin/customers/:customerId` | P1 | `customer.read` |
| `PATCH` | `/admin/customers/:customerId` | P1 | `customer.write` |
| `POST` | `/admin/customers/:customerId/block` | P1 | `customer.block` |
| `POST` | `/admin/customers/:customerId/unblock` | P1 | `customer.block` |
| `GET` | `/admin/customers/:customerId/schemes` | P1 | `customer.read` |
| `GET` | `/admin/customers/:customerId/payments` | P1 | `customer.read` |
| `GET` | `/admin/customers/:customerId/messages` | P1 | `customer.read` |
| `PUT` | `/admin/customers/:customerId/kyc` | P1 | `customer.write` |
| `POST` | `/admin/customers/:customerId/kyc/verify` | P1 | `customer.write` |
| `PATCH` | `/admin/customers/:customerId/whatsapp-opt` | P1 | `customer.write` |
| `POST` | `/admin/customers/:customerId/notes` | P1.5 | `customer.write` |
| `GET` | `/admin/customers/:customerId/statement` | P1 | `customer.read` |
| `GET` | `/admin/customers/:customerId/nominee` | P1 | `customer.read` |
| `PUT` | `/admin/customers/:customerId/nominee` | P1 | `customer.write` |
| `DELETE` | `/admin/customers/:customerId/nominee` | P1 | `customer.write` |
| `GET` | `/admin/customers/:customerId/audit-events` | P1 | `audit.read` |

> **Routing order matters.** Register the literal `/admin/customers/analytics` route **before** `/admin/customers/:customerId`, or Express will read `analytics` as a customer id and return `404 RESOURCE_NOT_FOUND`. The same applies to `/admin/customers/check-mobile`. Add an automated routing test asserting that `GET /admin/customers/analytics` returns the analytics payload and never a customer lookup.

The same set exists under `/staff/customers/*` with identical payloads, automatically scoped to the staff member's branch, minus `block`/`unblock` and minus full-PII mobile.

---

## 2. Create customer

**`POST /admin/customers`**

Headers: `X-Idempotency-Key`

```json
{
  "name": "Anjali Menon",
  "mobile": "9847112233",
  "dateOfBirth": "1992-04-18",
  "address": {
    "line1": "18 Kadavanthra Road",
    "line2": "Near Metro Pillar 412",
    "city": "Kochi",
    "pincode": "682020"
  },
  "kyc": {
    "type": "AADHAAR",
    "frontUploadId": "upl_01HQ8A...",
    "backUploadId": "upl_01HQ8B...",
    "number": null
  },
  "whatsappOptIn": true,
  "note": "Referred by Suresh"
}
```

Rules:
- `name`, `mobile` required. `dateOfBirth` and `address` optional at creation but required before enrolment if the tenant mandates them (they don't by default).
- `mobile` is 10 digits, Indian. Unique per tenant → `409 CUSTOMER_MOBILE_EXISTS`.
- `kyc` is optional in the body. If `kycMandatory` is on, enrolment (not creation) is what blocks.
- For `type: "AADHAAR"` → `frontUploadId` and `backUploadId` required, `number` must be omitted (we do not store Aadhaar numbers).
- For `type: "PAN"` → `frontUploadId` required, `number` required and validated against the PAN format.
- `branchId` is **not accepted** in the body. Derived from token.

**Response `201`**
```json
{
  "success": true,
  "data": {
    "id": "cus_01HQ8Z3K7M9P2R4T6V8X0Y",
    "passbookNumber": "MGR/2026/00412",
    "name": "Anjali Menon",
    "mobile": "9847112233",
    "dateOfBirth": "1992-04-18",
    "address": { "line1": "18 Kadavanthra Road", "line2": "Near Metro Pillar 412", "city": "Kochi", "pincode": "682020" },
    "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
    "status": "ACTIVE",
    "kyc": { "type": "AADHAAR", "status": "SUBMITTED", "submittedAt": "2026-09-14T10:30:00+05:30" },
    "whatsappOptIn": true,
    "audit": { "createdAt": "2026-09-14T10:30:00+05:30", "createdBy": { "id": "usr_01HQ8...", "name": "Rahul Nair" }, "version": 1 },
    "auditEventId": "aud_01CUS..."
  }
}
```

**Limit failure**
```json
{
  "success": false,
  "error": {
    "code": "LIMIT_ACTIVE_CUSTOMERS",
    "message": "Your Starter plan allows 100 active customers. You have 100.",
    "details": { "limitKey": "activeCustomers", "limit": 100, "used": 100, "currentPlan": "STARTER", "suggestedPlan": "GROWTH", "upgradeUrl": "/settings/subscription" }
  }
}
```

An "active customer" counts as a customer with at least one scheme in `ACTIVE` or `LOCKED`. Creating a customer with no scheme does not consume a seat — the limit bites at enrolment. The counter is recomputed from the ledger by a nightly job and cached on the subscription document.

**Duplicate check before submit** — `GET /admin/customers/check-mobile?mobile=9847112233`
```json
{
  "success": true,
  "data": {
    "exists": true,
    "customer": {
      "id": "cus_01HQ8...",
      "name": "Anjali Menon",
      "passbookNumber": "MGR/2026/00412",
      "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
      "activeSchemes": 1,
      "inCallerBranch": true
    }
  }
}
```

When `inCallerBranch` is `false`, staff at another branch see that the mobile is taken but get only the branch name — not the customer record. The UI should show "This number is registered at Panampilly Nagar branch" and offer to continue to enrolment there rather than creating a duplicate.

---

## 3. List customers

**`GET /admin/customers`**

| Query param | Values |
|---|---|
| `q` | Free text — name, mobile, passbook number, scheme number |
| `branchId` | Tenant-scoped roles only; ignored for branch-scoped users |
| `status` | `ACTIVE` \| `BLOCKED` \| `INACTIVE` |
| `schemeStatus` | `ACTIVE` \| `MATURED` \| `REDEEMED` \| `CLOSED_PREMATURE` \| `NONE` |
| `kycStatus` | `NOT_SUBMITTED` \| `SUBMITTED` \| `VERIFIED` \| `REJECTED` |
| `hasOverdue` | `true` \| `false` |
| `enrolledFrom` / `enrolledTo` | `YYYY-MM-DD` |
| `sort` | `createdAt:desc` (default), `name:asc`, `lastPaymentAt:desc` |
| `limit`, `cursor` | Standard |

```json
{
  "success": true,
  "data": [
    {
      "id": "cus_01HQ8Z...",
      "passbookNumber": "MGR/2026/00412",
      "name": "Anjali Menon",
      "mobile": "9847XXXX33",
      "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
      "status": "ACTIVE",
      "kycStatus": "SUBMITTED",
      "schemeSummary": { "active": 1, "matured": 0, "closed": 2 },
      "totals": {
        "totalPaid": { "amountPaise": 2000000, "amountDisplay": "₹20,000" },
        "goldAccrued": { "weightMg": 2761, "weightDisplay": "2.761 g" }
      },
      "nextDue": { "date": "2026-09-20", "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" }, "daysAway": 6 },
      "overdue": { "count": 0, "amount": { "amountPaise": 0, "amountDisplay": "₹0" } },
      "lastPaymentAt": "2026-08-20T11:14:00+05:30"
    }
  ],
  "meta": { "nextCursor": "eyJpZCI6...", "hasMore": true, "limit": 20 }
}
```

---

## 4. Customer detail (the 360 view)

**`GET /admin/customers/:customerId`**

One call powers the whole customer page header plus the first tab. Related lists are separate paginated calls.

```json
{
  "success": true,
  "data": {
    "id": "cus_01HQ8Z...",
    "passbookNumber": "MGR/2026/00412",
    "name": "Anjali Menon",
    "mobile": "9847112233",
    "dateOfBirth": "1992-04-18",
    "age": 34,
    "address": { "line1": "18 Kadavanthra Road", "line2": "Near Metro Pillar 412", "city": "Kochi", "pincode": "682020" },
    "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
    "status": "ACTIVE",
    "whatsappOptIn": true,
    "kyc": {
      "type": "AADHAAR",
      "status": "VERIFIED",
      "number": null,
      "documents": [
        { "side": "FRONT", "url": "https://cdn.../signed?exp=...", "expiresAt": "2026-09-14T10:45:00+05:30" },
        { "side": "BACK", "url": "https://cdn.../signed?exp=...", "expiresAt": "2026-09-14T10:45:00+05:30" }
      ],
      "verifiedBy": { "id": "usr_01HQ8...", "name": "Priya S" },
      "verifiedAt": "2026-04-02T12:00:00+05:30"
    },
    "totals": {
      "totalPaid": { "amountPaise": 2000000, "amountDisplay": "₹20,000" },
      "goldAccrued": { "weightMg": 2761, "weightDisplay": "2.761 g" },
      "currentValueAtTodayRate": { "amountPaise": 2001725, "amountDisplay": "₹20,017" },
      "totalRedeemed": { "amountPaise": 4500000, "amountDisplay": "₹45,000" },
      "lifetimePayments": 34
    },
    "schemeSummary": {
      "active": 1,
      "locked": 0,
      "matured": 0,
      "redeemed": 2,
      "closedPremature": 0,
      "defaulted": 0
    },
    "nextDue": {
      "schemeId": "sch_01HQ8...",
      "schemeNumber": "MGR/GS/2026/00318",
      "installmentNumber": 5,
      "date": "2026-09-20",
      "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "daysAway": 6,
      "status": "DUE"
    },
    "overdue": { "count": 0, "amount": { "amountPaise": 0, "amountDisplay": "₹0" }, "oldestDueDate": null },
    "engagement": {
      "messagesSentLast30Days": 4,
      "lastMessageAt": "2026-09-10T09:00:00+05:30",
      "lastMessageStatus": "DELIVERED",
      "deliveryFailuresLast30Days": 0,
      "hasRegisteredDevice": true,
      "lastAppLoginAt": "2026-09-12T20:14:00+05:30"
    },
    "nominee": {
      "name": "Meera Menon",
      "relationship": "SPOUSE",
      "relationshipLabel": "Spouse",
      "mobile": "9847001122",
      "notes": "Call if the customer cannot be reached",
      "updatedAt": "2026-09-14T13:20:00+05:30",
      "updatedBy": { "id": "usr_01HQ8...", "name": "Priya S" }
    },
    "grievanceSummary": {
      "open": 1,
      "inProgress": 0,
      "waitingForCustomer": 0,
      "lastActivityAt": "2026-09-14T12:05:00+05:30"
    },
    "notes": [
      { "id": "nte_01", "text": "Referred by Suresh", "by": { "id": "usr_01HQ8...", "name": "Rahul Nair" }, "at": "2026-04-01T10:00:00+05:30" }
    ],
    "audit": { "createdAt": "2026-04-01T10:00:00+05:30", "createdBy": { "id": "usr_01HQ8...", "name": "Rahul Nair" }, "version": 5 }
  }
}
```

Full `mobile` is returned only to holders of `customer.read.pii`. Others receive the masked form — **including the nominee's mobile**.

When no nominee is configured, `"nominee": null`.

---

## 5. Customer's schemes — active and past

**`GET /admin/customers/:customerId/schemes`**

Query: `status` (repeatable), `includeClosedDetail=true`, `limit`, `cursor`.

The designer should render this as two groups: **Active** (`ACTIVE`, `LOCKED`, `DEFAULTED`, `MATURED`) and **Past** (`REDEEMED`, `CLOSED_PREMATURE`). Both come from this one endpoint.

```json
{
  "success": true,
  "data": [
    {
      "id": "sch_01HQ8...",
      "schemeNumber": "MGR/GS/2026/00318",
      "plan": { "id": "spl_01HQ7...", "name": "Swarna Plus 11", "valueBasis": "GOLD_WEIGHT", "paymentPattern": "FIXED" },
      "status": "ACTIVE",
      "group": "ACTIVE",
      "startDate": "2026-05-20",
      "maturityDate": "2027-04-20",
      "durationMonths": 11,
      "installmentAmount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "progress": {
        "installmentsPaid": 4,
        "installmentsTotal": 11,
        "percentComplete": 36.4,
        "amountPaid": { "amountPaise": 2000000, "amountDisplay": "₹20,000" },
        "amountRemaining": { "amountPaise": 3500000, "amountDisplay": "₹35,000" }
      },
      "goldAccrued": { "weightMg": 2761, "weightDisplay": "2.761 g" },
      "nextDue": { "installmentNumber": 5, "date": "2026-09-20", "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" }, "daysAway": 6, "status": "DUE" },
      "overdueCount": 0,
      "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" }
    },
    {
      "id": "sch_01HQ7Z...",
      "schemeNumber": "MGR/CS/2025/00104",
      "plan": { "id": "spl_01HQ6...", "name": "Dhanam 11", "valueBasis": "CASH", "paymentPattern": "FIXED" },
      "status": "REDEEMED",
      "group": "PAST",
      "startDate": "2025-01-10",
      "maturityDate": "2025-12-10",
      "closedAt": "2025-12-14T11:20:00+05:30",
      "closureType": "MATURITY_REDEMPTION",
      "progress": { "installmentsPaid": 11, "installmentsTotal": 11, "percentComplete": 100 },
      "settlement": {
        "totalPaid": { "amountPaise": 2200000, "amountDisplay": "₹22,000" },
        "benefitApplied": { "type": "ONE_FREE_INSTALLMENT", "amountPaise": 200000, "amountDisplay": "₹2,000" },
        "finalValue": { "amountPaise": 2400000, "amountDisplay": "₹24,000" },
        "redemptionMode": "PURCHASE_ADJUSTMENT",
        "billNumber": "SG/INV/2025/8841"
      }
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false }
}
```

---

## 6. Customer's payment history

**`GET /admin/customers/:customerId/payments`**

Query: `schemeId`, `mode`, `status`, `from`, `to`, `limit`, `cursor`.

```json
{
  "success": true,
  "data": [
    {
      "id": "pay_01HQ8...",
      "receiptNumber": "SG/MGR/2026/001284",
      "scheme": { "id": "sch_01HQ8...", "schemeNumber": "MGR/GS/2026/00318", "planName": "Swarna Plus 11" },
      "installmentNumber": 4,
      "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "goldCredited": { "weightMg": 689, "weightDisplay": "0.689 g" },
      "rateApplied": { "ratePerGramPaise": 725000, "ratePerGramDisplay": "₹7,250" },
      "mode": "ONLINE_GATEWAY",
      "modeLabel": "Online payment",
      "reference": "T2409141030123456789",
      "status": "SUCCESS",
      "paidAt": "2026-08-20T11:14:00+05:30",
      "collectedBy": null,
      "source": "CUSTOMER_APP",
      "isLateSuccess": false,
      "receiptUrl": "https://cdn.../receipt/pay_01HQ8.pdf",
      "passbookImageUrl": "https://cdn.../passbook/pay_01HQ8.png"
    },
    {
      "id": "pay_01HQ7...",
      "receiptNumber": "SG/MGR/2026/001102",
      "scheme": { "id": "sch_01HQ8...", "schemeNumber": "MGR/GS/2026/00318", "planName": "Swarna Plus 11" },
      "installmentNumber": 3,
      "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "goldCredited": { "weightMg": 695, "weightDisplay": "0.695 g" },
      "rateApplied": { "ratePerGramPaise": 719000, "ratePerGramDisplay": "₹7,190" },
      "mode": "CASH",
      "modeLabel": "Cash",
      "reference": null,
      "status": "SUCCESS",
      "paidAt": "2026-07-20T16:02:00+05:30",
      "collectedBy": { "id": "usr_01HQ8...", "name": "Rahul Nair", "role": "BRANCH_STAFF" },
      "source": "STAFF_APP",
      "isLateSuccess": false,
      "receiptUrl": "https://cdn.../receipt/pay_01HQ7.pdf",
      "passbookImageUrl": "https://cdn.../passbook/pay_01HQ7.png"
    }
  ],
  "meta": { "nextCursor": "eyJpZCI6...", "hasMore": true }
}
```

---

## 7. WhatsApp reminder history for a customer

**`GET /admin/customers/:customerId/messages`**

Query: `messageType`, `status`, `from`, `to`, `limit`, `cursor`.

```json
{
  "success": true,
  "data": [
    {
      "id": "msg_01HQ8...",
      "messageType": "PAYMENT_DUE",
      "messageTypeLabel": "Payment due reminder",
      "scheme": { "id": "sch_01HQ8...", "schemeNumber": "MGR/GS/2026/00318" },
      "installmentNumber": 5,
      "offsetLabel": "5 days before due",
      "status": "DELIVERED",
      "sentAt": "2026-09-15T09:00:00+05:30",
      "deliveredAt": "2026-09-15T09:00:04+05:30",
      "failureReason": null,
      "templateName": "sreegold_payment_due_v1",
      "hasPaymentLink": true,
      "paymentLinkStatus": "OPENED",
      "canResend": false
    },
    {
      "id": "msg_01HQ7...",
      "messageType": "PAYMENT_SUCCESS",
      "messageTypeLabel": "Payment confirmation",
      "scheme": { "id": "sch_01HQ8...", "schemeNumber": "MGR/GS/2026/00318" },
      "installmentNumber": 4,
      "status": "FAILED",
      "sentAt": "2026-08-20T11:14:12+05:30",
      "deliveredAt": null,
      "failureReason": "Recipient has not opted in to receive messages from this business",
      "failureCode": "131047",
      "templateName": "sreegold_payment_success_v1",
      "hasPaymentLink": false,
      "canResend": true
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false }
}
```

Summary counters for the tab header come from `?includeSummary=true`:
```json
{
  "meta": {
    "summary": { "total": 28, "delivered": 26, "failed": 2, "deliveryRatePercent": 92.9 }
  }
}
```

---

## 8. KYC

**`PUT /admin/customers/:customerId/kyc`**
```json
{
  "type": "PAN",
  "frontUploadId": "upl_01HQ8C...",
  "number": "ABCDE1234F",
  "expectedVersion": 5
}
```

Replacing existing KYC resets `status` to `SUBMITTED` and archives the previous documents (retrievable in the audit log, not in the main payload).

**`POST /admin/customers/:customerId/kyc/verify`**
```json
{ "decision": "VERIFIED", "remarks": null }
```
`decision` ∈ `VERIFIED` | `REJECTED`. Rejection requires `remarks`, sets status `REJECTED`, and the customer's next enrolment is blocked if KYC is mandatory.

There is no third-party KYC verification API in V1 — this is a human eyeballing the uploaded image and clicking a button.

---

## 9. Block / unblock

**`POST /admin/customers/:customerId/block`**
```json
{ "reason": "Repeated cheque bounce", "blockAppAccess": true, "stopReminders": true }
```

Blocking prevents new enrolments and new payments, revokes app sessions if `blockAppAccess`, and suppresses reminder dispatch if `stopReminders`. Existing schemes remain intact and readable; the ledger is untouched.

---

## 9.1 Nominee (embedded contact details)

A nominee is **one optional object embedded in the Customer document**. There is no nominee collection, no nominee id, no KYC, no document upload, no verification or approval state, no scheme assignment, no multiple nominees, and no nominee version history. The Customer document's own `version` provides concurrency.

| Method | Path | Phase |
|---|---|---|
| `GET` | `/admin/customers/:customerId/nominee` | P1 |
| `PUT` | `/admin/customers/:customerId/nominee` | P1 |
| `DELETE` | `/admin/customers/:customerId/nominee?expectedVersion=6` | P1 |
| `GET` | `/staff/customers/:customerId/nominee` | P1 |
| `PUT` | `/staff/customers/:customerId/nominee` | P1 |
| `DELETE` | `/staff/customers/:customerId/nominee?expectedVersion=6` | P1 |

No new permission. Reads use `customer.read`, unmasked mobile needs `customer.read.pii`, writes need `customer.write`. Because the customer detail endpoint already returns `nominee` inline, the dedicated `GET` is optional for clients that load the full customer.

**There is no customer-app nominee workflow in V1.** Only jeweller staff maintain it.

### Create or replace

**`PUT /admin/customers/:customerId/nominee`**

```json
{
  "name": "Meera Menon",
  "relationship": "SPOUSE",
  "mobile": "9847001122",
  "notes": "Call if the customer cannot be reached",
  "expectedVersion": 5
}
```

| Field | Required | Rule |
|---|:--:|---|
| `name` | Yes | 2–120 characters |
| `relationship` | Yes | `SPOUSE` \| `PARENT` \| `CHILD` \| `SIBLING` \| `RELATIVE` \| `FRIEND` \| `OTHER` |
| `mobile` | Yes | Normalised with the existing phone rules |
| `notes` | No | Max 500 characters, operational contact note only |
| `expectedVersion` | Yes | Current Customer document version |

```json
{
  "success": true,
  "data": {
    "customerId": "cus_01HQ8Z...",
    "nominee": {
      "name": "Meera Menon",
      "relationship": "SPOUSE",
      "relationshipLabel": "Spouse",
      "mobile": "9847001122",
      "notes": "Call if the customer cannot be reached",
      "updatedAt": "2026-09-14T13:20:00+05:30",
      "updatedBy": { "id": "usr_01HQ8...", "name": "Priya S" }
    },
    "customerVersion": 6,
    "auditEventId": "aud_01NOM..."
  }
}
```

The first successful `PUT` writes `NOMINEE_ADDED`; later ones write `NOMINEE_UPDATED`. A version mismatch returns the standard `409 VERSION_CONFLICT`.

The nominee's mobile does **not** have to be unique, is never used for authentication, and never receives WhatsApp or push messages in V1.

### Read

**`GET /admin/customers/:customerId/nominee`** returns the same `nominee` object plus `customerVersion`. The mobile is masked when the caller lacks `customer.read.pii`. No nominee configured → `404 NOMINEE_NOT_FOUND`.

### Remove

**`DELETE /admin/customers/:customerId/nominee?expectedVersion=6`**

```json
{
  "success": true,
  "data": { "customerId": "cus_01HQ8Z...", "nominee": null, "customerVersion": 7, "auditEventId": "aud_01NOM..." }
}
```

Writes `NOMINEE_REMOVED`. No nominee to remove → `404 NOMINEE_NOT_FOUND`.

---

## 9.2 Tenant-wide customer analytics

**`GET /admin/customers/analytics`** — permission `report.read`.

Not covered by `14-dashboard-reports.md`, which has no customer/KYC/branch analytics. Do not duplicate this under a new route.

`TENANT_OWNER` may pass `branchId` or omit it for all branches. Branch-scoped `TENANT_ADMIN` and `BRANCH_MANAGER` are restricted automatically, and the response always echoes its effective scope.

```
GET /admin/customers/analytics?from=2026-09-01&to=2026-09-30&branchId=brn_01HQ7A&groupBy=DAY
```

| Query | Required | Values |
|---|:--:|---|
| `from` | Yes | `YYYY-MM-DD` |
| `to` | Yes | `YYYY-MM-DD`, max 12-month interactive range |
| `branchId` | No | Within the caller's scope only |
| `groupBy` | No | `DAY` \| `WEEK` \| `MONTH` \| `BRANCH`; defaults from the range length |

```json
{
  "success": true,
  "data": {
    "scope": { "level": "BRANCH", "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" }, "label": "MG Road" },
    "period": {
      "from": "2026-09-01",
      "to": "2026-09-30",
      "label": "1–30 Sep 2026",
      "comparedTo": { "from": "2026-08-01", "to": "2026-08-31", "label": "Previous period" }
    },
    "summary": [
      { "key": "TOTAL_CUSTOMERS", "label": "Total customers", "value": 302, "valueType": "count" },
      { "key": "ACTIVE_CUSTOMERS", "label": "Active customers", "value": 268, "valueType": "count" },
      { "key": "NEW_CUSTOMERS", "label": "New customers", "value": 18, "valueType": "count", "change": { "percent": 5.9, "direction": "up", "isGood": true } },
      { "key": "CUSTOMERS_WITH_ACTIVE_SCHEME", "label": "With active scheme", "value": 255, "valueType": "count" },
      { "key": "KYC_PENDING", "label": "KYC pending", "value": 82, "valueType": "count", "severity": "WARNING" },
      { "key": "WHATSAPP_OPTED_IN", "label": "WhatsApp opted in", "value": 280, "valueType": "count" }
    ],
    "totals": {
      "allCustomers": 302,
      "activeCustomers": 268,
      "inactiveCustomers": 31,
      "blockedCustomers": 3,
      "newCustomersInPeriod": 18,
      "customersWithActiveScheme": 255,
      "customersWithRegisteredDevice": 190,
      "whatsappOptedIn": 280,
      "kyc": { "notSubmitted": 54, "submitted": 20, "verified": 220, "rejected": 8 }
    },
    "charts": {
      "registrationTrend": {
        "chartType": "line",
        "title": "New customers",
        "subtitle": "Customers registered during the selected period",
        "xAxis": { "type": "category", "label": "Date", "format": "d MMM" },
        "yAxis": { "type": "count", "label": "Customers" },
        "series": [ { "key": "NEW_CUSTOMERS", "name": "New customers", "data": [ { "x": "2026-09-01", "y": 2, "yDisplay": "2" }, { "x": "2026-09-02", "y": 3, "yDisplay": "3" } ] } ],
        "summary": { "total": 18, "changePercent": 5.9, "changeDirection": "up" },
        "drilldown": { "enabled": true, "path": "/customers", "paramKey": "createdFrom" }
      },
      "customerStatusDistribution": {
        "chartType": "donut",
        "title": "Customer status",
        "yAxis": { "type": "count", "label": "Customers" },
        "series": [ { "key": "status", "name": "Customers", "data": [
          { "x": "Active", "y": 268, "yDisplay": "268", "statusKey": "ACTIVE" },
          { "x": "Inactive", "y": 31, "yDisplay": "31", "statusKey": "INACTIVE" },
          { "x": "Blocked", "y": 3, "yDisplay": "3", "statusKey": "BLOCKED" }
        ] } ],
        "summary": { "total": 302, "centreLabel": "302 customers" },
        "drilldown": { "enabled": true, "path": "/customers", "paramKey": "status", "paramSource": "statusKey" }
      },
      "kycDistribution": {
        "chartType": "donut",
        "title": "KYC status",
        "yAxis": { "type": "count", "label": "Customers" },
        "series": [ { "key": "kycStatus", "name": "Customers", "data": [
          { "x": "Verified", "y": 220, "yDisplay": "220", "statusKey": "VERIFIED" },
          { "x": "Submitted", "y": 20, "yDisplay": "20", "statusKey": "SUBMITTED" },
          { "x": "Not submitted", "y": 54, "yDisplay": "54", "statusKey": "NOT_SUBMITTED" },
          { "x": "Rejected", "y": 8, "yDisplay": "8", "statusKey": "REJECTED" }
        ] } ],
        "summary": { "total": 302, "centreLabel": "302 customers" },
        "drilldown": { "enabled": true, "path": "/customers", "paramKey": "kycStatus", "paramSource": "statusKey" }
      }
    },
    "generatedAt": "2026-09-14T14:30:00+05:30"
  }
}
```

### Calculation rules

- `newCustomersInPeriod` and `registrationTrend` use Customer `createdAt`.
- `activeCustomers`, `inactiveCustomers`, `blockedCustomers` and the KYC distribution are **current point-in-time** values within scope, not period values.
- `customersWithActiveScheme` is a distinct-customer count across schemes in `ACTIVE` or `LOCKED`.
- `customersWithRegisteredDevice` means a current registered FCM/device record. **Do not label it "app installed"** — a stale token and an installed app are not the same thing.
- **No historical "active customers over time" chart.** We do not snapshot customer activity per day, so that series cannot be reconstructed honestly. The registration trend is accurate; an active-customer trend would not be.
- Summary and charts cover the complete filtered population, never the current customer-list page.
- When effective `scope.level` is `BRANCH`, every total and chart is calculated only for that branch and `charts.customersByBranch` is omitted entirely. The API never leaks another branch's name, id, count or data point.
- `groupBy=BRANCH` and the `customersByBranch` chart are available only when the effective scope is `TENANT`. A branch-scoped caller cannot broaden scope by passing `branchId` or `groupBy=BRANCH`.

Suggested cache: 30–60 seconds keyed by tenant + scope + period. Never cache across tenant or branch scope keys.

Required indexes:

```javascript
{ tenantId: 1, branchId: 1, status: 1, createdAt: -1 }
{ tenantId: 1, branchId: 1, "kyc.status": 1, createdAt: -1 }
```

---

## 10. Customer statement (PDF)

**`GET /admin/customers/:customerId/statement`**

Query: `schemeId` (optional — omit for all schemes), `from`, `to`, `format=pdf`.

```json
{
  "success": true,
  "data": {
    "statementId": "stm_01HQ8...",
    "url": "https://cdn.../statement/stm_01HQ8.pdf",
    "expiresAt": "2026-09-14T11:00:00+05:30",
    "generatedAt": "2026-09-14T10:30:00+05:30",
    "period": { "from": "2026-04-01", "to": "2026-09-14" },
    "whatsappShareAvailable": true
  }
}
```

`POST /admin/customers/:customerId/statement/share-whatsapp` sends it as a document message (P1.5 — requires a document-header template).
