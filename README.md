# Swarna Grow Admin Portals

Production-oriented React tenant and platform-super-admin portals built from the Swarna Grow API contracts and supplied UI references. The customer mobile app is intentionally excluded.

## Platform super-admin console

The platform console starts at `/platform/login` and is role-separated from the
tenant-admin surface. In mock mode the login form is prefilled and all platform
screens are interactive without a backend.

- `/platform` — command centre and platform KPIs
- `/platform/tenants` — jeweller directory and filters
- `/platform/tenants/new` — guided tenant, owner and plan onboarding
- `/platform/tenants/:tenantId` — profile, provisioning, templates,
  subscription, invoices, usage and feature flags
- `/platform/plans` — subscription catalogue CRUD and deprecation
- `/platform/templates` — canonical Meta template registry and readiness
- `/platform/monitoring` — health, webhook failures/retry and error logs
- `/platform/audit` — traceable platform audit events
- `/platform/settings` — environment and security policy

## Included product areas

- Authentication shell and first-login-ready structure
- Dashboard with summary metrics, collection charts, alerts and operational attention
- Customer directory, creation flow and customer 360 record
- Enrollment directory, enrollment creation and full lifecycle detail
- Dues, grace, overdue and defaulter workboards
- Collections, gateway queues, receipts and reversals surface
- Staff cash balances, handovers, acceptance and discrepancy handling
- Maturity calendar, settlement preview and redemption surfaces
- Daily gold-rate entry, trend and immutable history
- WhatsApp reminder centre, templates, schedules, logs and quota
- Reports with filters, charts and CSV/print exports
- Scheme plan catalogue and plan-builder entry flow
- Staff, branches, invitations, sessions and permission audit surfaces
- Customer support requests with SLA, assignment, reply and resolution
- Immutable audit timeline
- Business, branding, operations, subscription and security settings

## Stack

- React 19 on the Next-compatible Vinext runtime
- Redux Toolkit and RTK Query
- TypeScript
- Tailwind CSS 4 and the bundled accessible Shadcn primitives
- Recharts
- React Hook Form/Zod dependencies are available for extending server-driven form schemas

## Run locally

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Mock mode is enabled by default. The portal is immediately usable without a backend.

## Switch to the backend

```env
NEXT_PUBLIC_API_BASE_URL=https://your-api.example.com/api/v1
NEXT_PUBLIC_USE_MOCKS=false
```

All feature components call RTK Query hooks. They never import mock data directly. The custom base query handles the contract response envelope, bearer token, normalized failures and mock/live selection. Contract adapters translate paise, weight-in-milligrams, nested references and cursor-list envelopes into stable UI view models.

See `docs/API_INTEGRATION.md` for the module-to-endpoint map.

## Brand asset replacement

The temporary brand mark is isolated in `src/components/brand/brand-mark.tsx`. Replace that component or point it to the final uploaded logo without touching navigation or page modules. Theme tokens live in `app/globals.css`.

## Architecture

```text
app/                         Route entrypoints, providers, loading and error boundaries
src/app/                     Portal routing, Redux provider and WebMCP bridge
src/components/brand/        Replaceable brand assets
src/components/common/       Tables, charts, async states, surfaces and dialogs
src/components/layout/       Responsive tenant and platform shells
src/features/                One folder per business module
src/mocks/                   In-memory contract-shaped demo server
src/store/api/               RTK Query endpoints and contract adapters
src/store/slices/            Local interface state only
src/types/                   Stable domain/view-model contracts
src/lib/                     Formatting, downloads and idempotency helpers
docs/                        Integration handoff
```

## Verification

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

Mutations that can create financial duplicates generate an idempotency key, and RTK Query invalidates the affected dashboard, customer, enrollment, payment and cash caches after success.
