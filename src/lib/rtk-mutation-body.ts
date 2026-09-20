import type { FetchArgs } from "@reduxjs/toolkit/query";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Express + Zod `validate({ body: z.object(...) })` treat a missing JSON body as
 * `undefined`, which fails with "expected object, received undefined".
 * RTK Query omits `body` when unset, so default to `{}` for mutation requests.
 */
export function ensureMutationJsonBody<T extends string | FetchArgs>(args: T): T {
  if (typeof args === "string") return args;
  const method = String(args.method ?? "GET").toUpperCase();
  if (!MUTATION_METHODS.has(method) || args.body !== undefined) return args;
  return { ...args, body: {} };
}
