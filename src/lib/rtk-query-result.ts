import type {
  FetchBaseQueryError,
  FetchBaseQueryMeta,
} from "@reduxjs/toolkit/query";
import type { QueryReturnValue } from "@reduxjs/toolkit/query";

export function coerceFetchBaseQueryMeta(
  meta: unknown,
): FetchBaseQueryMeta | undefined {
  if (
    meta
    && typeof meta === "object"
    && "request" in meta
    && (meta as FetchBaseQueryMeta).request
  ) {
    return meta as FetchBaseQueryMeta;
  }
  return undefined;
}

export function rtkDataResult<T>(
  data: T,
  meta?: unknown,
): QueryReturnValue<T, FetchBaseQueryError, FetchBaseQueryMeta> {
  return { data, meta: coerceFetchBaseQueryMeta(meta) };
}

export function rtkErrorResult(
  error: FetchBaseQueryError,
  meta?: unknown,
): QueryReturnValue<never, FetchBaseQueryError, FetchBaseQueryMeta> {
  return { error, meta: coerceFetchBaseQueryMeta(meta) };
}
