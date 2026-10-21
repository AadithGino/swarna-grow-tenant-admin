# Digital Gold & Silver — portals integration

**Status:** Phase 0 — specification only; no UI routes implemented yet.

## Canonical specification

Product, accounting, hedge perimeter, and frozen calculation rules live in the **backend** repository:

- [DIGITAL_METALS_SPEC.md](../../swarnagrow-backend/docs/DIGITAL_METALS_SPEC.md)
- [DIGITAL_METALS_API_CONTRACT.md](../../swarnagrow-backend/docs/DIGITAL_METALS_API_CONTRACT.md)
- [DIGITAL_METALS_PROGRESS.md](../../swarnagrow-backend/docs/DIGITAL_METALS_PROGRESS.md)

When working in a single-repo checkout, use paths under `swarnagrow-backend/docs/`.

## Phase 0 routing decisions (this app)

| Surface | Path segment |
|---------|----------------|
| Tenant admin | Add `digital-metals` to `src/lib/portal-routes.ts` and `portal-nav.ts` → `/digital-metals/*` |
| Customer | Add `digital-metals` to `src/lib/customer-tenant.ts` `CUSTOMER_ROUTE_SECTIONS` and `customer-router.tsx` → `/customer/:tenantSlug/digital-metals/*` |
| Platform | Extend existing plan/tenant screens via `platform-api.ts` |

API prefix for RTK slices: `/admin/digital-metals/*` (admin-api) and `/app/digital-metals/*` (customer-api). See [API_INTEGRATION.md](./API_INTEGRATION.md) for envelope and idempotency conventions.

## Implementation phases

Follow the backend progress log. Phase 1 adds entitlement-gated navigation shells only — no balances or trading UI until later phases.
