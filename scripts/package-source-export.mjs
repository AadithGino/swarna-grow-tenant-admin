#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const ROOT_ALLOW_FILES = new Set([
  "package.json",
  "package-lock.json",
  "next-env.d.ts",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "eslint.config.js",
  "eslint.config.mjs",
  ".gitignore",
  ".npmrc",
  ".env.example",
  "README.md",
  "tsconfig.json",
  "postcss.config.mjs",
  "next.config.ts",
  "vitest.config.ts",
  "vitest.setup.ts",
  "vite.config.ts",
  "vercel.json",
  ".vercelignore",
  "components.json",
]);

const ROOT_ALLOW_PREFIXES = [
  "src/",
  "scripts/",
  "docs/",
  "components/",
  "app/",
  "public/",
  "lib/",
  "hooks/",
  "vendor/",
  "build/",
  "swarna-grow-api-contract-v1.2/",
];

function gitLines(args) {
  try {
    return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" })
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function allowedRelative(rel) {
  const n = rel.replace(/\\/g, "/");
  if (ROOT_ALLOW_FILES.has(n)) return true;
  return ROOT_ALLOW_PREFIXES.some((p) => n.startsWith(p));
}

function collectFiles() {
  const gitRoot = gitLines(["rev-parse", "--show-toplevel"])[0];
  if (gitRoot && path.resolve(gitRoot) === repoRoot) {
    const files = new Set([...gitLines(["ls-files"]), ...gitLines(["ls-files", "-o", "--exclude-standard"])]);
    return [...files].filter(rel => allowedRelative(rel) && fs.existsSync(path.join(repoRoot, rel)) && fs.statSync(path.join(repoRoot, rel)).isFile()).sort();
  }
  // Extracted source has no Git metadata. Walk only exportable source paths.
  const files = [];
  const walk = rel => {
    for (const entry of fs.readdirSync(path.join(repoRoot, rel), { withFileTypes: true })) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (["node_modules", ".git", "dist", ".next", ".wrangler", ".sites-runtime", "coverage", "test-results"].includes(entry.name) || entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!rel && !ROOT_ALLOW_PREFIXES.some(prefix => prefix.startsWith(`${child}/`))) continue;
        walk(child);
      } else if (entry.isFile() && allowedRelative(child)) files.push(child);
    }
  };
  walk("");
  return files.sort();
}

const outArg = process.argv.find((a) => a.startsWith("--out="));
const defaultName = `swarnagrow-tenant-admin-source-${new Date().toISOString().slice(0, 10)}.zip`;
const outZip = outArg
  ? path.resolve(outArg.slice("--out=".length))
  : path.join(repoRoot, "..", defaultName);

const files = collectFiles();
if (!files.length) {
  console.error("No files matched export allowlist.");
  process.exit(1);
}

if (fs.existsSync(outZip)) fs.unlinkSync(outZip);

const listFile = path.join(repoRoot, ".export-filelist.txt");
fs.writeFileSync(listFile, `${files.join("\n")}\n`);
try {
  execFileSync("zip", ["-q", "-X", outZip, "-@"], {
    cwd: repoRoot,
    input: fs.readFileSync(listFile),
    stdio: ["pipe", "inherit", "inherit"],
  });
} finally {
  fs.unlinkSync(listFile);
}

console.log(`Wrote ${outZip} (${files.length} files)`);
execFileSync(process.execPath, [path.join(__dirname, "verify-source-export-manifest.mjs"), outZip], {
  stdio: "inherit",
});
