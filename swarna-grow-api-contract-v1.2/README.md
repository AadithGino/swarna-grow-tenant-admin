# Gold Scheme Platform — API Contract (v1)

Multi-tenant gold savings scheme platform. Node.js + Express + MongoDB/Mongoose.

## Document set

| File | Covers | Audience |
|---|---|---|
| `00-conventions.md` | Envelope, auth, headers, errors, pagination, idempotency, money/weight, shared objects, enums | Everyone — **read first** |
| `01-platform-admin.md` | Super admin: tenants, subscriptions, provisioning, templates, billing, platform dashboard | Platform panel |
| `02-auth-onboarding.md` | Jeweller self-signup, all four login flows, OTP, sessions, device management | All panels |
| `03-tenant-config.md` | Business profile, branding, settings, branches, staff, gold rate, subscription & usage | Tenant portal |
| `04-customers.md` | Customers, KYC, passbook number, customer 360 (active + past schemes + reminder history) | Portal, staff app |
| `05-scheme-plans.md` | Plan templates — value basis, payment pattern, min/max, benefits, redemption rules | Tenant portal |
| `06-enrolment-schemes.md` | Enrolment, first-installment policy, schedule, scheme account, passbook, payable range | Portal, staff app, customer app |
| `07-payments.md` | Record payment, payment links, PhonePe webhook, late-success, reversal, receipts, passbook image | All panels + webhooks |
| `08-lists-dues-maturity.md` | Due, overdue, defaulter, maturity calendar, flexible-lock due, late-success queue | Portal, staff app |
| `09-redemption-closure.md` | Maturity computation, redemption, premature closure (= cancellation), approvals | Tenant portal |
| `10-reminders-whatsapp.md` | Template registry, reminder config, message log, reminder centre, delivery webhook | Tenant portal + webhooks |
| `11-cash-handover.md` | Staff cash-in-hand, handover creation (staff + admin initiated), accept/reject/discrepancy, history | Staff app + tenant portal |
| `12-customer-app.md` | Full customer app surface, scheme-type-aware payloads, FCM | Customer app |
| `13-staff-app.md` | Full staff app surface | Staff app |
| `14-dashboard-reports.md` | Dashboard widgets + charts, all reports with chart payloads, async export | Tenant portal |
| `15-ui-flows.md` | Screen-by-screen flows mapped to endpoints — **the UI designer's working document** | Design |
| `16-grievances.md` | Customer support requests: queue, thread, internal notes, fixed SLA, reopen | Customer app + portal |
| `17-audit-timeline.md` | Immutable audit events, entity timelines, audited action list | Portal |

## Base URL & audience namespaces

```
https://api.<domain>/api/v1
```

| Namespace | Consumer | Token subject |
|---|---|---|
| `/public/*` | Unauthenticated (signup, tenant resolve, OTP request) | none |
| `/platform/*` | Super admin web panel | platform user |
| `/admin/*` | Tenant web portal (owner / tenant admin / branch manager) | tenant user |
| `/staff/*` | Staff mobile app | tenant user (role `BRANCH_STAFF`) |
| `/app/*` | Customer mobile app | customer |
| `/webhooks/*` | PhonePe, WhatsApp BSP | signature-verified |

`/admin/*` and `/staff/*` share the same identity store. A branch manager can use both surfaces; scope is enforced by role + branch, not by namespace.

## Build phases

| Tag | Meaning |
|---|---|
| `P1` | Required for first release. Build these. |
| `P1.5` | Build immediately after launch — schema/contract designed now so nothing breaks. |
| `P2` | Deferred. Listed only so the contract is forward-compatible. |

Every endpoint in this set carries a phase tag. If you want to cut scope further, cut `P1.5` first.

## Non-negotiable engineering rules

1. **The ledger is the only source of truth.** Every total, balance, progress percentage, accrued weight, computed average and payable range in every response is derived from immutable ledger entries at read time (or from a rebuildable cache). No mutable running-total field is ever authoritative.
2. **Money is `Int64` paise. Weight is `Int64` milligrams.** No floats anywhere. `Decimal.js` only inside computation functions, never at a storage or transport boundary.
3. **Every write that touches more than one document runs inside a MongoDB transaction.**
4. **Every state-changing POST accepts `X-Idempotency-Key`.** Replays return the original response with `"idempotentReplay": true`.
5. **Every list endpoint is cursor-paginated.** No `page`/`offset` anywhere.
6. **`tenantId` is on every business document** and is injected by middleware from the token — never accepted from the client body.
7. **Every single-entity tenant business mutation writes exactly one immutable audit event** inside the same transaction and returns `auditEventId`. Bulk mutations write one event per affected entity and expose the ids on synchronous results or the completed async-job result. Validation/preview calls and authentication/session operations do not create tenant business audit events.
8. **The backend is authoritative for payment eligibility, caps, allocations and balances.** No client computes a payable amount.

## Payment modes

```
CASH | CARD | UPI | BANK_TRANSFER | CHEQUE | ONLINE_GATEWAY
read-only legacy: LEGACY_ONLINE
```

Five are manually recordable. `ONLINE_GATEWAY` is created only by a verified gateway callback. **Only `CASH` moves staff cash-in-hand.** There are no channel-specific forms — a manual payment carries its mode plus an optional `reference` and optional `remarks`, nothing more. Full table in `00-conventions.md §12`.

## Two scheme payment models

| | Fixed-date | Flexible-average |
|---|---|---|
| Unit of allowance | Installment | **Cycle** |
| Advance payment | `maxAdvanceInstallments` | `allowFutureCyclePayment` + `maxAdvanceCycles`, both off by default |
| Concurrency token | `expectedVersion` | **`positionVersion`** |
| Cap source | Plan amount rules | Snapshotted flexible-phase average |
| Unused allowance | N/A | **Expires — no carry-forward** |
| Below-minimum payment | Not allowed | Allowed as the explicit final remainder |

A flexible-average cycle cap is **never multiplied** to produce one combined payable amount. Paying two cycles means two separately-quoted allocations against two independently-capped cycles.


## Change log — v1.1 (14 Sep 2026)

Applied from the Five Core Features contract and the Analytics API Gap contract.

| Change | Files touched |
|---|---|
| Payment modes expanded to six, plus read-only `LEGACY_ONLINE`; optional reference/remarks; gateway-only confirmation; migration rules | `00`, `07`, `08`, `11`, `13`, `14` |
| Flexible-average rewritten to the per-cycle cap model: `positionVersion`, `targetCycle`, cycle allowances, no carry-forward, final-remainder exception, payment intents with reservations | `05`, `06`, `07`, `12`, `15` |
| `maxPayMultipleOfLocked` removed; replaced by `allowFutureCyclePayment` + `maxAdvanceCycles`, both off by default | `05`, `06`, `12`, `15` |
| Fixed-date schemes left untouched — they keep `maxAdvanceInstallments` and have no position model | `05`, `06` |
| Nominee added as one optional embedded object on Customer | `04`, `13`, `15`, `17` |
| Grievances added as a new module with fixed SLA and a 7-day reopen window | `16` (new), `00`, `02`, `04`, `12`, `13`, `15` |
| Immutable audit timeline added | `17` (new), `00`, `02` |
| `GET /admin/customers/analytics` added, with the routing-order caveat | `04`, `14` |
| `GET /admin/payments` summary extended with status, source, comparison and optional charts | `07` |
| Staff home `cashCollected`/`onlineCollected` replaced by `today.byMode` | `13`, `14` |
| Customer app home gains `trends` (contributions + gold accumulation) | `12` |
| Maturity forecast removed — no endpoint, no chart, no UI | `14`, `15` |

Nothing in this revision introduces a `{ data: { items, page } }` envelope; every list stays on `data: []` + `meta`.

## Change log — v1.2 implementation hardening (14 Sep 2026)

| Correction | Result |
|---|---|
| Branch-scoped customer analytics | Branch responses contain branch-only totals and omit `customersByBranch`; tenant-wide comparison remains owner-only. |
| Enrolment first payment | `firstInstallmentAction` separates manual recording from payment-link creation; `ONLINE_LINK` is not a payment mode. |
| Customer payment routing | Fixed-date uses `/pay`; flexible-average uses versioned, cycle-specific payment intents. |
| Intent polling | Canonical status read is `GET /app/payment-intents/:intentId`; no `/status` alias. |
| Payment-mode analytics | Six current modes are always returned in fixed order; `LEGACY_ONLINE` is appended only when historical data exists. |
| Collection report | Rows, totals and branch charts expose Cash, Card/POS, UPI, Bank transfer, Cheque and Online gateway separately. |
| Grievances | Standardized `firstResponseDueAt`, versioned reopen, idempotency on every grievance POST, and customer-safe related entities. |
| Audit contract | Single-entity mutations return `auditEventId`; bulk operations emit per-entity events, with async ids exposed only after job completion. |
| Chart presentation | Backend chart colours removed; stable semantic keys drive frontend design-token mapping. |
| List examples | Every `data: []` example now includes `meta.nextCursor` and `meta.hasMore`. |
