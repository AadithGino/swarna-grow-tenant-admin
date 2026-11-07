#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientDir = join(root, "dist", "client");
const outDir = join(root, "netlify-dist");
const port = 3198;

if (!existsSync(clientDir)) {
  console.error("Missing dist/client — run pnpm run build:netlify first.");
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(clientDir, outDir, { recursive: true });

const redirects = join(outDir, "_redirects");
if (!existsSync(redirects)) {
  writeFileSync(redirects, "/*    /index.html   200\n");
}

const envFile = join(root, "env.netlify.production");
const vinextCli = join(root, "node_modules", "vinext", "dist", "cli.js");
const server = spawn(
  process.execPath,
  [existsSync(envFile) ? "--env-file" : "", existsSync(envFile) ? envFile : "", vinextCli, "start", "--port", String(port)].filter(Boolean),
  {
    cwd: root,
    stdio: "ignore",
    detached: true,
  },
);
server.unref();
await new Promise((r) => setTimeout(r, 4500));

const routes = ["/", "/dashboard", "/enrollments", "/dues", "/customers", "/login", "/payment-return"];
for (const route of routes) {
  const target =
    route === "/"
      ? join(outDir, "index.html")
      : join(outDir, ...route.split("/").filter(Boolean), "index.html");
  mkdirSync(dirname(target), { recursive: true });
  spawnSync("curl", ["-fsS", `http://127.0.0.1:${port}${route}`, "-o", target], { stdio: "inherit" });
}

try {
  process.kill(server.pid, "SIGTERM");
} catch {
  /* ignore */
}

spawnSync("zip", ["-r", "-q", "netlify-deploy.zip", "."], { cwd: outDir, stdio: "inherit" });
console.log(JSON.stringify({ ok: true, publishDir: "netlify-dist", routes }));
