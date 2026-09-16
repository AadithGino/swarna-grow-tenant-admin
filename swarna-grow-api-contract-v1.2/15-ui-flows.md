# 15 — UI Flows (designer's working document)

Screen-by-screen, with the endpoint behind each step and the states that must be designed. Read `00-conventions.md` first for the response envelope, and treat every endpoint reference as a link to its detail file.

**Three states to design for every screen, always:** loading, empty, error. Error copy comes from `error.message` — it's written to be shown verbatim.

**Two conditional-rendering rules that apply everywhere:**
1. Nav items and action buttons are gated by `user.permissions` from login.
2. Whole modules are gated by `capabilities` from login (e.g. no flexible-scheme UI on Starter).

---

## A. Platform — jeweller onboarding

### A1. Create tenant (super admin)

| Step | Screen | Endpoint |
|---|---|---|
| 1 | Tenant list, "Add jeweller" button | `GET /platform/tenants` |
| 2 | Form: business name, owner name, mobile, email, city, address, support number | — |
| 3 | Plan picker (tier cards) | `GET /platform/subscription-plans` |
| 4 | Options: trial days, skip payment, create default branch | — |
| 5 | Submit | `POST /platform/tenants` |
| 6 | **Success screen showing the temporary password once**, with a copy button and a warning that it won't be shown again | response of step 5 |
| 7 | Setup checklist card, 4 items from `nextSteps` | — |

Design note: step 6 is the only time `temporaryPassword` exists. Treat it as a one-time reveal panel, not a row in a table.

### A2. Provision a tenant

| Step | Screen | Endpoint |
|---|---|---|
| 1 | Tenant detail, "Setup" tab, 4-item checklist with per-item status | `GET /platform/tenants/:id` |
| 2 | WhatsApp credentials form (write-only fields, masked once saved) | `PUT .../integrations/whatsapp` |
| 3 | "Send test message" with a mobile input → result banner | `POST .../integrations/whatsapp/verify` |
| 4 | PhonePe credentials form | `PUT .../integrations/payment-gateway` |
| 5 | Template registry table: 8 rows, each `configured` or not, with a "Register" drawer | `GET /platform/template-definitions`, `PUT .../templates/:messageType` |
| 6 | Go-live button, disabled until checklist complete | `POST .../go-live` |

The go-live failure response lists incomplete items — render it inline under the button, not as a toast.

### A3. Jeweller self-signup (public)

Five-step wizard with a progress indicator. Resumable: `GET /public/signup/:signupId/status` restores position on reload.

| Step | Screen | Endpoint |
|---|---|---|
| 1 | 5-field form | `POST /public/signup/start` |
| 2 | OTP entry, 6 boxes, resend timer from `resendAvailableInSeconds` | `POST /public/signup/verify-otp` |
| 3 | Pricing table, `highlighted` tier badged "Most popular" | `GET /public/signup/plans` |
| 4 | Order summary with tax | `POST .../select-plan` |
| 5 | Redirect to gateway | `POST .../payment/initiate` |
| 6 | Return page, polls until `stage: COMPLETED` | `GET .../status` |
| 7 | Set password | `POST /public/auth/set-password` |
| 8 | "We're configuring your account" holding screen while `PENDING_SETUP` | — |

Step 8 matters: the jeweller can log in but can't operate yet. Design a distinct pending state for the whole portal, not an error.

---

## B. Tenant portal — first-run setup

Once live, the owner lands on a setup checklist rather than an empty dashboard.

| Task | Screen | Endpoint |
|---|---|---|
| Business profile & GSTIN | Settings → Profile | `PATCH /admin/settings/profile` |
| Branding: logo, 2 colours, app name | Settings → Branding, with live preview panel | `PATCH /admin/settings/branding` → render `previewUrls` |
| Operational settings | Settings → Operations | `PATCH /admin/settings/operations` |
| Add branches | Settings → Branches | `POST /admin/branches` |
| Add staff | Settings → Staff | `POST /admin/staff` |
| Set today's gold rate | Settings → Gold rate | `POST /admin/gold-rate` |
| Create first plan | Plans → New | `POST /admin/scheme-plans` |

**Branding preview** is worth a dedicated panel — three tabs showing app icon, receipt header and passbook image as rendered by the server. Colour choices look fine in a swatch and terrible on the passbook.

**Limit errors** appear at the action point, not in settings. Creating a second branch on Starter returns `LIMIT_BRANCHES` with `suggestedPlan` and `upgradeUrl` — design an inline upsell card, not a toast.

---

## C. Plan builder

A stepped form. Every step calls `POST /admin/scheme-plans/preview-schedule` on change so the right-hand panel always shows what the customer will get.

| Step | Fields | Notes |
|---|---|---|
| 1. Basics | name, code, display name, description, terms | `code` immutable after save |
| 2. Type | value basis (cash / gold), payment pattern (fixed / flexible) | Flexible hidden unless `capabilities.flexibleScheme` |
| 3. Duration | duration months, installment count | |
| 4. Amount rules | **amount mode**, then conditional fields | See below |
| 5. Schedule (fixed only) | due-date rule, due day, grace days, **first-installment default + editable toggle** | |
| 6. Flexible rules (flexible only) | free window months, lock window months, per-payment min/max, multiple-of, min total, rounding, zero-total behaviour, lock-window min %/max multiple | |
| 7. Benefit | type, then conditional fields, display label | Three distinct sub-forms |
| 8. Redemption | premature allowed, lock-in months, penalty mode/value, benefit treatment, allowed modes, branch restriction | |
| 9. Availability | branches, enrolment window, max enrolments, visible in app, self-enrol allowed | |
| 10. Review | Full preview + schedule table | `preview-schedule` |

**Step 4 — the amount-mode branch (this is the min/max requirement):**

| Mode | Fields shown |
|---|---|
| `JEWELLER_FIXED` | Single amount input. Min and max auto-set equal to it, shown read-only so the jeweller sees the contract. |
| `JEWELLER_SLABS` | Repeatable chip input. Min/max derived and shown read-only. |
| `CUSTOMER_CHOSEN` | **Min amount, max amount, multiple-of** — all three required and prominently placed. Live helper text renders `amountSummary.label`. |

Design the min/max pair as a single labelled range control with a live preview sentence beneath: *"Customers can choose ₹1,000 – ₹50,000 per month, in multiples of ₹500."* That sentence is `amountSummary.label` from the server, so it's identical everywhere.

**Step 6 — flexible rules** need an explainer diagram in the form itself: a 11-month bar split into a 6-month "pay anything" segment and a 5-month "fixed monthly" segment, redrawing as the jeweller changes the split.

**Edit mode:** when `editLocked` is `true`, financial fields render disabled with a lock icon and a banner: *"318 active schemes use this plan. Duplicate it to change these rules."* The duplicate button is the primary action.

---

## D. Enrolment

The most-used flow in the product. Optimise it.

### D1. Portal / staff app enrolment

| Step | Screen | Endpoint |
|---|---|---|
| 1 | Customer search or "New customer" | `GET /admin/customers?q=` |
| 1a | If new: mobile field first, with live duplicate check | `GET /admin/customers/check-mobile` |
| 1b | New customer form (name, mobile, DOB, address, KYC) | `POST /admin/customers` |
| 2 | Plan picker — cards showing `amountSummary.label`, duration, benefit | `GET /admin/scheme-plans?enrolableOnly=true` |
| 3 | Amount step — renders per `amountMode` (fixed display / slab chips / free input with min-max) | — |
| 4 | **First-installment toggle** (see below) | — |
| 5 | Live validation panel: blockers, warnings, preview, schedule | `POST /admin/schemes/enrol/validate` on every change |
| 6 | If collecting now: choose `RECORD_MANUAL_PAYMENT` or the separate `CREATE_PAYMENT_LINK` action; show the five manual modes only for manual recording | — |
| 7 | Confirm & enrol | `POST /admin/schemes/enrol` |
| 8 | Success: scheme number, receipt, passbook image, "WhatsApp sent" confirmations | response of step 7 |

**No branch selector anywhere in this flow.** Branch comes from the token.

**Step 4 — first-installment toggle.** Two radio cards, each showing the resulting schedule so there's no ambiguity:

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ ● Collect first payment now │  │ ○ Start from next cycle     │
│                             │  │                             │
│ Installment 1 — today       │  │ Installment 1 — 10 Oct      │
│ Installment 2 — 10 Oct      │  │ Installment 2 — 10 Nov      │
│ Matures 10 Jul 2027         │  │ Matures 10 Aug 2027         │
└─────────────────────────────┘  └─────────────────────────────┘
```

Both dates come from `preview.schedulePreview` and `preview.maturityDate` — recompute by calling `enrol/validate` with each mode, or call `preview-schedule` twice on mount. Hide the toggle entirely when `firstInstallmentModeEditable` is false.

**Step 5 — the validation panel** is always visible on the right (desktop) or as a sticky bottom sheet (mobile). Blockers are red with an action link; warnings are amber and non-blocking; the preview shows installment amount, count, total, first due, maturity, benefit, projected value.

**Amount validation copy** — on `AMOUNT_BELOW_MINIMUM` etc., show `error.message` inline under the field and highlight the min/max from `error.details`.

### D2. Customer self-enrol (app)

Shorter: plan list → amount → confirm → optional pay now. `blockedReason` on a plan card renders as a disabled state with the reason beneath, not a hidden card.

---

## E. Payment capture

One screen, one mode selector. Three variants driven entirely by `payableThisMonth`.

### E1. Record payment

| Step | Screen | Endpoint |
|---|---|---|
| 1 | Entry from due list, customer page, scheme page, or scan | — |
| 2 | Scheme header with progress (variant per `displayMode`) | `GET /admin/schemes/:id` |
| 3 | Amount input, pre-filled with `payableThisMonth.suggested` | `GET .../payable-range` if month changes |
| 4 | Manual mode selector: Cash / Card or POS / UPI / Bank transfer / Cheque | — |
| 5 | Mode-specific field (reference for non-cash) | — |
| 6 | Confirm manual payment | `POST /admin/payments` |
| 6a | Separate "Send payment link" action | `POST /admin/payment-links` |
| 7 | Success sheet: receipt number, allocation, updated progress, cash-in-hand, WhatsApp status, share buttons | response of step 6 |

**Amount input behaviour by display mode:**

| `displayMode` | Input |
|---|---|
| `FIXED` | Pre-filled with the installment amount. Helper: *"Pay ₹5,000 for this month, or up to ₹15,000 to cover future months."* Advance payment is governed by `maxAdvanceInstallments` and is unchanged. |
| `FLEXIBLE_FREE_WINDOW` | Empty input, no suggestion. Quick-amount chips from `quickAmounts`. Helper shows the min–max range and multiple-of. |
| `FLEXIBLE_LOCK_WINDOW` (capped cycle) | Pre-filled with `remainingThisCycle`. Helper: *"₹600 remains in this month's ₹2,500 allowance."* **No multi-month chips. No "Finish scheme" chip.** Max is the cycle remainder, never a multiple of the cap. |

**Mode selector** shows five options: Cash, Card / POS, UPI, Bank transfer, Cheque. "Online payment" is **never** selectable — it only appears on payments the gateway confirmed. Reference and remarks are both optional on every mode; the UI may suggest a reference for non-cash but must not block an empty one.

**Capped-cycle payment sheet extras.** The sheet must display the cycle context above the amount: cycle label, cap, confirmed so far, remaining. It sends `targetCycle` and `expectedPositionVersion` with the payment. On `PAYMENT_POSITION_CHANGED` it shows a "the amount changed while you were on this screen" modal with old vs new and a re-confirm button — **it must never silently reduce the submitted amount**.

**Final remainder.** When `finalRemainderException` is `true`, the helper explains why a below-minimum amount is allowed: *"₹600 is the last of this month's allowance, so the ₹1,000 minimum doesn't apply."*

**"Pay next cycle"** appears only when `nextCycleAction.available` is `true`. Tapping it re-quotes against that cycle's own cap. When `available` is `false`, hide the action entirely — do not show a disabled button with a mystery reason.

The separate "Send payment link" action follows the same model split. On a flexible-average scheme it sends `targetCycle` and `expectedPositionVersion` to `POST /admin/payment-links`; the server creates a reservation-backed payment intent. The UI must refresh the displayed position from that response because the open link has consumed allowance.

Typing above max: disable the confirm button, show the message tied to `bindingConstraint` / `maxReason`. Typing above the remaining scheme value is a hard stop with `OVERPAYMENT_BLOCKED` copy — there is no overpayment anywhere in this product.

**Passbook image** returns `status: "GENERATING"` — design a skeleton in the success sheet that resolves to the image, plus a text-only fallback if it comes back `FAILED`.

### E2. Payment link flow (customer side)

Public branded page → "Pay now" → gateway → return page polling `GET /public/pay/:token/status`. Design three return states: success (with receipt), processing (with a spinner and `retryAfterSeconds`), failed (with a retry and the support number).

Expired link is a distinct screen: branded, clear, with the jeweller's phone number as the primary action.

---

## F. Due & overdue workboard

The screen branch staff live in.

| Element | Endpoint |
|---|---|
| Preset chips: Today / Tomorrow / This week / Next 7 days / Custom | `GET /admin/dues?preset=` |
| Filter bar: branch, plan, staff, search | same |
| Summary strip: count, total, per-branch breakdown | `meta.summary` |
| Row: customer, scheme, installment, amount, last reminder, open link badge | |
| Row actions: Record payment, Send link, Send reminder, Call | |
| Multi-select → bulk send links / reminders | `POST /admin/dues/bulk-send-links` |
| Tab: Overdue, with ageing bucket chips and the ageing bar chart | `GET /admin/overdues` |

**Bulk send** returns `202` with a job handle and a `skipped` array — design a result sheet showing queued count and per-row skip reasons (opted out, quota, no template). Pre-flight quota failure blocks before anything sends.

**Flexible nudge rows** (when `includeFlexibleNudges=true`) must be visually distinct and labelled "optional" — these customers owe nothing.

---

## G. Maturity → redemption → approval → completion

Four screens, one chain.

| Step | Screen | Endpoint |
|---|---|---|
| 1 | Maturity list or calendar | `GET /admin/maturities`, `.../calendar` |
| 2 | Scheme page → "Redeem" (enabled only when `actions.canRedeem`) | `GET /admin/schemes/:id` |
| 3 | **Settlement preview** — the line-item computation | `GET .../settlement-preview?type=MATURITY_REDEMPTION` |
| 4 | Mode selector with per-mode preview (gold weight at today's rate, etc.) | `modePreviews` |
| 5 | Mode-specific detail form | — |
| 6 | Submit | `POST /admin/schemes/:id/redeem` |
| 7 | If approval required: pending state; admin approves | `POST /admin/redemptions/:id/approve` |
| 8 | Complete: confirm handover, tick text benefits honoured | `POST /admin/redemptions/:id/complete` |
| 9 | Closure receipt + WhatsApp confirmation | response of step 8 |

**Step 3 — the settlement panel** is a receipt-style line list from `computation.lines`, each with label, amount and sign, totalling to `finalValue`. Forfeited lines render struck-through with `forfeitReason` beneath.

**Text benefits** get their own bordered callout above the total: *"Honour manually at the counter — not included in the amount below."* This is the single most important piece of copy in the redemption flow; staff will otherwise assume the software handled it.

**Step 6 stale-value guard** — `SETTLEMENT_VALUE_CHANGED` returns fresh figures. Design a "the value changed while you were on this screen" modal showing old vs new, with a re-confirm button.

### G2. Premature closure / cancel scheme

Same chain, entered from the scheme page's "Close scheme" action. One flow, one status. Differences:

- Preview shows penalty and forfeited benefit explicitly.
- **Two mandatory checkboxes** before submit: acknowledge penalty, acknowledge benefit forfeit. The API rejects without them, so make them blocking.
- `warningText` renders as a red banner.
- Lock-in unmet → not-eligible state with `eligibleFrom` date, no form.
- Zero-payment scheme with `ENROLMENT_ERROR` → simplified confirm, no penalty, settles at zero. This is the "cancel a mistake" path.

---

## H. Cash handover — both sides

### H1. Staff app

| Screen | Endpoint |
|---|---|
| Home card: cash in hand, pending acceptance, today's collection | `GET /staff/cash/summary` |
| "Hand over cash" → review list of receipts | `GET /staff/cash/collections` |
| Amount + receipt count + optional denomination counter | — |
| Submit | `POST /staff/cash/handovers` |
| Pending state with age, cancel action | `POST .../cancel` |
| History list with status badges | `GET /staff/cash/handovers` |

Denomination counter: a small grid of ₹500 / ₹200 / ₹100 / ₹50 / ₹20 / ₹10 with steppers, live-totalling against the amount field. Optional but good for accuracy.

The alert card ("You're holding ₹18,500, hand over before closing") is server-driven via `summary.alert` — don't hardcode the threshold.

### H2. Branch / admin portal

| Screen | Endpoint |
|---|---|
| Cash overview: totals, per-staff bar chart, alerts | `GET /admin/cash/overview` |
| Staff balances table with `riskFlag` badges | `GET /admin/cash/staff-balances` |
| Row action **"Mark as submitted"** → review collections → confirm | `GET .../staff-balances/:staffId`, `POST /admin/cash/handovers` with `autoAccept: true` |
| Pending handovers queue | `GET /admin/cash/handovers?status=PENDING` |
| Accept sheet: submitted amount, editable accepted amount, remarks | `POST .../accept` |
| Discrepancy state and resolution | `POST .../resolve-discrepancy` |
| Reject | `POST .../reject` |
| Handover detail: payments covered, denominations, timeline | `GET .../handovers/:id` |

**"Mark as submitted"** is the flow the requirement called out. Design it as a two-step confirm: review the itemised collections, then confirm the amount. On success, show the staff member's new balance (₹0) and note that they were notified.

**Accept with a different amount** is not an error path — it's the normal "we counted and it's ₹500 short" case. The accept sheet's amount field must be editable by default, with the submitted amount pre-filled and a live variance indicator.

---

## I. Reminder centre

| Screen | Endpoint |
|---|---|
| Config: offset toggles (D-5 … D+15), max per installment, send window, transactional toggles | `GET`/`PUT /admin/reminders/config` |
| Quota meter with projection warning | `quota` block |
| Template status table (read-only, 8 rows) | `GET /admin/messaging/templates` |
| Template preview drawer with rendered sample | `.../templates/:type/preview` |
| Message log with filters and status badges | `GET /admin/messaging/messages` |
| Summary tab: volume line chart, delivery-rate bar chart, failure categories | `GET /admin/messaging/summary` |
| Resend action (enabled per `canResend`) | `POST .../messages/:id/resend` |

Offsets render as a horizontal timeline with the due date at centre and toggleable markers either side — far clearer than eight checkboxes.

`QUOTA_PROJECTION_EXCEEDED` comes back as a `meta.warning` on save, not an error. Design it as an amber banner that doesn't block.

Missing template (`configured: false`) shows a warning row with "Contact support" — tenants can't fix it themselves.

---

## J. Customer app

### J1. Onboarding

| Step | Screen | Endpoint |
|---|---|---|
| 1 | Tenant resolve: code entry, or auto via deep link, or mobile lookup | `GET /public/tenants/resolve` |
| 1a | If multiple tenants: picker with logos | same |
| 2 | Branded splash applying `branding` | — |
| 3 | Mobile entry | `POST /public/auth/otp/request` |
| 4 | OTP entry with resend timer | `POST /public/auth/otp/verify` |
| 5 | If `isNewCustomer`: profile completion + branch picker | `POST /app/profile/complete` |
| 6 | Home | `GET /app/home` |

### J2. Home

Single call. Layout: greeting → action card → summary strip (total saved, gold accrued, current value) → gold rate ticker → active scheme cards → quick actions → past schemes entry.

The **action card** is server-decided and is the primary CTA. Design one card component that handles all types via `severity`, `title`, `subtitle`, `ctaLabel`, `ctaAction`.

### J3. Scheme detail — three designs, one endpoint

Build three layouts keyed off `displayMode`:

**`FIXED`** — segmented progress bar (`barSegments.filled / total`), 4 stat cards, pay button with the amount in the label.

**`FLEXIBLE_FREE_WINDOW`** — month-based progress, a prominent "pay anything" banner with the lock date and days remaining, a **projected monthly amount card** clearly flagged as an estimate, and a month-by-month breakdown list. No due date anywhere — showing one here would be wrong.

**`FLEXIBLE_LOCK_WINDOW` (capped phase)** — a banner explaining the computed cap and how it was derived (`capSnapshot.formulaLabel`), then a **cycle** progress bar, not an installment one. Inside the current cycle, show cap / confirmed / remaining and the list of payments already made this cycle, because multiple payments per cycle are normal. The payment sheet offers `remainingThisCycle` and nothing more.

All three read `payableThisMonth` for the payment sheet. One payment sheet component, three sets of copy.

### J6. Support requests

| Screen | Endpoint |
|---|---|
| "Raise a request" from home quick actions or a payment/scheme page | — |
| Form: category picker, subject, description, optional attachments, auto-linked related entity | `POST /app/grievances` |
| My requests list with status badges and unread counts | `GET /app/grievances` |
| Thread view — messages in order, reply box | `GET /app/grievances/:id`, `POST .../messages` |
| Resolved ticket: resolution summary + "Reopen" for 7 days | `POST .../reopen` |

The customer never sees internal notes; the server omits them. Resolved tickets show `reopenAvailableUntil` so the 7-day window is visible rather than a surprise. Push notification on reply and on status change — no WhatsApp.

### J4. Past schemes

List of summary cards: status badge, dates, total paid, benefit received, final value, redemption mode. Tap → read-only passbook + closure receipt download. Closed schemes stay fully readable forever.

### J5. Pay

- Fixed-date scheme: sheet → amount → `POST /app/schemes/:schemeId/pay` → gateway → poll `GET /app/payments/:linkId/status` → success.
- Flexible-average scheme: sheet → cycle amount → `POST /app/schemes/:schemeId/payment-intents` with `targetCycle` and `expectedPositionVersion` → gateway → poll `GET /app/payment-intents/:intentId` → success. The app must not use `/pay` for this model.

---

## K. Dashboard & reports

### K1. Dashboard

`GET /admin/dashboard/summary` returns an **ordered widget array** — render a responsive grid over it rather than a fixed layout. Each widget: label, value (formatted per `valueType`), optional secondary line, change chip (colour by `direction` × `isGood`), optional `severity` tint, tap → `actionPath`.

Below the widgets, fetch the chart keys in `defaultCharts`. There is no maturity-forecast chart — it is not built and not rendered. One `ChartSeries` renderer handles all of them; `chartType` picks the visual, `yAxis.type` picks the value formatter, `drilldown` makes points tappable.

Period selector at top drives everything. Branch selector appears only for tenant-scoped roles.

Gold-rate-not-set renders as a blocking red banner above the widgets with a "Set rate" CTA.

### K2. Reports

One generic report screen. Left: report picker. Top: filters (date range, branch, plan, staff, group-by). Body: summary strip → charts → table.

The table renders from `columns` (which carries `type`, `align`, `sortable`, `sticky`, `emphasis`) and `rows`, with `totalsRow` pinned at the bottom. Build this component once; twelve reports use it.

Export button → format picker → `POST /admin/exports` → progress toast polling `GET /admin/exports/:id` → download when `READY`.

`REPORT_RANGE_TOO_LARGE` should surface as an inline suggestion to export instead, with the export pre-filled.

---

## I2. Support desk (tenant portal)

| Screen | Endpoint |
|---|---|
| Queue with status/priority/category/assignee filters, overdue and unassigned chips | `GET /admin/grievances?includeSummary=true` |
| Summary strip: open, in progress, waiting, overdue first response, unassigned, resolved today | `meta.summary` |
| Ticket detail: header, related entity link, SLA block, message thread | `GET /admin/grievances/:id` |
| Reply box with a **Public reply / Internal note** toggle | `POST .../messages` |
| Assign drawer | `POST .../assign` |
| Priority selector | `POST .../priority` |
| Resolve sheet: resolution code + summary | `POST .../status` |
| Audit tab | `GET /admin/grievances/:id/audit-events` |

Design notes worth getting right:

- **Internal notes must be visually unmistakable** — different background, a lock icon, and a persistent "Only your team can see this" label above the composer when the toggle is on. A staff member accidentally posting an internal note publicly is the failure mode here.
- SLA state is a chip on every row: on-track, due soon, or breached, derived from `firstResponseDueAt` and `firstRespondedAt`. Once `firstRespondedAt` is set, the chip becomes a neutral "responded".
- Priority change before a first reply moves the deadline. Show the recalculated `firstResponseDueAt` in the confirmation so the change isn't silent.
- `SYSTEM_EVENT` messages render as thin centred dividers in the thread, not as chat bubbles.

## J7. Nominee (portal and staff app)

A small card on the customer page, not a screen of its own.

| State | Rendering |
|---|---|
| No nominee | Empty card with an "Add nominee" button |
| Present | Name, relationship label, mobile (masked without `customer.read.pii`), notes, "updated by X on date" |
| Edit | Drawer with four fields, sends `expectedVersion` |
| Remove | Confirm dialog → `DELETE ...?expectedVersion=N` |

Four fields only: name, relationship, mobile, notes. **No document upload, no verification badge, no approval workflow, no scheme assignment, no "add another nominee".** If the design shows any of those, it is drawing a feature that does not exist.

The customer app has no nominee screen in V1.

## K3. Customer analytics

A tab on the Customers screen, not a separate nav item.

| Element | Source |
|---|---|
| Six summary cards | `summary[]` from `GET /admin/customers/analytics` |
| Registration trend (line) | `charts.registrationTrend` |
| Status donut, KYC donut | `charts.customerStatusDistribution`, `charts.kycDistribution` |
| Customers by branch (horizontal bar) | `charts.customersByBranch` — hidden for branch-scoped roles |

Every chart point is tappable into a filtered customer list via `drilldown`. Label the device metric **"customers with a registered device"**, never "app installed". There is deliberately no historical active-customer trend.

## K4. Audit timeline

A tab on the customer, scheme, payment and grievance pages, plus an "Activity & audit" screen in Settings.

One row: action icon, `summary` sentence, actor name, relative time, branch, and an expandable `changes` table. Filters map one-to-one to the query parameters. Visible only to `audit.read` holders.

Keep this distinct from the dashboard activity feed, which is a short friendly live tail. This one is the complete filterable record.

---

## L. Component inventory

Building these once covers the whole product:

| Component | Driven by |
|---|---|
| Money display | `MoneyRef` — always render `amountDisplay` |
| Weight display | `WeightRef` |
| Status badge | `status` + a status→colour map (statuses listed in `00 §12`) |
| Progress card | `progress` object, branching on `progress.type` |
| Payable-amount input | `payableThisMonth` / `payable-range` |
| Chart | `ChartSeries` |
| Report table | `columns` + `rows` + `totalsRow` |
| Widget card | `widgets[]` entry |
| Alert banner | `alerts[]` entry |
| Limit-reached upsell | `error.details` on any `LIMIT_*` code |
| Validation panel | `blockers` / `warnings` from `enrol/validate` |
| Settlement line list | `computation.lines` |
| Empty state | per-list copy |
| Cursor list | `meta.nextCursor` / `hasMore` |
| Payment mode selector | five manual modes; `ONLINE_GATEWAY` display-only |
| Mode breakdown strip | `byMode[]` — fixed order, zero rows included |
| Cycle position card | `capPosition` / `paymentPosition` |
| SLA chip | `firstResponseDueAt` + `firstRespondedAt` |
| Internal-note composer | `messageType` toggle with a persistent visibility warning |
| Nominee card | embedded `nominee` object |
| Audit timeline row | audit event `summary` + `changes` |

---

## M. Screens where the copy carries real risk

Worth extra design attention, because getting these wrong causes real-world disputes:

1. **Text-only benefit at redemption** — must read as "you honour this manually", never as something already counted.
2. **Flexible lock explanation** — the customer needs to understand *why* their monthly amount is what it is, before it's applied and after.
3. **Premature closure consequences** — penalty and forfeited benefit, acknowledged explicitly.
4. **Capped-cycle payable amount** — "₹600 remains in this month's ₹2,500 allowance." Never imply a customer can pay several months at once on a flexible-average scheme.
5. **First-installment choice at enrolment** — show both resulting schedules side by side.
6. **Cash handover acceptance with a shortfall** — the shortfall stays on the staff member's balance until resolved; say so.
7. **Late-success payment** — a payment that lands after a failure looks like a bug to the jeweller unless the UI explains it.
8. **Internal note vs public reply** — the composer must make the audience obvious at the moment of typing, not after sending.
9. **Final-remainder exception** — explain why a below-minimum amount is allowed, or staff will assume the minimum is broken.
10. **"Customers with a registered device"** — never phrased as "app installed"; a stale token is not an install.
