# API integration map

The API prefix comes from `NEXT_PUBLIC_API_BASE_URL`. Paths below are relative to `/api/v1`.

| Portal module      | Primary contract endpoints                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Authentication     | `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`, `POST /auth/logout`, device/session endpoints                      |
| Dashboard          | `GET /admin/dashboard/summary`, `GET /admin/dashboard/charts/:chartKey`, `GET /admin/dashboard/activity`                     |
| Customers          | `GET/POST /admin/customers`, mobile check, customer 360, KYC, nominee, block/unblock, statement and WhatsApp share           |
| Enrollments        | validation, enrolment create, `GET /admin/schemes`, scheme detail, payable range, passbook, ledger and maturity projection   |
| Collections        | `GET/POST /admin/payments`, payment links, pending/late-success queues, reconcile, poll, reverse, receipt and passbook image |
| Dues               | dues, overdues, defaulters, flexible locks, bulk actions and exports                                                         |
| Cash control       | cash overview, staff balances, admin handovers, accept/reject/resolve, handover detail and cash report                       |
| Maturity           | maturities list/calendar, settlement preview, redemption initiation, approval, rejection, completion and premature closure   |
| Gold rates         | current rate, rate creation and rate history                                                                                 |
| Reminders          | templates/preview, reminder configuration, message log, summary, resend, inbound, quota and dead-letter queue                |
| Reports            | `GET /admin/reports/:reportKey`, asynchronous export creation and export polling                                             |
| Scheme plans       | plan list/create/update/detail/stats, duplicate and schedule preview                                                         |
| Staff and branches | branch CRUD/status, staff invite/list/deactivate/reset, session and permission views                                         |
| Support desk       | grievance list/detail, assignment, priority, messages/notes, status changes and reopen                                       |
| Audit              | global audit search and entity timelines                                                                                     |
| Settings           | business profile/branding, operations, subscription usage/plans and upgrade request                                          |

## Request behavior

- Bearer tokens are attached in the API base query.
- Financial and retry mutations use `X-Idempotency-Key`.
- Contract `{ success, data, meta, error }` envelopes are handled centrally.
- Cursor metadata stays at the API boundary; pages consume stable `{ items, total/summary }` models.
- Paise values become rupees only in contract adapters. Gold `weightMg` becomes grams there.
- A `401` clears the unusable access token. Refresh rotation can be activated when the backend exposes the final cookie/token transport.
- Mutation cache tags ensure affected lists and details refresh after a write.

## Mock/live rule

`src/mocks/mock-server.ts` is the only mock transport. Features do not branch on mock mode.

To talk to the live backend:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_USE_MOCKS=false
```

The portal maps UI field names to backend wire fields in `admin-api.ts`, normalizes `_id`/paise/dashboard shapes in `contract-adapters.ts`, and auto-sends `X-Idempotency-Key` on mutating requests. On `401`, the base query attempts one refresh via `POST /auth/refresh` before clearing the session.

Admin/auth contract coverage (excluding `staff/*`) is implemented in RTK Query. Staff companion APIs are intentionally out of scope for this portal.

## Final backend handoff checklist

1. Set the API URL and disable mocks.
2. Confirm whether refresh tokens are HttpOnly cookies or response-body tokens.
3. Confirm the CORS allowlist and credential policy for the deployed portal origin.
4. Exercise login, customer creation, enrollment, cash payment, online payment-link return, handover acceptance, gold-rate creation and redemption completion against staging.
5. Verify PDF/image responses and signed-upload URLs with production-like object storage.
