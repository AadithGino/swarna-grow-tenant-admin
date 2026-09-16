# 13 — Staff Mobile App

Namespace `/api/v1/staff/*`. Token type `TENANT_USER`, role `BRANCH_STAFF` (a `BRANCH_MANAGER` may also use this surface). Every response is automatically scoped to the staff member's branch — `branchId` is never accepted from the client.

Online-only. No offline queue, no geo-stamping.

---

## 1. Endpoint map

| Method | Path | Phase |
|---|---|---|
| `POST` | `/auth/login` | P1 |
| `GET` | `/staff/home` | P1 |
| `GET` | `/staff/dues` | P1 |
| `GET` | `/staff/overdues` | P1 |
| `GET` | `/staff/customers` | P1 |
| `POST` | `/staff/customers` | P1 |
| `GET` | `/staff/customers/:customerId` | P1 |
| `PATCH` | `/staff/customers/:customerId` | P1 |
| `PUT` | `/staff/customers/:customerId/kyc` | P1 |
| `GET` | `/staff/customers/check-mobile` | P1 |
| `GET` | `/staff/scheme-plans` | P1 |
| `POST` | `/staff/schemes/enrol/validate` | P1 |
| `POST` | `/staff/schemes/enrol` | P1 |
| `GET` | `/staff/schemes/:schemeId` | P1 |
| `GET` | `/staff/schemes/:schemeId/passbook` | P1 |
| `GET` | `/staff/schemes/:schemeId/payable-range` | P1 |
| `POST` | `/staff/payments` | P1 |
| `POST` | `/staff/payment-links` | P1 |
| `POST` | `/staff/payments/:paymentId/share-whatsapp` | P1 |
| `GET` | `/staff/payments` | P1 |
| `GET` | `/staff/collections/summary` | P1 |
| `GET` | `/staff/cash/summary` | P1 |
| `GET` | `/staff/cash/collections` | P1 |
| `POST` | `/staff/cash/handovers` | P1 |
| `GET` | `/staff/cash/handovers` | P1 |
| `GET` | `/staff/gold-rate/current` | P1 |
| `GET` | `/staff/notifications` | P1 |
| `POST` | `/staff/devices/fcm-token` | P1 |
| `DELETE` | `/staff/devices/fcm-token` | P1 |
| `GET` | `/staff/profile` | P1 |
| `GET` | `/staff/grievances` | P1 |
| `GET` | `/staff/grievances/:grievanceId` | P1 |
| `POST` | `/staff/grievances/:grievanceId/messages` | P1 |
| `GET` | `/staff/customers/:customerId/nominee` | P1 |
| `PUT` | `/staff/customers/:customerId/nominee` | P1 |
| `DELETE` | `/staff/customers/:customerId/nominee` | P1 |
| `POST` | `/auth/change-password` | P1 |

Payloads for shared endpoints are identical to the `/admin` equivalents in files `04`, `06`, `07`, `08`, `11`. Only the staff-specific ones are detailed below.

---

## 2. Home

**`GET /staff/home`** — one call renders the whole home screen.

```json
{
  "success": true,
  "data": {
    "staff": { "id": "usr_01HQ8Z...", "name": "Rahul Nair", "role": "BRANCH_STAFF" },
    "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR" },
    "tenant": {
      "displayName": "Sree Gold",
      "logoUrl": "https://cdn.../logo.png",
      "branding": { "primaryColor": "#7B1E1E", "onPrimaryColor": "#FFFFFF", "secondaryColor": "#C9A227", "onSecondaryColor": "#1A1A1A" }
    },

    "goldRate": {
      "purity": "22K",
      "ratePerGram": { "ratePerGramPaise": 725000, "ratePerGramDisplay": "₹7,250" },
      "asOf": "2026-09-14T09:00:00+05:30",
      "isSetForToday": true,
      "change": { "amountDisplay": "₹60", "percent": 0.83, "direction": "up" }
    },

    "today": {
      "collected": { "amountPaise": 1350000, "amountDisplay": "₹13,500" },
      "receiptCount": 8,
      "enrolments": 2,
      "goldCredited": { "weightMg": 1862, "weightDisplay": "1.862 g" },
      "byMode": [
        { "mode": "CASH", "label": "Cash", "count": 4, "amount": { "amountPaise": 700000, "amountDisplay": "₹7,000" } },
        { "mode": "CARD", "label": "Card / POS", "count": 1, "amount": { "amountPaise": 200000, "amountDisplay": "₹2,000" } },
        { "mode": "UPI", "label": "UPI", "count": 2, "amount": { "amountPaise": 300000, "amountDisplay": "₹3,000" } },
        { "mode": "BANK_TRANSFER", "label": "Bank transfer", "count": 0, "amount": { "amountPaise": 0, "amountDisplay": "₹0" } },
        { "mode": "CHEQUE", "label": "Cheque", "count": 0, "amount": { "amountPaise": 0, "amountDisplay": "₹0" } },
        { "mode": "ONLINE_GATEWAY", "label": "Online payment", "count": 1, "amount": { "amountPaise": 150000, "amountDisplay": "₹1,500" } }
      ]
    },

    "cash": {
      "cashInHand": { "amountPaise": 1850000, "amountDisplay": "₹18,500" },
      "pendingAcceptance": { "amountPaise": 0, "amountDisplay": "₹0" },
      "daysHolding": 2,
      "needsHandover": true,
      "ctaLabel": "Hand over ₹18,500"
    },

    "dues": {
      "todayCount": 12,
      "todayAmount": { "amountPaise": 6000000, "amountDisplay": "₹60,000" },
      "overdueCount": 18,
      "overdueAmount": { "amountPaise": 11400000, "amountDisplay": "₹1,14,000" },
      "thisWeekCount": 41
    },

    "maturities": { "thisMonthCount": 6, "pendingRedemptionCount": 2 },

    "banners": [
      { "severity": "MEDIUM", "key": "CASH_HANDOVER_PENDING", "title": "You're holding ₹18,500", "body": "Hand over to your branch before closing today.", "actionLabel": "Hand over", "actionScreen": "CASH_HANDOVER" }
    ],

    "quickActions": [
      { "key": "COLLECT_PAYMENT", "label": "Collect payment", "enabled": true },
      { "key": "NEW_CUSTOMER", "label": "New customer", "enabled": true },
      { "key": "TODAY_DUES", "label": "Today's dues", "enabled": true, "badge": 12 },
      { "key": "CASH_HANDOVER", "label": "Cash handover", "enabled": true, "badge": null }
    ],

    "unreadNotifications": 1
  }
}
```

### Today's breakdown rules

- `today.cashCollected` and `today.onlineCollected` are **removed**. They cannot represent Card, UPI, Bank transfer, Cheque and Online gateway honestly — collapsing five distinct channels into "online" was the bug. Drop them after a short compatibility window.
- `today.collected` equals the sum of all successful `today.byMode[].amount` values.
- All six mode rows are returned in the fixed order above, **including zero rows**, so the staff UI renders a predictable breakdown. `LEGACY_ONLINE` appears only if a historical record falls in the window.
- `cash.cashInHand` is derived only from successful `CASH` payments minus accepted handovers and adjustments. **No other mode touches it.**
- `/staff/dashboard/summary` (`14 §6`) remains the optional personal-performance view. It does not replace this operational home response.

When `goldRate.isSetForToday` is `false`, a blocking banner appears with `key: "GOLD_RATE_NOT_SET"` and gold-scheme collection is disabled in the UI — the server will reject it anyway with `GOLD_RATE_NOT_SET`, but the app should not let the staff member waste a customer's time at the counter.

---

## 3. Customer search

**`GET /staff/customers?q=9847`**

Search-first UX: the staff member types a mobile fragment, name or passbook number. Results are branch-scoped.

```json
{
  "success": true,
  "data": [
    {
      "id": "cus_01HQ8Z...",
      "name": "Anjali Menon",
      "mobile": "9847XXXX33",
      "passbookNumber": "MGR/2026/00412",
      "activeSchemeCount": 2,
      "nextDue": { "date": "2026-09-20", "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" }, "daysAway": 6, "isOverdue": false },
      "overdue": { "count": 0, "amount": { "amountPaise": 0, "amountDisplay": "₹0" } },
      "quickAction": { "label": "Collect ₹5,000", "schemeId": "sch_01HQ8Z...", "enabled": true }
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false }
}
```

`quickAction` is server-decided: the single most likely action for this customer right now. If they have one active scheme with a due, it's "Collect ₹X". If they have multiple, it's "View schemes". If none, it's "Enrol in a scheme".

---

## 4. Collect payment

The staff app's core screen. Three calls:

1. `GET /staff/schemes/:schemeId/payable-range` → renders the amount field with min/max/suggested and `quickAmounts`
2. `POST /staff/payments` → posts it
3. `POST /staff/payments/:paymentId/share-whatsapp` → optional explicit re-share

**`POST /staff/payments`** — same contract as `07 §2`. Response includes the two fields the staff app needs immediately:

```json
{
  "receiptNumber": "SG/MGR/2026/001284",
  "cashInHandAfter": { "amountPaise": 1350000, "amountDisplay": "₹13,500" },
  "passbookImage": { "status": "GENERATING", "pollUrl": "/api/v1/staff/payments/pay_01HQ8Z.../passbook-image" },
  "messages": [ { "messageType": "PAYMENT_SUCCESS", "status": "QUEUED", "willAttachPassbookImage": true } ],
  "auditEventId": "aud_01PAY..."
}
```

The success screen shows the receipt number, the updated cash-in-hand, and a share button. The WhatsApp confirmation with the passbook image is already queued — the share button is for re-sending to a different number or sharing via the phone's native sheet.

**Scheme-type-aware collection.** The payment sheet reads `payableThisMonth` from the scheme object, exactly as the customer app does:

| Scheme state | Amount field behaviour |
|---|---|
| Fixed | Pre-filled with the installment amount, editable up to `max` |
| Flexible free window | Empty, placeholder "Any amount ₹500 – ₹1,00,000", `quickAmounts` chips |
| Flexible lock window | Pre-filled with the locked amount, editable up to `max`, helper shows "covers installments 3–5" |

---

## 5. Enrol a customer

**`POST /staff/schemes/enrol`** — identical to `06 §4`, minus `branchId` (derived). The staff flow is:

1. `GET /staff/customers/check-mobile?mobile=...` — existing or new
2. `POST /staff/customers` if new
3. `GET /staff/scheme-plans` — plans available at this branch
4. `POST /staff/schemes/enrol/validate` — live preview + blockers
5. `POST /staff/schemes/enrol` — with `firstInstallmentMode`, `firstInstallmentAction`, and `firstPayment` only for `RECORD_MANUAL_PAYMENT`

**`GET /staff/scheme-plans`**
```json
{
  "success": true,
  "data": [
    {
      "id": "spl_01HQ7...",
      "name": "Dhanam 11",
      "displayName": "Dhanam Gold Savings",
      "valueBasis": "CASH",
      "paymentPattern": "FIXED",
      "durationMonths": 11,
      "amountSummary": {
        "amountMode": "CUSTOMER_CHOSEN",
        "label": "₹1,000 – ₹50,000 (multiples of ₹500)",
        "min": { "amountPaise": 100000, "amountDisplay": "₹1,000" },
        "max": { "amountPaise": 5000000, "amountDisplay": "₹50,000" },
        "multipleOf": { "amountPaise": 50000, "amountDisplay": "₹500" },
        "slabs": null
      },
      "benefitLabel": "12th installment free",
      "firstInstallmentModeDefault": "COLLECT_NOW",
      "firstInstallmentModeEditable": true,
      "enrolable": true
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false }
}
```

The enrolment screen must surface the first-installment choice plainly, because it is the decision that determines the whole schedule:

- **Collect now** — "Customer pays today. Installment 1 is dated today; next payment 10 Oct."
- **Start next cycle** — "No payment today. Installment 1 is due 10 Oct."

`POST /staff/schemes/enrol/validate` returns the resulting `schedulePreview` for whichever mode is selected, so the customer sees the actual dates before signing.

---

## 6. Own collection summary

**`GET /staff/collections/summary?preset=TODAY`**

```json
{
  "success": true,
  "data": {
    "period": { "from": "2026-09-14", "to": "2026-09-14", "label": "Today" },
    "totals": {
      "collected": { "amountPaise": 1350000, "amountDisplay": "₹13,500" },
      "receiptCount": 8,
      "enrolments": 2,
      "goldCredited": { "weightMg": 1862, "weightDisplay": "1.862 g" }
    },
    "byMode": [
      { "mode": "CASH", "label": "Cash", "count": 4, "amount": { "amountPaise": 700000, "amountDisplay": "₹7,000" } },
      { "mode": "CARD", "label": "Card / POS", "count": 1, "amount": { "amountPaise": 200000, "amountDisplay": "₹2,000" } },
      { "mode": "UPI", "label": "UPI", "count": 2, "amount": { "amountPaise": 300000, "amountDisplay": "₹3,000" } },
      { "mode": "BANK_TRANSFER", "label": "Bank transfer", "count": 0, "amount": { "amountPaise": 0, "amountDisplay": "₹0" } },
      { "mode": "CHEQUE", "label": "Cheque", "count": 0, "amount": { "amountPaise": 0, "amountDisplay": "₹0" } },
      { "mode": "ONLINE_GATEWAY", "label": "Online payment", "count": 1, "amount": { "amountPaise": 150000, "amountDisplay": "₹1,500" } }
    ],
    "chart": {
      "chartType": "line",
      "title": "My collections",
      "yAxis": { "type": "currency", "label": "Amount" },
      "series": [ { "key": "collected", "name": "Collected", "data": [ { "x": "2026-09-12", "y": 1840000, "yDisplay": "₹18,400" }, { "x": "2026-09-13", "y": 2210000, "yDisplay": "₹22,100" }, { "x": "2026-09-14", "y": 1350000, "yDisplay": "₹13,500" } ] } ]
    },
    "recentReceipts": [
      {
        "paymentId": "pay_01HQ8Z...",
        "receiptNumber": "SG/MGR/2026/001284",
        "customerName": "Anjali Menon",
        "amount": { "amountPaise": 500000, "amountDisplay": "₹5,000" },
        "mode": "CASH",
        "paidAt": "2026-09-14T10:30:00+05:30",
        "canShare": true
      }
    ]
  }
}
```

Staff see only their own numbers here. Branch-level figures are on the portal for managers.

---

## 7. Cash handover

Covered fully in `11 §3–§5`. The staff app screens are:

- **Cash card on home** — `GET /staff/cash/summary`
- **Review screen** — `GET /staff/cash/collections?sinceLastHandover=true`, itemised receipts and totals
- **Submit** — `POST /staff/cash/handovers` with amount, receipt count, optional denominations
- **History** — `GET /staff/cash/handovers`, with status chips and the timeline on detail

Denomination entry is optional but worth designing: it turns a disputed count into an auditable one.

---

## 8. Notifications & FCM

**`POST /staff/devices/fcm-token`** — same contract as `12 §9`, with staff topics:

```json
{
  "topics": ["tenant_tnt_01HQ7A", "branch_brn_01HQ7A", "staff_usr_01HQ8Z", "role_BRANCH_STAFF"]
}
```

Staff push types: `CASH_HANDOVER_ACCEPTED`, `CASH_HANDOVER_REJECTED`, `CASH_HANDOVER_DISCREPANCY`, `PAYMENT_RECEIVED_ONLINE` (a customer of theirs paid via link), `DUE_REMINDER_DIGEST` (morning digest of today's dues), `GOLD_RATE_UPDATED`, `GOLD_RATE_NOT_SET` (morning nudge to the branch), `SCHEME_MATURED`, `ANNOUNCEMENT`.

**`GET /staff/notifications`**
```json
{
  "success": true,
  "data": [
    {
      "id": "ntf_01HQ9Z...",
      "type": "CASH_HANDOVER_ACCEPTED",
      "title": "Handover of ₹18,500 accepted",
      "body": "Priya S accepted your handover MGR/CH/2026/00192. Your cash in hand is now ₹0.",
      "createdAt": "2026-09-14T14:45:00+05:30",
      "read": false,
      "deepLink": { "screen": "CASH_HANDOVER_DETAIL", "params": { "handoverId": "hov_01HQ8Z..." } }
    },
    {
      "id": "ntf_01HQ9Y...",
      "type": "DUE_REMINDER_DIGEST",
      "title": "12 dues today — ₹60,000",
      "body": "18 overdue customers also need follow-up.",
      "createdAt": "2026-09-14T08:00:00+05:30",
      "read": true,
      "deepLink": { "screen": "DUES", "params": { "preset": "TODAY" } }
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false, "unreadCount": 1 }
}
```

---

## 9. Profile

**`GET /staff/profile`**
```json
{
  "success": true,
  "data": {
    "id": "usr_01HQ8Z...",
    "name": "Rahul Nair",
    "mobile": "9846778899",
    "role": "BRANCH_STAFF",
    "roleLabel": "Branch Staff",
    "branch": { "id": "brn_01HQ7A...", "name": "MG Road", "code": "MGR", "contactNumber": "9846543211" },
    "permissions": ["customer.read", "customer.write", "scheme.enrol", "payment.record", "cash.handover.create"],
    "joinedAt": "2026-04-10T09:00:00+05:30",
    "stats": {
      "thisMonth": {
        "collected": { "amountPaise": 18400000, "amountDisplay": "₹1,84,000" },
        "enrolments": 12,
        "receiptCount": 94
      }
    },
    "mustChangePassword": false
  }
}
```

Staff cannot edit their own name, mobile, role or branch — those are admin-controlled. Only password change is available on this screen.

---

## 10. What the staff app deliberately cannot do

These are enforced server-side; the UI should not render the affordances at all.

| Action | Why |
|---|---|
| Reverse a payment | Requires `payment.reverse` — manager/admin only |
| Accept a cash handover | Requires `cash.handover.accept` — the collector cannot clear their own balance |
| Initiate or approve a redemption | Requires `redemption.initiate` / `redemption.approve` |
| Block a customer | Requires `customer.block` |
| Set the gold rate | Requires `goldrate.write` |
| See another branch's data | Branch scoping — returns `404` |
| See another staff member's collections or cash | Own-scope only |
| Create or edit scheme plans | Requires `plan.write` |
| View reports beyond own collections | Requires `report.read` |

A `BRANCH_MANAGER` logging into the staff app gets the extra affordances their permissions allow — the app should render from the `permissions` array returned at login rather than hardcoding by role.
