# Platform super-admin UI handoff

## Entry point

- Login: `/platform/login`
- Console: `/platform`
- Mock mode is enabled by default.

The tenant-admin routes are unchanged. `app/(portal)/layout.tsx` selects the
platform or tenant shell from the path, and `src/app/portal-router.tsx` keeps
both route trees independently lazy-loaded.

## Architecture

- `src/features/platform/` contains the page-level platform modules.
- `src/components/layout/platform-shell.tsx` owns responsive platform
  navigation and user controls.
- `src/store/api/platform-api.ts` maps the finalized super-admin contract into
  RTK Query endpoints, tags, cache invalidation and idempotency headers.
- `src/mocks/platform-server.ts` provides the same operations using
  contract-shaped mutable demo data.
- `src/mocks/platform-data.ts` contains demo records only; page components do
  not import it.
- `src/types/platform.ts` contains stable platform DTOs and enums.

## Backend switch

```env
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1
NEXT_PUBLIC_USE_MOCKS=false
```

Platform bearer tokens use the `swarnagrow.platformAccessToken` and
`swarnagrow.platformRefreshToken` storage keys and therefore do not collide
with tenant-admin sessions.

## Contract coverage

- Platform login, refresh and logout
- Dashboard summary and charts
- Subscription plan list/detail/create/update/deprecate
- Tenant list/create/detail/update/suspend/reactivate/go-live
- One-time owner credential reset
- Tenant usage and canonical feature flags
- Meta Cloud credential save and verification
- PhonePe credential save and verification
- Template definition registry and tenant register/delete/test actions
- Plan change, custom limits, subscription/grace extension and cancellation
- Invoice list/create/mark-paid
- Audit logs, webhook failure queue/retry and error logs

All write operations use the shared 24-hour idempotency-key convention.
Optimistic-concurrency forms send `expectedVersion` where the contract requires
it.
