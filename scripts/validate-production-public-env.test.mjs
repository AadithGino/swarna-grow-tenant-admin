/**
 * AUD-11: Build gate script matches module rules (spawn real subprocess with NODE_ENV=production).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const script = fileURLToPath(new URL("./validate-production-public-env.mjs", import.meta.url));

function run(env) {
  return spawnSync(process.execPath, [script], {
    env: { ...process.env, ...env, NODE_ENV: "production" },
    encoding: "utf8",
  });
}

test("validate-production-public-env passes with live https /api/v1", () => {
  const r = run({
    NEXT_PUBLIC_USE_MOCKS: "false",
    NEXT_PUBLIC_API_BASE_URL: "https://api.example.com/api/v1",
  });
  assert.equal(r.status, 0, r.stderr + r.stdout);
});

test("validate-production-public-env fails on mocks", () => {
  const r = run({
    NEXT_PUBLIC_USE_MOCKS: "true",
    NEXT_PUBLIC_API_BASE_URL: "https://api.example.com/api/v1",
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr + r.stdout, /USE_MOCKS/);
});

test("validate-production-public-env fails on missing https", () => {
  const r = run({
    NEXT_PUBLIC_USE_MOCKS: "false",
    NEXT_PUBLIC_API_BASE_URL: "http://api.example.com/api/v1",
  });
  assert.equal(r.status, 1);
});
