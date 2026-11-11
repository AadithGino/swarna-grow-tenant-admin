import type {
  FetchBaseQueryError,
  FetchBaseQueryMeta,
} from "@reduxjs/toolkit/query";
import type { QueryReturnValue } from "@reduxjs/toolkit/query";

/** Contract list pagination carried beside RTK's request/response meta. */
export type ContractListMeta = {
  nextCursor?: string | null;
  hasMore?: boolean;
  limit?: number;
  total?: number;
};

export type AgentFetchMeta = FetchBaseQueryMeta & {
  contractMeta?: ContractListMeta;
};

export function coerceFetchBaseQueryMeta(
  meta: unknown,
): AgentFetchMeta | undefined {
  if (!meta || typeof meta !== "object") return undefined;
  const row = meta as Record<string, unknown>;
  if ("request" in row && row.request) {
    return meta as AgentFetchMeta;
  }
  if ("contractMeta" in row || "nextCursor" in row || "hasMore" in row) {
    const contractMeta = (row.contractMeta as ContractListMeta | undefined) ?? {
      nextCursor: (row.nextCursor as string | null | undefined) ?? null,
      hasMore: Boolean(row.hasMore),
      limit: row.limit != null ? Number(row.limit) : undefined,
      total: row.total != null ? Number(row.total) : undefined,
    };
    return {
      request: new Request("https://swarnagrow.local/contract-meta"),
      contractMeta,
    };
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
