# SwarnaGrow Collection Agent Portal

Mobile-first collection workspace at `/agent`. It is intentionally separate from tenant-admin, platform-admin and customer surfaces.

## Login and tenant selection

The route is not tenant-slug based. The first login request omits `tenantCode`. If the API returns `TENANT_SELECTION_REQUIRED`, the agent chooses a jewellery and the client retries `/auth/login` with that tenant code. Only `COLLECTION_AGENT` users with an assigned `branchId` are accepted.

Demo (after `seed:demo`): mobile `9847012352`, password `2026`.

## Included screens

- Dashboard: cash in hand, today’s collection (all methods), pending handovers, rate and latest receipts
- Customer search and branch-scoped customer detail
- Scheme selection covering fixed, gold-weight, flexible free-window and flexible capped-window plans
- Manual collection: **Cash in hand**, UPI, card, bank transfer — with fresh payable-range concurrency versions
- **Show PhonePe QR** and 30-minute payment link share
- Optional register / KYC upload / enrol when jeweller enables agent capabilities
- Gold preview calculated from the entered amount and current business-day rate
- Collection history (all modes) and handover history
- Cash handover creation, status detail and pending cancellation
- Agent collection report with date range, by-mode breakdown, daily chart and CSV export
- Profile, workplace context, password change and logout

## Locked behavior

- Online-only (no offline queue required).
- Only **CASH** increases cash in hand; other modes and online QR/link are receipts attributed to the agent.
- Gold collection is blocked when the applicable daily rate is unavailable.
- Gold preview uses `floor(amountPaise * 1000 / ratePerGramPaise)`; the server response is authoritative.
- Payable range is refreshed immediately before every payment / link / QR mutation.
- Flexible unused monthly allowance does not carry forward; collected money never expires.
- Cash handovers remain pending until accepted by the branch manager/admin.

**Flutter / API:** [`FLUTTER_STAFF_AGENT_API_GUIDE.md`](./FLUTTER_STAFF_AGENT_API_GUIDE.md)

Set `NEXT_PUBLIC_USE_MOCKS=false` and `NEXT_PUBLIC_API_BASE_URL` to use the backend. The RTK Query layer automatically adds authorization/idempotency headers and performs one refresh-token retry after a `401`.
