# SwarnaGrow Collection Agent Portal

Mobile-first collection workspace at `/agent`. It is intentionally separate from tenant-admin, platform-admin and customer surfaces.

## Login and tenant selection

The route is not tenant-slug based. The first login request omits `tenantCode`. If the API returns `TENANT_SELECTION_REQUIRED`, the agent chooses a jewellery and the client retries `/auth/login` with that tenant code. Only `COLLECTION_AGENT` users with an assigned `branchId` are accepted.

Mock demo: mobile `9847012352`, password `Swarna@2026`.

## Included screens

- Dashboard: cash in hand, today’s collection, pending handovers, rate and latest receipts
- Customer search and branch-scoped customer detail
- Scheme selection covering fixed, gold-weight, flexible free-window and flexible capped-window plans
- Cash collection with fresh payable-range concurrency versions
- Gold preview calculated from the entered amount and current business-day rate
- Collection and handover history
- Cash handover creation, status detail and pending cancellation
- Agent-only collection report with date range, daily chart and CSV export
- Profile, workplace context, password change and logout

## Locked behavior

- V1 is online-only and cash-only.
- Gold collection is blocked when the applicable daily rate is unavailable.
- Gold preview uses `floor(amountPaise * 1000 / ratePerGramPaise)`; the server response is authoritative.
- Payable range is refreshed immediately before every payment mutation.
- Flexible unused monthly allowance does not carry forward; collected money never expires.
- Cash handovers remain pending until accepted by the branch manager/admin.

Set `NEXT_PUBLIC_USE_MOCKS=false` and `NEXT_PUBLIC_API_BASE_URL` to use the backend. The RTK Query layer automatically adds authorization/idempotency headers and performs one refresh-token retry after a `401`.
