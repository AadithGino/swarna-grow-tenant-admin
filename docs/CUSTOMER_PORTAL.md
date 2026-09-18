# Customer portal implementation

The mobile-first customer web portal is available under `/customer` and follows the current customer V1 API contract.

## Screens

- `/customer/:tenantSlug/login` — Sign in or **Create account** (OTP with `LOGIN` / `SIGNUP` purpose)
- `/customer/:tenantSlug/onboarding` — After first OTP: profile (`POST /app/profile/complete`); identity upload only when the jeweller has **Require KYC before enrolment** enabled
- `/customer` — home summary, actions, gold rate, trends and scheme cards
- `/customer/schemes` — active and past scheme groups
- `/customer/schemes/:schemeId` — fixed, flexible free-window and flexible capped-cycle views
- `/customer/plans` and `/customer/plans/:planId` — safe plan discovery and self-enrolment
- `/customer/pay/status` — PhonePe confirmation polling/result surface
- `/customer/payments` — payment history, receipts and digital passbook access
- `/customer/notifications` — notification inbox and deep links
- `/customer/profile` — profile, nominee and contact preferences (identity verification UI only when KYC is required for enrolment)
- `/customer/security` — active customer devices and session revocation
- `/customer/support` and `/customer/support/:id` — grievances and public replies
- `/customer/gold-rate` — current and historical jeweller-published gold rates
- `/customer/branches` — public/customer branch directory

## API switching

The RTK Query service is in `src/store/api/customer-api.ts`. Mock mode is enabled by default. To connect the backend:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1
NEXT_PUBLIC_USE_MOCKS=false
```

The service reads the customer bearer token from `swarnagrow.customer.accessToken` and targets the `/public/*`, `/app/auth/*`, and `/app/*` routes from the contract.

## Registration flow

1. **Create account** on login page → `POST /public/auth/otp/request` with `purpose: "SIGNUP"`.
2. **Verify OTP** → `POST /public/auth/otp/verify` creates the customer if new; `profileComplete: false` sends the user to onboarding.
3. **Profile** → `POST /app/profile/complete` with at least `name`.

### When KYC is off (default)

Tenant setting **Require KYC before enrolment** is disabled. The customer portal does not show KYC copy, onboarding steps, or profile verification UI. `GET /app/profile` omits `kyc`; `PUT /app/profile/kyc` returns `403 KYC_NOT_ENABLED`. Enrolment is not blocked by KYC on the backend.

### When KYC is on

The portal shows onboarding identity upload (required before finishing setup), profile verification status, and document submit/update. Flow: presign `POST /app/uploads/presign` (`KYC_DOCUMENT`), then `PUT /app/profile/kyc`. Enrolment requires verified KYC on the backend.

Tenant capabilities come from resolve-tenant and OTP verify (`tenant` + `tenantCapabilities`):

| Setting (admin) | Portal behaviour |
|-----------------|------------------|
| Customer self-registration off | No “Create account”; signup OTP rejected (`SELF_REGISTRATION_DISABLED`) |
| Customer self-enrol off | No “Explore plans”; plan APIs empty / 403; enrol blocked (`SELF_ENROL_DISABLED`) |
| Require KYC before enrolment | KYC onboarding + profile UI (see above) |
| One scheme per customer (multi-scheme off) | Enrol blocked with `ONE_SCHEME_POLICY` when an active scheme exists |

The main shell (`CustomerRegistrationGuard`) blocks home/schemes/etc. until `profileComplete` is true.

## Payment behavior

- Fixed schemes call `POST /app/schemes/:schemeId/pay`.
- Flexible schemes call `POST /app/schemes/:schemeId/payment-intents` with amount, target cycle and `expectedPositionVersion`.
- Fixed links may require `POST /public/pay/:token/initiate` before redirect; flexible intents return a direct PhonePe URL.
- After PhonePe redirects back, `/customer/:slug/pay/status` polls `GET /app/payment-intents/:id` or `GET /public/pay/:token/status` until paid, failed, or expired.
- A short-lived payment session is stored in `sessionStorage` so the status page knows which resource to poll.
- The UI never asks for or stores a UPI PIN.

## Locked flexible rules represented by the UI

- Contributions are optional and never become overdue/defaulted.
- Paid money remains permanently in the ledger.
- Unused monthly allowance does not carry forward.
- Free-window and capped-cycle payments both use payment intents.
- Full payment never causes early maturity.
