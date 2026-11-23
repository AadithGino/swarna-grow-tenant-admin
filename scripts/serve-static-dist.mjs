#!/usr/bin/env node
/**
 * Local stand-in for S3 + CloudFront with custom error responses:
 *  - a file that exists is served as-is (like S3),
 *  - anything else answers /index.html with status 200 (CloudFront 403/404 -> /index.html, 200).
 * Use it to test a build before upload:
 *   node scripts/serve-static-dist.mjs [port]
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "static-dist");
const port = Number(process.argv[2] || 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function send(res, file, status = 200) {
  const rel = file.slice(dist.length).replace(/\\/g, "/");
  res.writeHead(status, {
    "content-type": TYPES[extname(file).toLowerCase()] || "application/octet-stream",
    "cache-control": rel.startsWith("/_next/static/")
      ? "public, max-age=31536000, immutable"
      : rel.endsWith(".html")
        ? "no-cache"
        : "public, max-age=86400",
  });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  // CloudFront "default root object".
  const key = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const file = normalize(join(dist, key));
  if (file.startsWith(dist) && existsSync(file) && statSync(file).isFile()) {
    send(res, file);
    return;
  }
  // S3 says 403/404 -> CloudFront custom error response -> /index.html with 200.
  send(res, join(dist, "index.html"));
}).listen(port, () => console.log(`static-dist (S3 + CloudFront error responses) on http://127.0.0.1:${port}`));
