# 03 — Tenant Configuration, Branches, Staff, Gold Rate

Namespace `/api/v1/admin/*` unless stated. `tenantId` comes from the token, always.

Unless an endpoint is one of the explicit non-business exclusions in `00 §12.1`, every mutation success response in this file returns `data.auditEventId`, including mutations whose full response is omitted for brevity.

---

## 1. Business profile & branding

| Method | Path | Phase | Permission |
|---|---|---|---|
| `GET` | `/admin/settings/profile` | P1 | `tenant.settings.write` or read role |
| `PATCH` | `/admin/settings/profile` | P1 | `tenant.settings.write` |
| `GET` | `/admin/settings/branding` | P1 | — |
| `PATCH` | `/admin/settings/branding` | P1 | `tenant.branding.write` |

**`GET /admin/settings/profile`**
```json
{
  "success": true,
  "data": {
    "businessName": "Sree Gold Jewellery",
    "displayName": "Sree Gold",
    "ownerName": "Mahesh Kumar",
    "ownerMobile": "9846543210",
    "ownerEmail": "mahesh@sreegold.in",
    "address": { "line1": "42 MG Road", "city": "Kochi", "state": "Kerala", "pincode": "682011" },
    "supportNumber": "9846543211",
    "gstin": "32ABCDE1234F1Z5",
    "tenantCode": "SREEGOLD",
    "audit": { "updatedAt": "2026-08-02T14:10:00+05:30", "version": 6 }
  }
}
```

`gstin` is nullable and optional — it exists only so it can be printed on receipts. It is never required to operate.

**`PATCH /admin/settings/branding`**
```json
{
  "logoUploadId": "upl_01HQ8...",
  "primaryColor": "#7B1E1E",
  "secondaryColor": "#C9A227",
  "appDisplayName": "Sree Gold Savings",
  "expectedVersion": 6
}
```
```json
{
  "success": true,
  "data": {
    "logoUrl": "https://cdn.../logo.png",
    "primaryColor": "#7B1E1E",
    "secondaryColor": "#C9A227",
    "appDisplayName": "Sree Gold Savings",
    "previewUrls": {
      "appIcon": "https://cdn.../preview-icon.png",
      "receiptHeader": "https://cdn.../preview-receipt.png",
      "passbookImage": "https://cdn.../preview-passbook.png"
    },
    "audit": { "version": 7 },
    "auditEventId": "aud_01SET..."
  }
}
```

`previewUrls` are server-rendered samples so the branding screen can show a live preview of what the customer will actually receive — worth designing for, since colour choices land badly on the passbook image surprisingly often.

---

## 2. Operational settings

| Method | Path | Phase |
|---|---|---|
| `GET` | `/admin/settings/operations` | P1 |
| `PATCH` | `/admin/settings/operations` | P1 |

```json
{
  "success": true,
  "data": {
    "multiSchemePerCustomer": true,
    "kycMandatory": false,
    "kycAllowedTypes": ["AADHAAR", "PAN"],
    "customerSelfEnrolEnabled": true,
    "customerSelfRegistrationEnabled": true,
    "receiptPrefix": "SG",
    "receiptNumberFormat": "{prefix}/{branchCode}/{year}/{seq:6}",
    "passbookNumberFormat": "{branchCode}/{year}/{seq:5}",
    "schemeNumberFormat": "{branchCode}/{planCode}/{year}/{seq:5}",
    "goldPurity": "22K",
    "weightRoundingMode": "HALF_UP",
    "paymentReversalWindowHours": 48,
    "redemptionApprovalRequired": true,
    "termsAndConditions": "1. Scheme is valid for 11 months...",
    "audit": { "version": 4 }
  }
}
```

| Field | Effect |
|---|---|
| `multiSchemePerCustomer` | `false` → enrolment rejected with `ONE_SCHEME_POLICY` if the customer already has a scheme in `ACTIVE` or `LOCKED` |
| `kycMandatory` | `true` → enrolment rejected with `KYC_REQUIRED` unless KYC status is `SUBMITTED` or `VERIFIED` |
| `goldPurity` | Single tenant-wide purity. Display only — there is one rate, one purity. |
| `paymentReversalWindowHours` | Beyond this, reversal returns `REVERSAL_NOT_ALLOWED` |
| `redemptionApprovalRequired` | `false` → branch manager can complete redemption without an admin step |

Sequence format tokens: `{prefix}`, `{branchCode}`, `{planCode}`, `{year}`, `{yy}`, `{month}`, `{seq:N}` (zero-padded to N). Formats are locked once the first document of that type is issued — changing them afterwards returns `422 SEQUENCE_FORMAT_LOCKED`, which prevents duplicate receipt numbers.

---

## 3. Branches

| Method | Path | Phase | Permission |
|---|---|---|---|
| `GET` | `/admin/branches` | P1 | any tenant role |
| `POST` | `/admin/branches` | P1 | `branch.write` |
| `GET` | `/admin/branches/:branchId` | P1 | |
| `PATCH` | `/admin/branches/:branchId` | P1 | `branch.write` |
| `POST` | `/admin/branches/:branchId/deactivate` | P1 | `branch.write` |
| `POST` | `/admin/branches/:branchId/activate` | P1 | `branch.write` |
| `GET` | `/public/tenants/:tenantId/branches` | P1 | public, for the app's branch picker |

**`POST /admin/branches`**
```json
{
  "name": "Panampilly Nagar",
  "code": "PMN",
  "address": { "line1": "7 Ponnurunni Road", "city": "Kochi", "pincode": "682036" },
  "contactNumber": "9846543212"
}
```

`code` is uppercase alphanumeric, 2–6 chars, unique within the tenant, and immutable after creation since it is embedded in every receipt, passbook and scheme number issued by that branch.

Limit check runs first — on a Starter tenant creating a second branch:
```json
{
  "success": false,
  "error": {
    "code": "LIMIT_BRANCHES",
    "message": "Your Starter plan does not include multiple showrooms.",
    "details": { "limitKey": "branches", "limit": 0, "used": 1, "currentPlan": "STARTER", "suggestedPlan": "GROWTH", "upgradeUrl": "/settings/subscription" }
  }
}
```

**`GET /admin/branches`**
```json
{
  "success": true,
  "data": [
    {
      "id": "brn_01HQ7A...",
      "name": "MG Road",
      "code": "MGR",
      "address": { "line1": "42 MG Road", "city": "Kochi", "pincode": "682011" },
      "contactNumber": "9846543211",
      "status": "ACTIVE",
      "stats": {
        "activeCustomers": 268,
        "activeSchemes": 291,
        "staffCount": 4,
        "collectionThisMonth": { "amountPaise": 94200000, "amountDisplay": "₹9,42,000" },
        "pendingCashInHand": { "amountPaise": 1850000, "amountDisplay": "₹18,500" }
      },
      "audit": { "createdAt": "2026-03-15T11:05:00+05:30", "version": 2 }
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false }
}
```

**Deactivation guard** — a branch with active schemes cannot be deactivated:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "This branch has 291 active schemes. Close or transfer them before deactivating.",
    "details": { "activeSchemes": 291, "activeStaff": 4, "pendingCashHandovers": 2 }
  }
}
```

---

## 4. Staff

Created directly with mobile + password. No invite, no email flow.

| Method | Path | Phase | Permission |
|---|---|---|---|
| `GET` | `/admin/staff` | P1 | `staff.write` or read role |
| `POST` | `/admin/staff` | P1 | `staff.write` |
| `GET` | `/admin/staff/:staffId` | P1 | |
| `PATCH` | `/admin/staff/:staffId` | P1 | `staff.write` |
| `POST` | `/admin/staff/:staffId/reset-password` | P1 | `staff.write` |
| `POST` | `/admin/staff/:staffId/deactivate` | P1 | `staff.write` |
| `POST` | `/admin/staff/:staffId/activate` | P1 | `staff.write` |
| `POST` | `/admin/staff/:staffId/transfer-branch` | P1 | `staff.write` (tenant-scope only) |

**`POST /admin/staff`**
```json
{
  "name": "Rahul Nair",
  "mobile": "9846778899",
  "password": "Temp#2026",
  "role": "BRANCH_STAFF",
  "branchId": "brn_01HQ7A...",
  "scope": "BRANCH",
  "mustChangePassword": true
}
```

`scope` applies only when `role` is `TENANT_ADMIN`: `TENANT` gives them the whole tenant, `BRANCH` restricts them to `branchId` — this is the per-branch admin who sees only their own branch's reports. For `BRANCH_MANAGER` and `BRANCH_STAFF`, scope is always `BRANCH` and `branchId` is required.

```json
{
  "success": true,
  "data": {
    "id": "usr_01HQ8Z...",
    "name": "Rahul Nair",
    "mobile": "9846778899",
    "role": "BRANCH_STAFF",
    "scope": "BRANCH",
    "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
    "status": "ACTIVE",
    "mustChangePassword": true,
    "permissions": ["customer.read", "customer.write", "scheme.enrol", "payment.record", "cash.handover.create"],
    "audit": { "createdAt": "2026-09-14T10:30:00+05:30", "version": 1 },
    "auditEventId": "aud_01STF..."
  }
}
```

**`GET /admin/staff`** — query `branchId`, `role`, `status`, `q`, `limit`, `cursor`.
```json
{
  "success": true,
  "data": [
    {
      "id": "usr_01HQ8Z...",
      "name": "Rahul Nair",
      "mobile": "9846XXXX99",
      "role": "BRANCH_STAFF",
      "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
      "status": "ACTIVE",
      "lastLoginAt": "2026-09-14T09:12:00+05:30",
      "performance": {
        "collectionThisMonth": { "amountPaise": 18400000, "amountDisplay": "₹1,84,000" },
        "enrolmentsThisMonth": 12,
        "cashInHand": { "amountPaise": 450000, "amountDisplay": "₹4,500" }
      }
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false }
}
```

`performance.cashInHand` is the live unhandover-ed cash balance and is the number the branch admin acts on in the cash module (`11-cash-handover.md`).

**`POST /admin/staff/:staffId/deactivate`**
```json
{ "reason": "Resigned" }
```
Blocked if the staff member is holding cash:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "This staff member is holding ₹4,500 in cash. Settle the handover before deactivating.",
    "details": { "cashInHandPaise": 450000, "pendingHandovers": 1 }
  }
}
```

**`POST /admin/staff/:staffId/reset-password`**
```json
{ "mode": "SET_TEMPORARY", "temporaryPassword": "Temp#9182" }
```
`mode` ∈ `SET_TEMPORARY` (admin types one, returned once) | `SEND_OTP_LINK` (WhatsApp reset OTP to the staff's mobile).

---

## 5. Gold rate

Single purity, tenant-wide. Multiple changes per day allowed; the rate applied to a transaction is the one effective at the moment of posting, and it is snapshotted onto the ledger entry permanently.

| Method | Path | Phase | Permission |
|---|---|---|---|
| `GET` | `/admin/gold-rate/current` | P1 | any |
| `POST` | `/admin/gold-rate` | P1 | `goldrate.write` |
| `GET` | `/admin/gold-rate/history` | P1 | any |
| `GET` | `/app/gold-rate/current` | P1 | customer app |
| `GET` | `/staff/gold-rate/current` | P1 | staff app |

**`GET /admin/gold-rate/current`**
```json
{
  "success": true,
  "data": {
    "id": "rate_01HQ8...",
    "purity": "22K",
    "ratePerGram": { "ratePerGramPaise": 725000, "ratePerGramDisplay": "₹7,250" },
    "effectiveFrom": "2026-09-14T09:00:00+05:30",
    "setBy": { "id": "usr_01HQ8...", "name": "Mahesh Kumar" },
    "isSetForToday": true,
    "previousRate": {
      "ratePerGramPaise": 719000,
      "ratePerGramDisplay": "₹7,190",
      "changePaise": 6000,
      "changePercent": 0.83,
      "changeDirection": "up"
    }
  }
}
```

When no rate exists for today:
```json
{
  "success": true,
  "data": {
    "isSetForToday": false,
    "lastKnownRate": { "ratePerGramPaise": 719000, "ratePerGramDisplay": "₹7,190", "effectiveFrom": "2026-09-13T09:00:00+05:30" },
    "warning": "Today's gold rate is not set. Gold-weight scheme payments are blocked until you set it."
  }
}
```

This drives a blocking banner on the portal dashboard and staff app home. Any gold-scheme payment attempted in this state fails with `GOLD_RATE_NOT_SET`.

**`POST /admin/gold-rate`**
```json
{
  "ratePerGramPaise": 728000,
  "effectiveFrom": "2026-09-14T14:30:00+05:30",
  "note": "Afternoon revision"
}
```

`effectiveFrom` defaults to now. Back-dating is rejected beyond the current calendar day (`422 RATE_BACKDATE_NOT_ALLOWED`) because it would make already-posted conversions look wrong without actually changing them.

A large jump triggers a confirmation requirement rather than a silent accept:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "This rate is 12.4% higher than the previous rate. Confirm to proceed.",
    "details": { "previousPaise": 719000, "newPaise": 808000, "changePercent": 12.4, "confirmationRequired": true }
  }
}
```
Client retries with `"confirmLargeChange": true`.

**`GET /admin/gold-rate/history`** — query `from`, `to`, `limit`, `cursor`. Returns entries plus a `chart` block (`ChartSeries`, `chartType: "line"`, `yAxis.type: "currency"`) so the rate screen renders a trend line without a second call.

---

## 6. Subscription & usage (tenant view)

| Method | Path | Phase |
|---|---|---|
| `GET` | `/admin/subscription` | P1 |
| `GET` | `/admin/subscription/usage` | P1 |
| `GET` | `/admin/subscription/available-plans` | P1 |
| `POST` | `/admin/subscription/upgrade-request` | P1 |
| `GET` | `/admin/subscription/invoices` | P1 |

**`GET /admin/subscription`**
```json
{
  "success": true,
  "data": {
    "currentPlan": {
      "tier": "GROWTH",
      "name": "Growth",
      "monthlyPrice": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "billingCycle": "MONTHLY"
    },
    "status": "ACTIVE",
    "currentPeriodStart": "2026-09-01",
    "currentPeriodEnd": "2026-10-01",
    "daysRemaining": 17,
    "renewsAutomatically": false,
    "usage": {
      "activeCustomers": { "used": 412, "limit": 1000, "percent": 41.2, "status": "OK" },
      "branches": { "used": 2, "limit": 2, "percent": 100, "status": "AT_LIMIT" },
      "staffSeats": { "used": 6, "limit": 10, "percent": 60, "status": "OK" },
      "schemePlans": { "used": 4, "limit": 10, "percent": 40, "status": "OK" },
      "whatsappMessages": { "used": 4310, "limit": 5000, "percent": 86.2, "status": "NEAR_LIMIT", "resetsOn": "2026-10-01" }
    },
    "features": {
      "multiBranch": true,
      "customApp": false,
      "flexibleScheme": true,
      "goldWeightScheme": true,
      "prematureRedemption": true,
      "customerSelfEnrol": true,
      "advancedReports": false
    }
  }
}
```

`status` per limit ∈ `OK` (<80%) | `NEAR_LIMIT` (80–99%) | `AT_LIMIT` (100%) | `EXCEEDED`. The designer should render the meter colour off this field rather than recomputing thresholds.

**`GET /admin/subscription/available-plans`** returns all tiers with a `comparison` block flagging what the tenant gains or loses per tier, plus `isCurrent`, `isUpgrade`, `isDowngrade`, and `blockedReasons` when a downgrade is not currently possible. This is the pricing/comparison grid inside the portal.

```json
{
  "success": true,
  "data": [
    {
      "tier": "PRO",
      "name": "Pro",
      "monthlyPrice": { "amountPaise": 800000, "amountDisplay": "₹8,000" },
      "isCurrent": false,
      "isUpgrade": true,
      "limits": { "activeCustomers": 3000, "branches": 5, "staffSeats": 30, "whatsappMessagesPerMonth": 20000 },
      "gains": ["3,000 active customers", "5 showrooms", "Custom branded app", "20,000 WhatsApp messages"],
      "losses": [],
      "blockedReasons": []
    },
    {
      "tier": "STARTER",
      "name": "Starter",
      "monthlyPrice": { "amountPaise": 300000, "amountDisplay": "₹3,000" },
      "isCurrent": false,
      "isDowngrade": true,
      "gains": [],
      "losses": ["Multi-showroom", "Flexible schemes"],
      "blockedReasons": [
        { "limitKey": "activeCustomers", "message": "You have 412 active customers. Starter allows 100." },
        { "limitKey": "branches", "message": "You have 2 showrooms. Starter allows 1." }
      ]
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false }
}
```

**`POST /admin/subscription/upgrade-request`**
```json
{ "targetTier": "PRO", "billingCycle": "MONTHLY", "note": "Need 5 showrooms before Diwali" }
```
Creates a request visible in the platform panel. In V1 the actual plan change is executed by you from `/platform`; the tenant-facing action is a request, not a self-serve switch.

---

## 7. Alert centre

| Method | Path | Phase |
|---|---|---|
| `GET` | `/admin/alerts` | P1 |
| `POST` | `/admin/alerts/:alertId/dismiss` | P1 |

```json
{
  "success": true,
  "data": [
    { "id": "alt_01", "severity": "HIGH", "key": "GOLD_RATE_NOT_SET", "title": "Today's gold rate is not set", "message": "Gold-weight scheme payments are blocked.", "actionLabel": "Set rate", "actionPath": "/settings/gold-rate", "dismissible": false, "createdAt": "2026-09-14T09:00:00+05:30" },
    { "id": "alt_02", "severity": "MEDIUM", "key": "WHATSAPP_QUOTA_NEAR_LIMIT", "title": "WhatsApp quota 86% used", "message": "4,310 of 5,000 messages used. Resets 1 Oct.", "actionLabel": "View usage", "actionPath": "/settings/subscription", "dismissible": true },
    { "id": "alt_03", "severity": "MEDIUM", "key": "PENDING_CASH_HANDOVERS", "title": "3 cash handovers awaiting acceptance", "message": "₹42,500 pending across 2 staff.", "actionLabel": "Review", "actionPath": "/cash-handovers?status=PENDING", "count": 3, "dismissible": false },
    { "id": "alt_04", "severity": "LOW", "key": "LATE_SUCCESS_PAYMENTS", "title": "2 late-success payments recorded", "message": "Payments confirmed after the link expired.", "actionLabel": "Review", "actionPath": "/payments?filter=lateSuccess", "count": 2, "dismissible": true }
  ],
  "meta": { "nextCursor": null, "hasMore": false }
}
```

Alert keys: `GOLD_RATE_NOT_SET`, `WHATSAPP_QUOTA_NEAR_LIMIT`, `WHATSAPP_QUOTA_EXHAUSTED`, `PENDING_CASH_HANDOVERS`, `LATE_SUCCESS_PAYMENTS`, `WEBHOOK_FAILURES`, `SUBSCRIPTION_EXPIRING`, `SUBSCRIPTION_PAST_DUE`, `LIMIT_AT_CAPACITY`, `PENDING_REDEMPTION_APPROVALS`, `FLEXI_LOCK_DUE`, `TEMPLATE_MISSING`, `GRIEVANCE_OVERDUE_FIRST_RESPONSE`, `GRIEVANCE_UNASSIGNED`.

The grievance alert keys are generated from the fixed server SLA rules in `16-grievances.md`; they are alert outputs, not tenant-configurable settings.
