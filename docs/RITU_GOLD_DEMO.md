# Ritu Gold and Diamonds — client demo (Palakkad)

Demo tenant for **Ritu Gold and Diamonds**, Palakkad. Configured for **jewellery admin portal only** (no customer app / staff app in this demo).

## Seed (local / demo API)

From `swarnagrow-backend`:

```bash
npm run seed:ritu-gold
```

Re-running replaces all data for tenant `RITUGOLD`. The script is **slow on purpose** (real payments through the ledger). Watch the terminal for `[ritu-gold seed]` progress lines; allow **about 2–4 minutes**.

## Login

| Field | Value |
|--------|--------|
| **Tenant code** | `RITUGOLD` |
| **Mobile** | `9847654321` |
| **Password** | `2026` |

Portal: sign in at your tenant admin URL (organization **RITUGOLD** on login).

## Branch

- **Palakkad Showroom** — Sultanpet Road, Palakkad, Kerala 678001

## Schemes (both gold weight, 22K daily rate)

### 1. `RITU18FIX` — 18-month fixed

- Fixed **₹5,000/month** for **18 months**; gold weight at daily rate.
- **Maturity:** **100% bonus** gold on total paid.
- Redemption modes: **gold handover**, **purchase adjustment** (no cash). Terms: **no MC** on scheme gold.

### 2. `RITU18FLEX` — flexible 18 months + closure

- **18 flexible months** (any amount within limits; multiple payments per month).
- **1 capped closure cycle**, then maturity.
- **Maturity:** **5% bonus** gold. Same redemption modes and no-MC terms.

## Test customers (22)

Search by **name** in Customers or Enrollments. Mobiles `9847654401`–`9847654422`.

| Customer | What to test |
|----------|----------------|
| Anjali Menon | Fixed · `PENDING_PAYMENT` (first instalment due) |
| Suresh Nair | Fixed · `ACTIVE` · just enrolled |
| Priya Krishnan | Fixed · 2 instalments paid |
| Ramesh Iyer | Fixed · mid (9/18) |
| Lakshmi Devi | Fixed · advance (2 instalments one receipt) |
| Vijay Kumar | Fixed · overdue / dues |
| Meera Unni | Fixed · `DEFAULTED` |
| Gopal Menon | Fixed · near complete (16/18) |
| Deepa Nambiar | Fixed · `MATURED` · redeem |
| Arun Pillai | Fixed · maturity redemption **pending** (Maturity queue) |
| Sneha Raj | Fixed · redemption **approved** (complete handover) |
| Kiran Das | Fixed · **REDEEMED** |
| Nisha Varma | Fixed · **CLOSED_PREMATURE** (completed) |
| Manoj Thomas | Fixed · premature **approved**, awaiting completion |
| Reena Joseph | Fixed · `MATURED` · redemption **rejected** (retry) |
| Biju Kurup | Flex · free phase · no payments |
| Shalini Mohan | Flex · free phase · multiple payments |
| Harish Nair | Flex · free phase mid (6 cycles) |
| Divya Sreekumar | Flex · **LOCKED** · partial capped payment |
| Sajan Mathew | Flex · capped done · **MATURED** |
| Asha Prasad | Flex · **MATURED** · redemption pending |
| Rohit Balakrishnan | Flex · premature closure **approved** (free phase) |

Gold rate in seed: **₹7,200/g** (22K).

## Client visit

1. Dashboard, **Dues**, **Enrollments**, **Collections**, **Maturity / Redemptions**.
2. Open a few rows from the table above; show fixed vs flex schedule and settlement preview.
3. Admin-only operation (customer app flags off).

Adjust amounts, rates, and branding under **Settings / Schemes** after seed.
