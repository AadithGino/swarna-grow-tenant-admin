# 02 — Auth & Jeweller Onboarding

Four identities exist: platform user (covered in `01`), tenant user (owner/admin/manager/staff), and customer. Tenant users authenticate with **mobile + password**. Customers authenticate with **WhatsApp OTP only**.

---

## 1. Jeweller self-signup

Five steps. Each step is a separate call so the UI can be a wizard with a resumable draft.

| Method | Path | Phase |
|---|---|---|
| `POST` | `/public/signup/start` | P1 |
| `POST` | `/public/signup/verify-otp` | P1 |
| `GET` | `/public/signup/plans` | P1 |
| `POST` | `/public/signup/:signupId/select-plan` | P1 |
| `POST` | `/public/signup/:signupId/payment/initiate` | P1 |
| `GET` | `/public/signup/:signupId/status` | P1 |
| `GET` | `/public/signup/check-availability` | P1 |

### Step 1 — `POST /public/signup/start`
```json
{
  "businessName": "Sree Gold Jewellery",
  "ownerName": "Mahesh Kumar",
  "mobile": "9846543210",
  "email": "mahesh@sreegold.in",
  "city": "Kochi"
}
```
```json
{
  "success": true,
  "data": {
    "signupId": "sgn_01HQ8Z3K7M9P2R4T6V8X0Y",
    "otpSent": true,
    "otpChannel": "WHATSAPP",
    "maskedMobile": "9846XXXX10",
    "expiresInSeconds": 300,
    "resendAvailableInSeconds": 30
  }
}
```

No GSTIN, no PAN, no documents. Five fields, that's the whole gate.

### Step 2 — `POST /public/signup/verify-otp`
```json
{ "signupId": "sgn_01HQ8Z...", "otp": "482913" }
```
```json
{
  "success": true,
  "data": {
    "signupId": "sgn_01HQ8Z...",
    "verified": true,
    "signupToken": "sgt_01HQ8Z...",
    "nextStep": "SELECT_PLAN"
  }
}
```

`signupToken` authorises the remaining signup steps (`Authorization: Bearer sgt_...`), valid 60 minutes, and is not a full session token.

### Step 3 — `GET /public/signup/plans`

Same shape as `GET /platform/subscription-plans` but public-safe: no `tenantCount`, only `status: ACTIVE`, ordered by `sortOrder`, with `highlighted` set on the tier you want to push. This is the pricing table the designer renders.

### Step 4 — `POST /public/signup/:signupId/select-plan`
```json
{ "subscriptionPlanId": "splan_growth", "billingCycle": "MONTHLY" }
```
```json
{
  "success": true,
  "data": {
    "selectedPlan": { "tier": "GROWTH", "name": "Growth" },
    "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
    "tax": { "amountPaise": 90000, "amountDisplay": "₹900" },
    "total": { "amountPaise": 590000, "amountDisplay": "₹5,900" },
    "trialDays": 14,
    "nextStep": "PAYMENT"
  }
}
```

### Step 5 — `POST /public/signup/:signupId/payment/initiate`
```json
{ "redirectUrl": "https://app.<domain>/signup/complete" }
```
```json
{
  "success": true,
  "data": {
    "paymentSessionId": "psn_01HQ8...",
    "redirectUrl": "https://mercury.phonepe.com/transact/pg?token=...",
    "expiresAt": "2026-09-14T11:00:00+05:30"
  }
}
```

### `GET /public/signup/:signupId/status`

Polled by the completion screen after gateway redirect.

```json
{
  "success": true,
  "data": {
    "signupId": "sgn_01HQ8Z...",
    "stage": "COMPLETED",
    "paymentStatus": "SUCCESS",
    "tenant": { "id": "tnt_01HQ7A...", "tenantCode": "SREEGOLD", "status": "PENDING_SETUP" },
    "ownerLogin": { "mobile": "9846543210", "passwordSetRequired": true, "setPasswordToken": "spt_01HQ8..." },
    "message": "Your account is created. Our team is configuring WhatsApp and payments — you'll be notified within 24 hours."
  }
}
```

`stage` ∈ `OTP_PENDING | PLAN_PENDING | PAYMENT_PENDING | PAYMENT_PROCESSING | COMPLETED | FAILED`.

### `GET /public/signup/check-availability`
```
GET /public/signup/check-availability?mobile=9846543210
GET /public/signup/check-availability?tenantCode=SREEGOLD
```
```json
{ "success": true, "data": { "available": false, "reason": "MOBILE_ALREADY_REGISTERED" } }
```

---

## 2. Set password (first login)

| Method | Path | Phase |
|---|---|---|
| `POST` | `/public/auth/set-password` | P1 |

```json
{ "token": "spt_01HQ8...", "password": "MyStr0ng#Pass", "confirmPassword": "MyStr0ng#Pass" }
```

Returns a full session (same shape as login below). Token is single-use, 24-hour lifetime, also used for admin-triggered password resets.

Password policy: minimum 8 characters, at least one letter and one digit. Enforced server-side; the rules are returned by `GET /public/auth/password-policy` so the UI can render live validation without hardcoding.

---

## 3. Tenant user login (portal + staff app)

| Method | Path | Phase |
|---|---|---|
| `POST` | `/auth/login` | P1 |
| `POST` | `/auth/refresh` | P1 |
| `POST` | `/auth/logout` | P1 |
| `GET` | `/auth/me` | P1 |
| `POST` | `/auth/change-password` | P1 |
| `POST` | `/auth/forgot-password` | P1 |
| `GET` | `/auth/devices` | P1.5 |
| `DELETE` | `/auth/devices/:deviceId` | P1.5 |

### `POST /auth/login`
```json
{
  "mobile": "9846543210",
  "password": "MyStr0ng#Pass",
  "tenantCode": null,
  "deviceInfo": { "deviceId": "dev_01HQ9...", "platform": "android", "model": "Redmi Note 12", "appVersion": "1.2.0" }
}
```

`tenantCode` is optional and only needed when the same mobile number exists in more than one tenant. If it's ambiguous, the API returns:

```json
{
  "success": false,
  "error": {
    "code": "TENANT_SELECTION_REQUIRED",
    "message": "This mobile number is registered with more than one jeweller. Please select one.",
    "details": {
      "tenants": [
        { "tenantCode": "SREEGOLD", "displayName": "Sree Gold", "logoUrl": "https://cdn.../a.png" },
        { "tenantCode": "KMJEWELS", "displayName": "KM Jewels", "logoUrl": "https://cdn.../b.png" }
      ]
    }
  }
}
```

Success:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "rt_01HQ8Z...",
    "expiresIn": 3600,
    "mustChangePassword": false,
    "user": {
      "id": "usr_01HQ8Z...",
      "name": "Rahul Nair",
      "mobile": "9846543210",
      "role": "BRANCH_MANAGER",
      "permissions": ["customer.read", "customer.write", "payment.record", "payment.reverse", "cash.accept", "report.read"],
      "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" }
    },
    "tenant": {
      "id": "tnt_01HQ7A...",
      "tenantCode": "SREEGOLD",
      "displayName": "Sree Gold",
      "logoUrl": "https://cdn.../logo.png",
      "branding": { "primaryColor": "#7B1E1E", "secondaryColor": "#C9A227" },
      "status": "ACTIVE"
    },
    "capabilities": {
      "multiBranch": true,
      "flexibleScheme": true,
      "goldWeightScheme": true,
      "prematureRedemption": true,
      "onlinePayments": true
    }
  }
}
```

`permissions` and `capabilities` are what the UI uses to show/hide modules. The designer should assume every nav item and action button is conditional on these two objects.

### `POST /auth/refresh`
```json
{ "refreshToken": "rt_01HQ8Z..." }
```
```json
{ "success": true, "data": { "accessToken": "eyJ...", "refreshToken": "rt_01HQ9A...", "expiresIn": 3600 } }
```

### `GET /auth/me`

Returns the same `user` / `tenant` / `capabilities` block as login, plus live usage counters so the portal header can show the plan meter without an extra call.

### `POST /auth/forgot-password`
```json
{ "mobile": "9846543210", "tenantCode": "SREEGOLD" }
```

Sends a WhatsApp OTP. Always returns `200` with a generic message regardless of whether the mobile exists, to avoid enumeration. Verify via `POST /public/auth/otp/verify` with `purpose: "PASSWORD_RESET"`, which returns a `setPasswordToken`.

---

## 4. Customer OTP login (customer app)

| Method | Path | Phase |
|---|---|---|
| `GET` | `/public/tenants/resolve` | P1 |
| `POST` | `/public/auth/otp/request` | P1 |
| `POST` | `/public/auth/otp/verify` | P1 |
| `POST` | `/app/auth/refresh` | P1 |
| `POST` | `/app/auth/logout` | P1 |
| `GET` | `/app/auth/me` | P1 |

### `GET /public/tenants/resolve`

First launch of the white-label app. Three resolution paths, all through this one endpoint.

```
GET /public/tenants/resolve?tenantCode=SREEGOLD
GET /public/tenants/resolve?mobile=9847112233
GET /public/tenants/resolve?deepLinkToken=dl_8f2a4c60
```
```json
{
  "success": true,
  "data": {
    "tenants": [
      {
        "id": "tnt_01HQ7A...",
        "tenantCode": "SREEGOLD",
        "displayName": "Sree Gold",
        "appDisplayName": "Sree Gold Savings",
        "logoUrl": "https://cdn.../logo.png",
        "branding": { "primaryColor": "#7B1E1E", "secondaryColor": "#C9A227" },
        "supportNumber": "9846543211",
        "city": "Kochi"
      }
    ],
    "resolvedBy": "TENANT_CODE"
  }
}
```

Resolving by `mobile` can legitimately return more than one tenant — a customer may save with two jewellers on the same app build. The UI shows a picker in that case. The array is always returned, even with one element.

### `POST /public/auth/otp/request`
```json
{
  "tenantId": "tnt_01HQ7A...",
  "mobile": "9847112233",
  "purpose": "CUSTOMER_LOGIN"
}
```
`purpose` ∈ `CUSTOMER_LOGIN | CUSTOMER_SIGNUP | PASSWORD_RESET | SIGNUP_VERIFY | MOBILE_CHANGE`.

```json
{
  "success": true,
  "data": {
    "otpId": "otp_01HQ8Z...",
    "channel": "WHATSAPP",
    "maskedMobile": "9847XXXX33",
    "expiresInSeconds": 300,
    "resendAvailableInSeconds": 30,
    "attemptsAllowed": 5,
    "isRegistered": true
  }
}
```

`isRegistered` lets the app decide whether to route to login or to the self-registration form after verification. When customer self-enrol is disabled for the tenant and the mobile is unknown, the request fails with `CUSTOMER_NOT_REGISTERED` and a message telling them to visit the showroom.

### `POST /public/auth/otp/verify`
```json
{ "otpId": "otp_01HQ8Z...", "otp": "482913", "deviceInfo": { "deviceId": "dev_01HQ9...", "platform": "android", "appVersion": "1.2.0" } }
```
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "rt_01HQ8Z...",
    "expiresIn": 3600,
    "isNewCustomer": false,
    "profileComplete": true,
    "customer": {
      "id": "cus_01HQ8...",
      "name": "Anjali Menon",
      "mobile": "9847112233",
      "passbookNumber": "MGR/2026/00412",
      "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" }
    },
    "tenant": {
      "id": "tnt_01HQ7A...",
      "displayName": "Sree Gold",
      "appDisplayName": "Sree Gold Savings",
      "logoUrl": "https://cdn.../logo.png",
      "branding": { "primaryColor": "#7B1E1E", "secondaryColor": "#C9A227" },
      "supportNumber": "9846543211"
    },
    "capabilities": { "selfEnrolEnabled": true, "onlinePaymentsEnabled": true, "multiSchemeAllowed": true }
  }
}
```

When `isNewCustomer` is `true` a token is still issued, but it carries a restricted scope: only `POST /app/profile/complete` and read of public plan info are permitted until the profile is filled.

Failure on wrong OTP:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Incorrect OTP. 3 attempts remaining.",
    "details": { "attemptsRemaining": 3 }
  }
}
```

### `POST /app/profile/complete`
```json
{
  "name": "Anjali Menon",
  "dateOfBirth": "1992-04-18",
  "address": { "line1": "18 Kadavanthra Road", "city": "Kochi", "pincode": "682020" },
  "branchId": "brn_01HQ7A..."
}
```

`branchId` is only sent when the tenant has more than one branch and the customer self-registered; the app shows a branch picker sourced from `GET /public/tenants/:tenantId/branches`. For staff-created customers the branch is always derived from the staff token and never sent.

---

## 5. Session & device management

### `GET /auth/devices` / `GET /app/auth/devices`
```json
{
  "success": true,
  "data": [
    {
      "deviceId": "dev_01HQ9...",
      "platform": "android",
      "model": "Redmi Note 12",
      "appVersion": "1.2.0",
      "lastActiveAt": "2026-09-14T10:22:00+05:30",
      "isCurrent": true,
      "loginAt": "2026-09-01T08:10:00+05:30"
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false }
}
```

`DELETE /auth/devices/:deviceId` revokes that device's refresh-token family and de-registers its FCM token in the same transaction.

---

## 6. Logout

```
POST /auth/logout
{ "refreshToken": "rt_01HQ8Z...", "deregisterFcm": true }
```

Revokes the refresh family for the current device only. `POST /auth/logout-all` (P1.5) revokes every session for the user.

---

## 7. Permission catalogue

| Permission | TENANT_OWNER | TENANT_ADMIN | BRANCH_MANAGER | BRANCH_STAFF |
|---|:--:|:--:|:--:|:--:|
| `tenant.settings.write` | ✓ | ✓ | — | — |
| `tenant.branding.write` | ✓ | ✓ | — | — |
| `subscription.read` | ✓ | ✓ | — | — |
| `branch.write` | ✓ | ✓ | — | — |
| `staff.write` | ✓ | ✓ | ✓ (own branch) | — |
| `customer.read` | ✓ | ✓ | ✓ | ✓ |
| `customer.write` | ✓ | ✓ | ✓ | ✓ |
| `customer.read.pii` | ✓ | ✓ | ✓ | — |
| `customer.block` | ✓ | ✓ | ✓ | — |
| `plan.write` | ✓ | ✓ | — | — |
| `scheme.enrol` | ✓ | ✓ | ✓ | ✓ |
| `payment.record` | ✓ | ✓ | ✓ | ✓ |
| `payment.reverse` | ✓ | ✓ | ✓ | — |
| `goldrate.write` | ✓ | ✓ | — | — |
| `redemption.initiate` | ✓ | ✓ | ✓ | — |
| `redemption.approve` | ✓ | ✓ | — | — |
| `closure.approve` | ✓ | ✓ | — | — |
| `cash.handover.create` | ✓ | ✓ | ✓ | ✓ |
| `cash.handover.accept` | ✓ | ✓ | ✓ | — |
| `reminder.config.write` | ✓ | ✓ | — | — |
| `reminder.resend` | ✓ | ✓ | ✓ | — |
| `report.read` | ✓ | ✓ | ✓ (own branch) | — |
| `report.export` | ✓ | ✓ | ✓ (own branch) | — |
| `audit.read` | ✓ | ✓ | — | — |
| `grievance.read` | ✓ | ✓ | ✓ (own branch) | ✓ (own branch) |
| `grievance.reply` | ✓ | ✓ | ✓ | ✓ |
| `grievance.assign` | ✓ | ✓ | ✓ (own branch) | — |
| `grievance.resolve` | ✓ | ✓ | ✓ | — |

Branch scoping is applied on top of permissions, not instead of them. `BRANCH_MANAGER` with `customer.read` reads only their branch. `TENANT_OWNER` reads everything and may pass `X-Acting-Branch-Id` to write into a specific branch.

Nominee access needs **no new permission** — it reuses `customer.read`, `customer.read.pii` and `customer.write`. Payment recording continues to use `payment.record` regardless of mode.

`TENANT_ADMIN` is configurable per user as either tenant-wide or branch-scoped via a `scope` field on the staff record (`TENANT` | `BRANCH`). A branch-scoped admin is the "each branch has its own admin who sees their own reports" case from the requirements.
