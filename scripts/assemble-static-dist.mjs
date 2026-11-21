#!/usr/bin/env node
/**
 * Builds a static SPA bundle for S3 + CloudFront (also works on Netlify).
 *
 * Input:  dist/client (from `vinext build`)
 * Output: static-dist/            upload the CONTENTS of this folder to the bucket root
 *         static-deploy.zip       same files, zipped (unzip before uploading; S3 does not unzip)
 *
 * Every app route is rendered by one client router, so one HTML shell (index.html)
 * serves all paths. /payment-return is a separate Next route and gets its own shell.
 */
import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientDir = join(root, "dist", "client");
const outDir = join(root, "static-dist");
const zipPath = join(root, "static-deploy.zip");
const port = Number(process.env.STATIC_PRERENDER_PORT || 3199);
const envFile = process.argv.find((a) => a.startsWith("--env-file="))?.slice("--env-file=".length);

/** Shells to render. Key = request path, value = output file. */
const SHELLS = {
  "/": "index.html",
  "/payment-return": "payment-return/index.html",
};

if (!existsSync(clientDir)) {
  console.error("Missing dist/client. Run the build first.");
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
rmSync(zipPath, { force: true });
mkdirSync(outDir, { recursive: true });
cpSync(clientDir, outDir, { recursive: true });
// Build metadata that should not be public.
rmSync(join(outDir, "vinext-client-entry-manifest.json"), { force: true });

const vinextCli = join(root, "node_modules", "vinext", "dist", "cli.js");
const args = [];
if (envFile && existsSync(join(root, envFile))) args.push(`--env-file=${join(root, envFile)}`);
args.push(vinextCli, "start", "--port", String(port));
const server = spawn(process.execPath, args, { cwd: root, stdio: "ignore", detached: true });
server.unref();

async function fetchWithRetry(url) {
  let lastError;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(url, { headers: { accept: "text/html" } });
      if (res.ok) return await res.text();
      lastError = new Error(`${url} -> HTTP ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw lastError;
}

let failed = false;
try {
  for (const [route, file] of Object.entries(SHELLS)) {
    const html = await fetchWithRetry(`http://127.0.0.1:${port}${route}`);
    if (!html.includes("</html>")) throw new Error(`${route}: incomplete HTML`);
    const target = join(outDir, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, html);
  }
} catch (error) {
  failed = true;
  console.error(String(error));
} finally {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    try {
      process.kill(server.pid, "SIGTERM");
    } catch {
      /* already gone */
    }
  }
}
if (failed) process.exit(1);

// Netlify fallback (ignored by S3/CloudFront, which use deploy/cloudfront/spa-rewrite.js).
writeFileSync(
  join(outDir, "_redirects"),
  [
    "/payment-return    /payment-return/index.html    200",
    "/payment-return/*  /payment-return/index.html    200",
    "/*                 /index.html                   200",
    "",
  ].join("\n"),
);
writeFileSync(
  join(outDir, "_headers"),
  [
    "/_next/static/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "/*.html",
    "  Cache-Control: no-cache",
    "/",
    "  Cache-Control: no-cache",
    "",
  ].join("\n"),
);

const zip = spawnSync("zip", ["-r", "-q", zipPath, "."], { cwd: outDir, stdio: "inherit" });
if (zip.status !== 0) {
  console.error("zip failed (is the `zip` command installed?)");
  process.exit(1);
}

const indexSize = statSync(join(outDir, "index.html")).size;
const hasBootstrap = readFileSync(join(outDir, "index.html"), "utf8").includes("sg-static-location-bootstrap");
console.log(
  JSON.stringify({ ok: true, outDir: "static-dist", zip: "static-deploy.zip", shells: SHELLS, indexBytes: indexSize, hasBootstrap }),
);
