# SwarnaGrow Tenant Admin (portals) — dev handoff (ecommerce branch snapshot)

**Confidential:** `.env.local` may point at a live API URL. Share this zip only with trusted teammates.

## Prerequisites

- **Node.js 22.13+**
- **pnpm** — `corepack enable && corepack prepare pnpm@latest --activate`

## Quick start

```bash
cd SwarnaGrow-Tenant-Admin   # folder name after unzip
pnpm install
# .env.local is included — points at local API when USE_MOCKS=false
pnpm dev
```

Open the tenant admin URL printed in the terminal (Vinext dev server).

## Environment (included)

| File | Purpose |
|------|---------|
| `.env.example` | Template |
| `.env.local` | **Active** — `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_USE_MOCKS` |

**Align with backend:** Backend handoff uses `PORT=4050`, so API is  
`http://localhost:4050/api/v1` (already set in bundled `.env.local`).

To use mocks only (no backend):

```env
NEXT_PUBLIC_USE_MOCKS=true
```

## Connect to backend

1. Start backend (`npm run dev` in backend repo).
2. Ensure `.env.local` has:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:4050/api/v1
   NEXT_PUBLIC_USE_MOCKS=false
   ```
3. Log in with seeded tenant user (see backend `npm run seed` / `docs/DEMO_CREDENTIALS.md` if present in zip).

## Ecommerce UI in this snapshot

- Catalog / categories / products — promotion composer & campaigns page
- Ecommerce gold rates — **Now** vs **Schedule**, optional notify
- Scheme gold rates — notify toggle + notification history table
- Product dialog — version conflict draft / reapply flow

## Verify

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

## Git

Frontend repo was **not** on GitHub at handoff time. Prefer cloning from the team remote once `origin` is configured; until then use this zip.
