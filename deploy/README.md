# Deploying the portal to S3 + CloudFront

The portal is a single-page app. Every route (`/dashboard`, `/customers/cus_01`, `/platform/tenants`,
`/customer/kairali/shop`, `/landing` ...) is drawn in the browser from one HTML file, and moving between
pages never reloads the document. S3 only needs to serve files. CloudFront maps every app URL to
`index.html`.

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

To try the exact production behaviour locally first, run `pnpm run preview:static` and open http://127.0.0.1:4173.

## 2. S3 bucket

- Keep **Block all public access** on. CloudFront reads the bucket through Origin Access Control (OAC).
- Static website hosting: **off**. Use the bucket's REST endpoint as the origin, not the website endpoint.

## 3. CloudFront distribution (one time)

1. **Origin:** the S3 bucket with **Origin access control** (let CloudFront update the bucket policy).
2. **Default root object:** `index.html`.
3. **Default behaviour:**
   - Viewer protocol: Redirect HTTP to HTTPS.
   - Allowed methods: GET, HEAD.
   - Cache policy: `CachingOptimized`.
   - Compress objects: Yes.
4. **CloudFront Functions:**
   - Create a function named `swarna-spa-rewrite` with runtime `cloudfront-js-2.0`.
   - Paste [`cloudfront/spa-rewrite.js`](cloudfront/spa-rewrite.js), then **Publish** it.
   - Associate it with the default behaviour as **Viewer request**.
5. **Error pages:** leave the custom error responses empty. Don't add 403/404 → `/index.html`. The
   function already handles app routes. A missing JS file should stay a real 404, not an HTML page
   that breaks the app.
6. **Optional, recommended:** add a response headers policy with HSTS and `X-Content-Type-Options: nosniff`.

The function:

- Passes real files (anything with an extension, such as `/_next/static/...js`, `/lp/...mp4` or `/favicon.svg`) straight to S3.
- Sends `/payment-return...` to `/payment-return/index.html` (the PhonePe return page).
- Sends every other path to `/index.html`.
- Redirects `/dashboard/` to `/dashboard` with a 301.

## 4. Upload (every release)

```
S3_BUCKET=your-bucket CLOUDFRONT_DISTRIBUTION_ID=E123ABC456 pnpm run deploy:s3
```

The script uploads hashed `_next/` files with a 1-year immutable cache, other assets with a 1-day
cache, and HTML with `no-cache`. It then invalidates the HTML. Old `_next/` chunks are kept so tabs
still open on the previous build can lazy-load them.

To upload by hand from the S3 console instead:

- Upload everything inside `static-dist/`.
- Set `Cache-Control: no-cache` on the `.html` files.
- Run an invalidation for `/index.html`.

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
- Emergency switch: building with `NEXT_PUBLIC_PORTAL_HARD_NAV=true` brings back full reloads for portal links.
