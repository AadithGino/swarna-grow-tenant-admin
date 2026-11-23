# Deploying the portal to S3 + CloudFront

The portal is a single-page app. Every route (`/dashboard`, `/customers/cus_01`, `/platform/tenants`,
`/customer/kairali/shop`, `/landing` ...) is drawn in the browser from one HTML file, and moving between
pages never reloads the document. S3 only needs to serve files, and CloudFront's custom error
responses send every app URL to `index.html`.

## 1. Build

Create `.env.static.production` in the project root (it is git-ignored):

```
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.com/api/v1
# plus any other NEXT_PUBLIC_* values you use in production
```

Then:

```
pnpm install --frozen-lockfile
pnpm run build:static
```

This writes:

- `static-dist/`: upload the **contents** of this folder to the bucket root.
- `static-deploy.zip`: the same files, zipped. S3 does not unzip archives, so unzip it and upload the
  files. Don't upload the .zip itself.

To try the exact production behaviour locally first, run `pnpm run preview:static` and open
http://127.0.0.1:4173. It serves files the way S3 does and falls back to `index.html` like the
CloudFront error responses.

## 2. S3 bucket

- Keep **Block all public access** on. CloudFront reads the bucket through Origin Access Control (OAC).
- Static website hosting: **off**. Use the bucket's REST endpoint as the origin, not the website endpoint.

## 3. CloudFront distribution (one time)

1. **Origin:** the S3 bucket's REST endpoint with **Origin access control (OAC)**. Let CloudFront
   update the bucket policy.
2. **Default root object:** `index.html`.
3. **Default behaviour:**
   - Viewer protocol: Redirect HTTP to HTTPS.
   - Allowed methods: GET, HEAD.
   - Cache policy: `CachingOptimized`.
   - Compress objects: Yes.
   - No functions or Lambda@Edge.
4. **Error pages:** create two custom error responses.

   | HTTP error code | Error caching minimum TTL | Customize error response | Response page path | HTTP response code |
   |---|---|---|---|---|
   | 403: Forbidden | 0 | Yes | `/index.html` | 200: OK |
   | 404: Not Found | 0 | Yes | `/index.html` | 200: OK |

   You need both codes. With OAC and no `s3:ListBucket` permission, S3 answers a missing key with
   403, not 404. Set the TTL to 0 so a new deploy shows up straight away on deep links.
5. **Optional, recommended:** add a response headers policy with HSTS and `X-Content-Type-Options: nosniff`.

How it works: real files (`/_next/static/...js`, `/lp/...mp4`, `/favicon.svg`) come straight from
S3. Every app URL (`/dashboard`, `/customers/cus_01`, `/payment-return?...`) has no file in S3, so
CloudFront answers it with `index.html` and status 200. The app then draws the right page from the URL.

One side effect: a JS file that doesn't exist also gets `index.html` back. The only time that
happens is a tab left open on an old build after a deploy. The app detects it and reloads once
to pick up the new build. The deploy script also keeps old `_next/` files, so this is rare.

## 4. Upload (every release)

```
S3_BUCKET=your-bucket CLOUDFRONT_DISTRIBUTION_ID=E123ABC456 pnpm run deploy:s3
```

The script uploads hashed `_next/` files with a 1-year immutable cache, other assets with a 1-day
cache, and HTML with `no-cache`. It then invalidates `/*`. Old `_next/` chunks are kept so tabs
still open on the previous build can lazy-load them.

To upload by hand from the S3 console instead:

- Upload everything inside `static-dist/`.
- Set `Cache-Control: no-cache` on `index.html`.
- Run an invalidation for `/*`.

## How navigation works (for developers)

- `next/link` and `next/navigation`'s `useRouter` in app code resolve to `src/lib/spa/*`. This is set
  up by the `swarna-spa-navigation` plugin in `vite.config.ts`.
- They change the URL with `history.pushState`, and the portal router re-renders from
  `useBrowserPathname()`. The sidebar and top bar stay mounted.
- Plain `<a href="/...">` links are handled the same way by `StaticHardNav` (in `providers.tsx`).
- Back and Forward stay in the page, and scroll position is restored. This is done by
  `SPA_POPSTATE_GUARD` in `app/layout.tsx`.
- No `?_rsc` requests are made. Without this, vinext would request server data on every link, which
  S3 can't serve, and then reload the whole page.
- Force a real page load for one link with `<a href="..." data-hard-nav>`.
