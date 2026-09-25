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
# Agent login uses /agent/kairali/login (no env tenant code required)
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
| Tenant owner | Rahul Nair | `9847012345` | All branches |
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
| **URL** | `/agent/kairali/login` |
| **Tenant code** | In the URL slug (`kairali` → `KAIRALI`) |
| **Mobile** | `9847012352` |
| **Password** | `2026` |
| **User** | Vijay Field — collection agent, Kochi (`KOC`) |

Only users with role `COLLECTION_AGENT` and an assigned `branchId` can use this portal.

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

## Quick reference

| Portal | Login URL | Identifier | Secret |
|--------|-----------|------------|--------|
| Platform | `/platform/login` | `ops@platform.com` | `1234` |
| Tenant | `/login` | Tenant `KAIRALI` + mobile | `2026` |
| Agent | `/agent/kairali/login` | `9847012352` | `2026` |
| Customer | `/customer/kairali/login` | Mobile (see table) | OTP `123456` |

---

## API base

| Service | Default |
|---------|---------|
| Backend API | `http://localhost:4000/api/v1` |
| Frontend | `http://localhost:3000` (or your dev server port) |

## Notes

- Staff/agent passwords are **4-digit PINs** (`2026`), not `Swarna@2026` (outdated in some contract docs).
- Platform password defaults to `1234` (min 4 chars in seed); override via `SEED_PLATFORM_PASSWORD`.
- PhonePe and WhatsApp run in **mock mode** until configured per tenant / env.
- All four portals can stay signed in in the **same browser** (separate `localStorage` keys per portal).
