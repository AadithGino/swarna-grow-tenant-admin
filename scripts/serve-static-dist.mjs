#!/usr/bin/env node
/**
 * Local stand-in for S3 + CloudFront: serves static-dist/ and applies the exact
 * rewrite in deploy/cloudfront/spa-rewrite.js. Use it to test a build before upload.
 *   node scripts/serve-static-dist.mjs [port]
 */
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "static-dist");
const port = Number(process.argv[2] || 4173);

const sandbox = {};
vm.runInNewContext(
  `${readFileSync(join(root, "deploy/cloudfront/spa-rewrite.js"), "utf8")}\nthis.handler = handler;`,
  sandbox,
);

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

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const querystring = {};
  url.searchParams.forEach((value, key) => {
    querystring[key] = { value };
  });
  const out = sandbox.handler({ request: { uri: decodeURIComponent(url.pathname), querystring } });
  if (out.statusCode) {
    res.writeHead(out.statusCode, { location: out.headers.location.value });
    res.end();
    return;
  }
  const file = normalize(join(dist, out.uri));
  if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("404 (S3 NoSuchKey)");
    return;
  }
  const immutable = out.uri.startsWith("/_next/static/");
  res.writeHead(200, {
    "content-type": TYPES[extname(file).toLowerCase()] || "application/octet-stream",
    "cache-control": immutable ? "public, max-age=31536000, immutable" : out.uri.endsWith(".html") ? "no-cache" : "public, max-age=3600",
  });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`static-dist on http://127.0.0.1:${port}`));
