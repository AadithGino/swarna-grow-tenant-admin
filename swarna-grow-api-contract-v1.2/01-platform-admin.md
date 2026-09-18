# 01 — Platform Admin (Super Admin)

Namespace `/api/v1/platform/*`. Token type `PLATFORM_USER`. No `tenantId` in the token — tenant is always an explicit path parameter, and every action here is written to the platform audit log.

---

## 1. Platform auth

| Method | Path | Phase |
|---|---|---|
| `POST` | `/platform/auth/login` | P1 |
| `POST` | `/platform/auth/refresh` | P1 |
| `POST` | `/platform/auth/logout` | P1 |

**`POST /platform/auth/login`**
```json
{ "email": "ops@platform.com", "password": "••••••••" }
```
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "rt_01HQ8Z...",
    "expiresIn": 1800,
    "user": {
      "id": "pusr_01HQ8...",
      "name": "Ops Admin",
      "email": "ops@platform.com",
      "role": "SUPER_ADMIN"
    }
  }
}
```

---

## 2. Subscription plan catalogue

| Method | Path | Phase | Notes |
|---|---|---|---|
| `GET` | `/platform/subscription-plans` | P1 | List all tiers |
| `POST` | `/platform/subscription-plans` | P1 | Create tier |
| `GET` | `/platform/subscription-plans/:planId` | P1 | |
| `PATCH` | `/platform/subscription-plans/:planId` | P1 | |
| `POST` | `/platform/subscription-plans/:planId/deprecate` | P1.5 | Existing tenants keep it; hidden from new signups |

**`POST /platform/subscription-plans`**
```json
{
  "tier": "GROWTH",
  "name": "Growth",
  "displayName": "Growth",
  "monthlyPricePaise": 500000,
  "yearlyPricePaise": 5400000,
  "trialDays": 14,
  "highlighted": true,
  "sortOrder": 2,
  "limits": {
    "activeCustomers": 1000,
    "branches": 2,
    "staffSeats": 10,
    "schemePlans": 10,
    "whatsappMessagesPerMonth": 5000,
    "storageMb": 2048
  },
  "features": {
    "multiBranch": true,
    "customApp": false,
    "flexibleScheme": true,
    "goldWeightScheme": true,
    "prematureRedemption": true,
    "customerSelfEnrol": true,
    "advancedReports": false
  },
  "displayFeatures": [
    { "label": "Active customers", "value": "1,000" },
    { "label": "Multi-showroom", "value": "2" },
    { "label": "WhatsApp reminders", "value": "5,000 / month" }
  ]
}
```

`limits.*` set to `null` means unlimited (used for `CUSTOM`). `displayFeatures` is the marketing/pricing-table copy — it drives the comparison grid in the tenant portal's upgrade screen, so the designer can render the tier table directly from this array without hardcoding.

**`GET /platform/subscription-plans`**
```json
{
  "success": true,
  "data": [
    {
      "id": "splan_starter",
      "tier": "STARTER",
      "name": "Starter",
      "monthlyPrice": { "amountPaise": 300000, "amountDisplay": "₹3,000" },
      "limits": { "activeCustomers": 100, "branches": 0, "staffSeats": 3, "schemePlans": 3, "whatsappMessagesPerMonth": 1000 },
      "features": { "multiBranch": false, "customApp": false, "flexibleScheme": false, "goldWeightScheme": true, "prematureRedemption": true, "customerSelfEnrol": false },
      "tenantCount": 42,
      "status": "ACTIVE"
    },
    {
      "id": "splan_growth",
      "tier": "GROWTH",
      "name": "Growth",
      "monthlyPrice": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
      "limits": { "activeCustomers": 1000, "branches": 2, "staffSeats": 10, "schemePlans": 10, "whatsappMessagesPerMonth": 5000 },
      "features": { "multiBranch": true, "customApp": false, "flexibleScheme": true, "goldWeightScheme": true, "prematureRedemption": true, "customerSelfEnrol": true },
      "tenantCount": 17,
      "status": "ACTIVE"
    },
    {
      "id": "splan_pro",
      "tier": "PRO",
      "name": "Pro",
      "monthlyPrice": { "amountPaise": 800000, "amountDisplay": "₹8,000" },
      "limits": { "activeCustomers": 3000, "branches": 5, "staffSeats": 30, "schemePlans": 25, "whatsappMessagesPerMonth": 20000 },
      "features": { "multiBranch": true, "customApp": true, "flexibleScheme": true, "goldWeightScheme": true, "prematureRedemption": true, "customerSelfEnrol": true },
      "tenantCount": 6,
      "status": "ACTIVE"
    },
    {
      "id": "splan_custom",
      "tier": "CUSTOM",
      "name": "Custom",
      "monthlyPrice": null,
      "priceLabel": "Contact Us",
      "limits": { "activeCustomers": null, "branches": null, "staffSeats": null, "schemePlans": null, "whatsappMessagesPerMonth": null },
      "features": { "multiBranch": true, "customApp": true, "flexibleScheme": true, "goldWeightScheme": true, "prematureRedemption": true, "customerSelfEnrol": true },
      "tenantCount": 2,
      "status": "ACTIVE"
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false }
}
```

---

## 3. Tenant directory

| Method | Path | Phase |
|---|---|---|
| `GET` | `/platform/tenants` | P1 |
| `POST` | `/platform/tenants` | P1 |
| `GET` | `/platform/tenants/:tenantId` | P1 |
| `PATCH` | `/platform/tenants/:tenantId` | P1 |
| `POST` | `/platform/tenants/:tenantId/suspend` | P1 |
| `POST` | `/platform/tenants/:tenantId/reactivate` | P1 |
| `POST` | `/platform/tenants/:tenantId/block` | P1.5 |
| `GET` | `/platform/tenants/:tenantId/usage` | P1 |
| `POST` | `/platform/tenants/:tenantId/owner-credentials` | P1 | Issue / reset owner password |

### `GET /platform/tenants`

Query: `status`, `tier`, `q` (name/mobile/city), `setupPending=true`, `limit`, `cursor`.

```json
{
  "success": true,
  "data": [
    {
      "id": "tnt_01HQ7A2B3C4D5E6F7G8H9J",
      "businessName": "Sree Gold Jewellery",
      "displayName": "Sree Gold",
      "ownerName": "Mahesh Kumar",
      "ownerMobile": "9846543210",
      "city": "Kochi",
      "status": "ACTIVE",
      "subscription": {
        "tier": "GROWTH",
        "status": "ACTIVE",
        "currentPeriodEnd": "2026-10-01",
        "daysRemaining": 17
      },
      "provisioning": {
        "whatsappConfigured": true,
        "paymentGatewayConfigured": true,
        "templatesConfigured": 7,
        "templatesRequired": 8,
        "readyToGoLive": false
      },
      "usage": {
        "activeCustomers": 412,
        "branches": 2,
        "staff": 6,
        "whatsappUsedThisMonth": 1840
      },
      "createdAt": "2026-03-11T09:12:00+05:30"
    }
  ],
  "meta": { "nextCursor": "eyJpZCI6...", "hasMore": true, "limit": 20 }
}
```

### `POST /platform/tenants` — create tenant directly from super admin

This is the path where you onboard a jeweller yourself without them self-registering.

```json
{
  "businessName": "Sree Gold Jewellery",
  "displayName": "Sree Gold",
  "ownerName": "Mahesh Kumar",
  "ownerMobile": "9846543210",
  "ownerEmail": "mahesh@sreegold.in",
  "city": "Kochi",
  "address": "42 MG Road, Kochi 682011",
  "supportNumber": "9846543211",
  "subscriptionPlanId": "splan_growth",
  "billingCycle": "MONTHLY",
  "trialDays": 14,
  "skipPayment": true,
  "createDefaultBranch": true,
  "defaultBranchName": "Main Showroom",
  "sendWelcomeMessage": true
}
```

`skipPayment: true` marks the first period as manually settled — for tenants you've collected from offline. `createDefaultBranch` creates the branch every tenant needs before any enrolment can happen, so a tenant is never in a state with zero branches.

```json
{
  "success": true,
  "data": {
    "tenant": {
      "id": "tnt_01HQ7A2B3C4D5E6F7G8H9J",
      "businessName": "Sree Gold Jewellery",
      "tenantCode": "SREEGOLD",
      "status": "PENDING_SETUP",
      "subscription": { "tier": "GROWTH", "status": "TRIAL", "trialEndsAt": "2026-09-28" }
    },
    "ownerUser": {
      "id": "usr_01HQ8Z...",
      "name": "Mahesh Kumar",
      "mobile": "9846543210",
      "role": "TENANT_OWNER",
      "temporaryPassword": "Gd7#kP2wQx",
      "mustChangePassword": true
    },
    "defaultBranch": { "id": "brn_01HQ7A...", "name": "Main Showroom", "code": "MAIN" },
    "nextSteps": [
      { "key": "WHATSAPP_CREDENTIALS", "done": false },
      { "key": "PAYMENT_GATEWAY", "done": false },
      { "key": "WHATSAPP_TEMPLATES", "done": false },
      { "key": "GO_LIVE", "done": false }
    ]
  }
}
```

`tenantCode` is the human-typeable code the customer app uses to resolve a tenant at first launch. Auto-derived from the business name, uniqueness-checked, editable until go-live.

`temporaryPassword` is returned **once, on creation only**, and is never retrievable again.

### `GET /platform/tenants/:tenantId`

Returns the full tenant record: profile, branding, subscription, provisioning status, usage, branch list, owner details, integration status, and the last 10 audit entries. The designer should treat this as the tenant detail page payload.

```json
{
  "success": true,
  "data": {
    "id": "tnt_01HQ7A2B3C4D5E6F7G8H9J",
    "tenantCode": "SREEGOLD",
    "businessName": "Sree Gold Jewellery",
    "displayName": "Sree Gold",
    "gstin": "32ABCDE1234F1Z5",
    "address": "42 MG Road, Kochi 682011",
    "city": "Kochi",
    "supportNumber": "9846543211",
    "ownerEmail": "mahesh@sreegold.in",
    "status": "ACTIVE",
    "goLiveAt": "2026-03-15T11:00:00+05:30",
    "branding": {
      "logoUrl": "https://cdn.../logo.png",
      "primaryColor": "#7B1E1E",
      "secondaryColor": "#C9A227",
      "appDisplayName": "Sree Gold Savings"
    },
    "settings": {
      "multiSchemePerCustomer": true,
      "kycMandatory": false,
      "receiptPrefix": "SG",
      "customerSelfEnrolEnabled": true
    },
    "subscription": {
      "id": "sub_01HQ8...",
      "tier": "GROWTH",
      "status": "ACTIVE",
      "billingCycle": "MONTHLY",
      "currentPeriodStart": "2026-09-01",
      "currentPeriodEnd": "2026-10-01",
      "limits": { "activeCustomers": 1000, "branches": 2, "staffSeats": 10, "schemePlans": 10, "whatsappMessagesPerMonth": 5000 },
      "limitOverrides": {},
      "features": { "multiBranch": true, "customApp": false, "flexibleScheme": true, "goldWeightScheme": true, "prematureRedemption": true, "customerSelfEnrol": true }
    },
    "integrations": {
      "whatsapp": { "configured": true, "provider": "GUPSHUP", "phoneNumberDisplay": "+91 98465 43211", "wabaIdMasked": "•••• 8821", "lastVerifiedAt": "2026-09-01T10:00:00+05:30" },
      "paymentGateway": { "configured": true, "clientCredentialsConfigured": true, "provider": "PHONEPE", "clientIdMasked": "SREE••••SDK", "environment": "PRODUCTION", "verificationStatus": "VERIFIED", "lastVerifiedAt": "2026-09-01T10:02:00+05:30" }
    },
    "templates": { "configured": 7, "required": 8, "missing": ["SCHEME_CLOSED"] },
    "usage": {
      "activeCustomers": { "used": 412, "limit": 1000, "percent": 41.2 },
      "branches": { "used": 2, "limit": 2, "percent": 100 },
      "staff": { "used": 6, "limit": 10, "percent": 60 },
      "schemePlans": { "used": 4, "limit": 10, "percent": 40 },
      "whatsappMessages": { "used": 1840, "limit": 5000, "percent": 36.8, "resetsOn": "2026-10-01" }
    },
    "branches": [
      { "id": "brn_01HQ7A...", "name": "Main Showroom", "code": "MAIN", "status": "ACTIVE" },
      { "id": "brn_01HQ7B...", "name": "Panampilly Nagar", "code": "PMN", "status": "ACTIVE" }
    ],
    "stats": {
      "totalSchemes": 518,
      "activeSchemes": 431,
      "collectionThisMonth": { "amountPaise": 184500000, "amountDisplay": "₹18,45,000" },
      "goldAccrued": { "weightMg": 2841500, "weightDisplay": "2841.500 g" }
    },
    "audit": { "createdAt": "2026-03-11T09:12:00+05:30", "version": 12 }
  }
}
```

### `POST /platform/tenants/:tenantId/suspend`
```json
{ "reason": "Subscription payment overdue 15 days", "notifyOwner": true }
```

Suspension blocks all `/admin`, `/staff` and `/app` writes for the tenant with `SUBSCRIPTION_INACTIVE`. Reads stay available so the jeweller can still see their data. Reminders stop dispatching.

---

## 4. Tenant provisioning (integration credentials)

Credentials are write-only. They are never returned in plaintext after being set — only masked, plus a verification status.

| Method | Path | Phase |
|---|---|---|
| `PUT` | `/platform/tenants/:tenantId/integrations/whatsapp` | P1 |
| `POST` | `/platform/tenants/:tenantId/integrations/whatsapp/verify` | P1 |
| `PUT` | `/platform/tenants/:tenantId/integrations/payment-gateway` | P1 |
| `POST` | `/platform/tenants/:tenantId/integrations/payment-gateway/verify` | P1 |
| `POST` | `/platform/tenants/:tenantId/go-live` | P1 |

**`PUT .../integrations/whatsapp`**
```json
{
  "provider": "GUPSHUP",
  "apiKey": "sk_live_xxxxxxxxxxxx",
  "appId": "a1b2c3d4",
  "phoneNumberId": "919846543211",
  "wabaId": "104928374651",
  "senderDisplayName": "Sree Gold",
  "webhookSecret": "whsec_xxxxxxxx"
}
```
```json
{
  "success": true,
  "data": {
    "configured": true,
    "provider": "GUPSHUP",
    "phoneNumberDisplay": "+91 98465 43211",
    "apiKeyMasked": "sk_live_••••••••xxxx",
    "verificationStatus": "NOT_VERIFIED",
    "updatedAt": "2026-09-14T10:30:00+05:30"
  }
}
```

**`POST .../integrations/whatsapp/verify`** sends a real test message.
```json
{ "testMobile": "9846543210" }
```
```json
{
  "success": true,
  "data": {
    "verificationStatus": "VERIFIED",
    "messageId": "wamid.HBgM...",
    "deliveryStatus": "SENT",
    "verifiedAt": "2026-09-14T10:31:12+05:30"
  }
}
```

**`PUT .../integrations/payment-gateway`**

PhonePe uses OAuth-style SDK credentials (Developer Settings → API Keys). Webhook username/password are configured in PhonePe → Webhooks and must match the values saved here. Each tenant needs the webhook URL `{PUBLIC_BASE_URL}/api/v1/webhooks/phonepe/{tenantId}` registered once in their PhonePe dashboard.

```json
{
  "provider": "PHONEPE",
  "clientId": "CLIENT_ID_FROM_PHONEPE_DASHBOARD",
  "clientSecret": "CLIENT_SECRET_FROM_PHONEPE_DASHBOARD",
  "clientVersion": 1,
  "webhookUsername": "swarnagrow-webhook-user",
  "webhookPassword": "strong-random-password",
  "environment": "SANDBOX"
}
```

```json
{
  "success": true,
  "data": {
    "configured": true,
    "clientCredentialsConfigured": true,
    "provider": "PHONEPE",
    "clientIdMasked": "CLIE••••SDK",
    "environment": "SANDBOX",
    "verificationStatus": "NOT_VERIFIED",
    "lastVerifiedAt": null
  }
}
```

**`POST /platform/tenants/:tenantId/go-live`**

Validates the checklist and flips `PENDING_SETUP → ACTIVE`. Fails with a per-item breakdown if anything is missing.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Tenant cannot go live yet. 2 setup items are incomplete.",
    "details": [
      { "key": "WHATSAPP_TEMPLATES", "message": "Template for SCHEME_CLOSED is not configured" },
      { "key": "BRANCH", "message": "At least one active branch is required" }
    ]
  }
}
```

---

## 5. WhatsApp template registry (platform-managed)

You create and get templates approved in the BSP console, then register the identifiers per tenant here. Tenants never author templates.

| Method | Path | Phase |
|---|---|---|
| `GET` | `/platform/template-definitions` | P1 | The canonical variable contract per message type |
| `GET` | `/platform/tenants/:tenantId/templates` | P1 |
| `PUT` | `/platform/tenants/:tenantId/templates/:messageType` | P1 |
| `DELETE` | `/platform/tenants/:tenantId/templates/:messageType` | P1.5 |
| `POST` | `/platform/tenants/:tenantId/templates/:messageType/test` | P1 |

**`GET /platform/template-definitions`** — what the platform will inject, in order. Hand this to the jeweller so they register matching body text in the BSP console.

```json
{
  "success": true,
  "data": [
    {
      "messageType": "PAYMENT_DUE",
      "label": "Payment due reminder",
      "required": true,
      "hasMediaHeader": false,
      "hasUrlButton": true,
      "variables": [
        { "index": 1, "key": "customerName", "sample": "Anjali Menon" },
        { "index": 2, "key": "schemeName", "sample": "Swarna Plus 11" },
        { "index": 3, "key": "installmentNumber", "sample": "4" },
        { "index": 4, "key": "amountDisplay", "sample": "₹5,000" },
        { "index": 5, "key": "dueDateDisplay", "sample": "20 Sep 2026" },
        { "index": 6, "key": "jewellerName", "sample": "Sree Gold" }
      ],
      "buttonUrlVariable": { "index": 1, "key": "paymentLinkToken", "sample": "pl_8f2a4c60" },
      "suggestedBody": "Hi {{1}}, your installment {{3}} of {{4}} for {{2}} is due on {{5}}. Pay securely using the button below. — {{6}}"
    },
    {
      "messageType": "PAYMENT_SUCCESS",
      "label": "Payment success with passbook",
      "required": true,
      "hasMediaHeader": true,
      "mediaHeaderType": "IMAGE",
      "mediaHeaderNote": "Passbook image is attached as the header media. Register the template with an IMAGE header.",
      "hasUrlButton": false,
      "variables": [
        { "index": 1, "key": "customerName", "sample": "Anjali Menon" },
        { "index": 2, "key": "amountDisplay", "sample": "₹5,000" },
        { "index": 3, "key": "schemeName", "sample": "Swarna Plus 11" },
        { "index": 4, "key": "receiptNumber", "sample": "SG/MGR/2026/001284" },
        { "index": 5, "key": "paidInstallments", "sample": "4 of 11" },
        { "index": 6, "key": "jewellerName", "sample": "Sree Gold" }
      ]
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false }
}
```

**`PUT /platform/tenants/:tenantId/templates/:messageType`**
```json
{
  "templateName": "sreegold_payment_due_v1",
  "templateId": "1234567890123456",
  "languageCode": "en",
  "variableOrder": ["customerName", "schemeName", "installmentNumber", "amountDisplay", "dueDateDisplay", "jewellerName"],
  "buttonUrlVariableKey": "paymentLinkToken",
  "approvalStatus": "APPROVED",
  "notes": "Approved 12 Sep"
}
```

`variableOrder` is validated against the definition — every required key must be present exactly once. Mismatch → `400` listing the missing/extra keys, which prevents the classic production bug where variables render in the wrong slots.

---

## 6. Subscription management for a tenant

| Method | Path | Phase |
|---|---|---|
| `POST` | `/platform/tenants/:tenantId/subscription/change-plan` | P1 |
| `PATCH` | `/platform/tenants/:tenantId/subscription/limits` | P1 | Custom-tier overrides |
| `POST` | `/platform/tenants/:tenantId/subscription/extend` | P1 | Add days / grace |
| `POST` | `/platform/tenants/:tenantId/subscription/cancel` | P1.5 |
| `GET` | `/platform/tenants/:tenantId/invoices` | P1 |
| `POST` | `/platform/tenants/:tenantId/invoices` | P1 | Generate manually |
| `POST` | `/platform/invoices/:invoiceId/mark-paid` | P1 |

**`POST .../subscription/change-plan`**
```json
{
  "subscriptionPlanId": "splan_pro",
  "billingCycle": "MONTHLY",
  "effectiveFrom": "IMMEDIATE",
  "generateInvoice": true,
  "reason": "Upgrade requested by owner on call"
}
```

Downgrade guard — if current usage exceeds the target plan's limits, the API returns `422` with the blocking items so you can tell the jeweller what to reduce first:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Current usage exceeds the target plan's limits.",
    "details": [
      { "limitKey": "activeCustomers", "used": 1420, "targetLimit": 1000 },
      { "limitKey": "branches", "used": 4, "targetLimit": 2 }
    ]
  }
}
```

**`PATCH .../subscription/limits`** (Custom tier)
```json
{
  "limitOverrides": {
    "activeCustomers": 8000,
    "branches": 12,
    "whatsappMessagesPerMonth": 50000
  },
  "featureOverrides": { "customApp": true, "advancedReports": true },
  "reason": "Negotiated enterprise terms"
}
```

**`POST /platform/tenants/:tenantId/invoices`**
```json
{
  "periodStart": "2026-09-01",
  "periodEnd": "2026-10-01",
  "lineItems": [
    { "description": "Growth plan — Sep 2026", "amountPaise": 500000 },
    { "description": "WhatsApp overage — 1,200 messages", "amountPaise": 24000 }
  ],
  "taxPercent": 18,
  "dueDate": "2026-09-07",
  "notes": null
}
```
```json
{
  "success": true,
  "data": {
    "id": "inv_01HQ8...",
    "invoiceNumber": "PLT/2026/0294",
    "subtotal": { "amountPaise": 524000, "amountDisplay": "₹5,240" },
    "tax": { "amountPaise": 94320, "amountDisplay": "₹943" },
    "total": { "amountPaise": 618320, "amountDisplay": "₹6,183" },
    "status": "UNPAID",
    "dueDate": "2026-09-07",
    "pdfUrl": "https://cdn.../inv_01HQ8.pdf"
  }
}
```

---

## 7. Feature flags

| Method | Path | Phase |
|---|---|---|
| `GET` | `/platform/tenants/:tenantId/flags` | P1 |
| `PUT` | `/platform/tenants/:tenantId/flags` | P1 |

```json
{
  "flags": {
    "customerSelfEnrol": true,
    "flexibleScheme": true,
    "passbookImageOnPayment": true,
    "onlinePayments": true,
    "staffAppEnabled": true,
    "customerAppEnabled": true
  },
  "reason": "Disabling online payments while gateway KYC is pending"
}
```

Flags are a kill switch independent of the subscription tier. The effective value is `tierFeature AND flag` — a flag can only turn something off, never grant a feature the tier doesn't include.

---

## 8. Platform dashboard & monitoring

| Method | Path | Phase |
|---|---|---|
| `GET` | `/platform/dashboard/summary` | P1 |
| `GET` | `/platform/dashboard/charts/:chartKey` | P1.5 |
| `GET` | `/platform/webhook-failures` | P1 |
| `POST` | `/platform/webhook-failures/:id/retry` | P1 |
| `GET` | `/platform/audit-logs` | P1 |
| `GET` | `/platform/error-logs` | P1.5 |

**`GET /platform/dashboard/summary`**
```json
{
  "success": true,
  "data": {
    "tenants": { "total": 67, "active": 61, "pendingSetup": 4, "suspended": 2 },
    "tenantsByTier": [
      { "tier": "STARTER", "count": 42 },
      { "tier": "GROWTH", "count": 17 },
      { "tier": "PRO", "count": 6 },
      { "tier": "CUSTOM", "count": 2 }
    ],
    "mrr": { "amountPaise": 27400000, "amountDisplay": "₹2,74,000" },
    "platformVolume": {
      "collectionThisMonth": { "amountPaise": 8420000000, "amountDisplay": "₹8,42,00,000" },
      "activeCustomersTotal": 18420,
      "activeSchemesTotal": 21055
    },
    "whatsapp": { "sentThisMonth": 142800, "deliveryRatePercent": 96.4, "failedThisMonth": 5140 },
    "alerts": [
      { "severity": "HIGH", "key": "WEBHOOK_FAILURES", "message": "18 unprocessed webhook failures across 3 tenants", "count": 18 },
      { "severity": "MEDIUM", "key": "SUBSCRIPTION_PAST_DUE", "message": "4 tenants past due", "count": 4 },
      { "severity": "LOW", "key": "QUOTA_NEAR_LIMIT", "message": "6 tenants above 85% WhatsApp quota", "count": 6 }
    ]
  }
}
```

**Chart keys** for `/platform/dashboard/charts/:chartKey`: `tenant-growth`, `mrr-trend`, `platform-collection-volume`, `whatsapp-volume`, `tier-distribution`. All return the `ChartSeries` object from `00-conventions.md §11`.

**`GET /platform/audit-logs`**

Query: `tenantId`, `actorId`, `action`, `entityType`, `entityId`, `from`, `to`, `limit`, `cursor`.

```json
{
  "success": true,
  "data": [
    {
      "id": "aud_01HQ8...",
      "at": "2026-09-14T10:31:12+05:30",
      "actor": { "id": "pusr_01HQ8...", "name": "Ops Admin", "type": "PLATFORM_USER" },
      "tenant": { "id": "tnt_01HQ7A...", "name": "Sree Gold" },
      "action": "TENANT_SUBSCRIPTION_CHANGED",
      "entityType": "Subscription",
      "entityId": "sub_01HQ8...",
      "changes": [
        { "field": "tier", "from": "GROWTH", "to": "PRO" },
        { "field": "limits.activeCustomers", "from": 1000, "to": 3000 }
      ],
      "ip": "103.21.x.x",
      "traceId": "01HQ8Z3K7M9P2R4T6V8X0Y"
    }
  ],
  "meta": { "nextCursor": "eyJpZCI6...", "hasMore": true }
}
```
