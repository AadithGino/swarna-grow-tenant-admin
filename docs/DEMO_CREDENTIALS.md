# SwarnaGrow demo credentials

Local development logins after seeding the backend. **Not for production.**

## Setup

```bash
# Backend (swarnagrow-backend)
npm run seed        # platform super-admin + subscription plans
npm run seed:demo   # KAIRALI tenant, staff, customers, schemes

# Frontend (SwarnaGrow-Tenant-Admin)
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_AGENT_TENANT_CODE=KAIRALI
```

Re-running `npm run seed:demo` **replaces** all KAIRALI demo data. Existing refresh tokens stop working — sign in again in every open portal tab.

---

## Platform (super admin)

| Field | Value |
|--------|--------|
| **URL** | `/platform/login` |
| **Email** | `ops@platform.com` |
| **Password** | `1234` |

From `SEED_PLATFORM_EMAIL` / `SEED_PLATFORM_PASSWORD` in backend `.env` (defaults above).

---

## Tenant admin (jeweller back office)

| Field | Value |
|--------|--------|
| **URL** | `/login` |
| **Tenant code** | `KAIRALI` |
| **Password (all staff below)** | `2026` |

| Role | Name | Mobile | Branch |
|------|------|--------|--------|
| Tenant owner | Rahul Nair | `image.png` | All branches |
| Tenant admin | Divya Admin | `9847012347` | All branches |
| Branch manager | Anu Menon | `9847012346` | Kochi (`KOC`) |
| Branch staff | Priya K | `9847012350` | Mangalore HQ (`MGR`) |
| Branch staff | Sanjay M | `9847012351` | Mangalore HQ (`MGR`) |
| Branch staff | Reena K | `9847012353` | Kochi (`KOC`) |

**Branches:** `MGR` — MG Road Mangalore (HQ) · `KOC` — Kochi Showroom

---

## Collection agent (field portal)

| Field | Value |
|--------|--------|
| **URL** | `/agent/login` |
| **Tenant code** | `KAIRALI` (optional if `NEXT_PUBLIC_AGENT_TENANT_CODE=KAIRALI`) |
| **Mobile** | `9847012352` |
| **Password** | `2026` |
| **User** | Vijay Field — collection agent, Kochi (`KOC`) |

Only users with role `COLLECTION_AGENT` and an assigned `branchId` can use this portal.

---

## Digital gold & silver (KAIRALI)

After `npm run seed:demo`, enable trading on the **same MongoDB as your API**:

```bash
cd swarnagrow-backend
npm run seed:kairali-digital-metals          # first-time setup
npm run patch:kairali-digital-metals         # refresh rates + tax approval (stale rate / tax mismatch)
```

Customer path: `/customer/kairali/digital-metals`. If you see tax or stale-rate blockers, run the patch again.

---

## Customer portal

| Field | Value |
|--------|--------|
| **URL** | `/customer/kairali/login` |
| **Tenant slug** | `kairali` → code `KAIRALI` |
| **Auth** | OTP (mock provider in dev) |
| **Mock OTP** | `123456` |

### Example customers (after `seed:demo`)

Use **Sign in** → enter mobile → request OTP → enter `123456`.

| Name | Mobile | Notes |
|------|--------|--------|
| Lakshmi Nair | `9847123456` | Fixed schemes, HQ |
| Arjun Pillai | `9847234567` | Kochi |
| Flexi Amal | `9847901234` | Flexible scheme |
| Gold Hari | `9847934567` | Gold-weight scheme |
| Sachu Sudhish | `7907753163` | Primary demo customer |

Customers do **not** use the staff password `2026`. Registration is OTP-only unless the tenant enables password login in settings.

---

## Noble Jewellery (fixed gold schemes demo)

Full client-demo dataset (48 customers, all scheme states, today’s collections):

```bash
cd swarnagrow-backend
npm run seed:noble-jewellery   # replaces tenant NOBLE if it exists
```

| Field | Value |
|--------|--------|
| **URL** | `/login` |
| **Tenant code** | `NOBLE` |
| **Password (all staff below)** | `2026` |

| Role | Name | Mobile | Branch |
|------|------|--------|--------|
| Tenant owner | Rajesh Noble | `9847020100` | All branches |
| Branch manager | Anu Noble | `9847020101` | Thrissur Main (`MAIN`) |
| Branch staff | Priya Noble | `9847020102` | Thrissur Main (`MAIN`) |
| Branch staff | Sanjay K | `9847020103` | Kochi (`KOC`) |

**Plans:** Swarna (3m), Akshaya (6m), Tritiya (12m) — fixed gold weight only (STARTER tier; no flex / ecommerce / digital metals).

---

## EVO LUXE (cash scheme + ecommerce + digital metals)

Full jeweller demo with fixed cash 11+1 (₹5,000), online shop, and Digital Gold & Silver:

```bash
cd swarnagrow-backend-prod-verify-2026-11-03
npm run configure:evoluxe-phonepe   # PhonePe sandbox keys → tenant EVOLUXE in MongoDB
npm run patch:evoluxe-rates         # today's scheme + shop + digital gold/silver rates
```

**PhonePe (local):** Keys live on the tenant (`integrationSecrets.phonepe`), not `.env`. Backend needs `PROVIDER_MODE=live`, `PHONEPE_ENV=SANDBOX`. Frontend `.env.local`: `NEXT_PUBLIC_USE_MOCKS=false`, API `http://localhost:4050/api/v1`. If PhonePe returns `401 Unauthorized`, regenerate **Test credentials** in the PhonePe developer dashboard and re-run configure with:

`PHONEPE_BOOTSTRAP_CLIENT_ID=... PHONEPE_BOOTSTRAP_CLIENT_SECRET=... npm run configure:evoluxe-phonepe`

| Field | Value |
|--------|--------|
| **Tenant code** | `EVOLUXE` |
| **Password (all staff below)** | `2026` |
| **Admin URL** | `/login` |
| **Customer URL** | `/customer/evoluxe/login` |

| Role | Name | Mobile |
|------|------|--------|
| Tenant owner | Arjun Evo | `9847030100` |
| Branch manager | Neha Luxe | `9847030101` |
| Branch staff | Ravi Counter | `9847030102` |

**Hero customer (OTP `123456` in mock):** Meera Evo · `9847030200` · passbook `EVO-PB-0001`

Includes: active cash scheme (5/11 paid), matured + redeemed scheme, shop orders (PAID / DELIVERED / COD), digital gold+silver wallets, buy CREDITED, sell PENDING_APPROVAL, redemption CHARGE_PAID.

---

## Quick reference

| Portal | Login URL | Identifier | Secret |
|--------|-----------|------------|--------|
| Platform | `/platform/login` | `ops@platform.com` | `1234` |
| Tenant | `/login` | Tenant `KAIRALI` or `EVOLUXE` + mobile | `2026` |
| Agent | `/agent/login` | `9847012352` | `2026` |
| Customer | `/customer/kairali/login` or `/customer/evoluxe/login` | Mobile (see tables) | OTP `123456` |

---

## API base

| Service | Default |
|---------|---------|
| Backend API | `http://localhost:4050/api/v1` (local) · `https://swarnagrow-backend.vercel.app/api/v1` (Vercel) |
| Frontend | `http://localhost:5173` (local vinext) · `https://swarnagrow-tenant-admin.vercel.app` (Vercel) |

**Vercel frontend redeploy tip:** this app uses vinext + Nitro. Prefer local `pnpm run build:vercel` then `vercel deploy --prebuilt --prod` if a remote Vercel build returns 500.

## Notes

- Staff/agent passwords are **4-digit PINs** (`2026`), not `Swarna@2026` (outdated in some contract docs).
- Platform password defaults to `1234` (min 4 chars in seed); override via `SEED_PLATFORM_PASSWORD`.
- PhonePe and WhatsApp run in **mock mode** until configured per tenant / env.
- All four portals can stay signed in in the **same browser** (separate `localStorage` keys per portal).
