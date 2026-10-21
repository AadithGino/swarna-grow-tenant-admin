# Tenant admin Digital Metals UX (2026-10-21)

Design aligned with scheme admin: `PageHeader`, `Surface`, `StatCard`, `ListSearchInput`, status filters, pagination.

## Completed surfaces

| Area | Route | Notes |
|------|--------|--------|
| Overview | `/digital-metals` | API-backed `StatCard` counts, pending sell queue links, capability blockers, operations pause + work queue |
| Purchases | `/digital-metals/purchases` | Status filter, id search, paged list; detail with payment attempts |
| Sell approvals | `/digital-metals/sells` | Default `PENDING_APPROVAL` filter; execute sale requires explicit staff attestation checkbox |
| Payouts | `/digital-metals/payouts` | Payables + payout list; detail requires attestation checkbox for settlement, evidence + reason for unknown/resolve |
| Settings / rates / quote | `/digital-metals/settings` … | Existing editor + manual rates (unchanged structure, scheme-style chrome) |
| Redemption | catalogue / fulfilment / orders | Catalogue edit; fulfilment actions; **COMPLETE_DELIVERY** requires attestation checkbox |
| Procurement | `/digital-metals/procurement` | Gram display; default effective date = IST today |
| Hedge | `/digital-metals/hedge` | Coverage incomplete banners; gram lines |

Shared: `digital-metals-workspace-overview.tsx`, `digital-metals-admin-list-toolbar.tsx`.

## Attestation rule

Financial attestations (`approverAttestation`, sale execute, delivery complete) require an explicit checkbox — not implied by clicking the primary button alone.

## Screenshots

Script: `scripts/admin-digital-metals-screenshots.spec.js` (Playwright, 390/768/1440).

**Status:** Not captured this session (portal dev + staff auth required). See verification verdict in backend `docs/DIGITAL_METALS_PROGRESS.md`.

## Staging (separate)

PhonePe, object storage, physical FCM — not part of local PASS/FAIL.
