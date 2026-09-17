import { env } from "@/src/config/env";
import { refreshTenantAccessToken } from "@/src/lib/auth-refresh-fetch";

function resolveApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = env.apiBaseUrl.replace(/\/$/, "");
  const suffix = path.replace(/^\//, "");
  return `${base}/${suffix}`;
}

/**
 * Fetches a binary response (PDF/image) with the stored Bearer token.
 * Does not unwrap the JSON contract envelope.
 */
function tenantAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("swarnagrow.accessToken")
      : null;
  const actingBranch =
    typeof window !== "undefined"
      ? localStorage.getItem("swarnagrow.actingBranch")
      : null;
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(actingBranch ? { "X-Acting-Branch-Id": actingBranch } : {}),
  };
}

async function fetchWithTenantAuthRetry(
  path: string,
  accept: string,
): Promise<Response> {
  let response = await fetch(resolveApiUrl(path), {
    headers: { ...tenantAuthHeaders(), Accept: accept },
  });
  if (response.status === 401 && (await refreshTenantAccessToken())) {
    response = await fetch(resolveApiUrl(path), {
      headers: { ...tenantAuthHeaders(), Accept: accept },
    });
  }
  return response;
}

export async function fetchAuthorizedBlob(path: string): Promise<Blob> {
  const response = await fetchWithTenantAuthRetry(
    path,
    "application/pdf,image/*,*/*",
  );
  if (!response.ok) {
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = await response.text().catch(() => null);
    }
    throw { status: response.status, data };
  }
  return response.blob();
}

export async function fetchAuthorizedMaybeBlob(path: string): Promise<
  | { kind: "blob"; blob: Blob; contentType: string }
  | { kind: "json"; payload: unknown; meta?: unknown }
> {
  const response = await fetchWithTenantAuthRetry(
    path,
    "application/pdf,application/json,image/*,*/*",
  );
  if (!response.ok) {
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = await response.text().catch(() => null);
    }
    throw { status: response.status, data };
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (
    contentType.includes("application/pdf") ||
    contentType.includes("image/") ||
    contentType.includes("octet-stream")
  ) {
    return {
      kind: "blob",
      blob: await response.blob(),
      contentType,
    };
  }
  const envelope = (await response.json()) as {
    success?: boolean;
    data?: unknown;
    meta?: unknown;
  };
  if (envelope && typeof envelope === "object" && "success" in envelope) {
    if (envelope.success === false) {
      throw {
        status: "CUSTOM_ERROR" as const,
        data: (envelope as { error?: unknown }).error ?? envelope,
      };
    }
    return { kind: "json", payload: envelope.data, meta: envelope.meta };
  }
  return { kind: "json", payload: envelope };
}
