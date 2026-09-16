import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

export type ContractErrorBody = {
  code?: string;
  message: string;
  details?: unknown;
  traceId?: string;
};

/** Parse fetch bodies: JSON contract envelope, or plain-text / HTML error pages. */
export async function readContractResponseBody(
  response: Response,
): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    const trimmed = text.trim();
    const message =
      trimmed.length > 320 ? `${trimmed.slice(0, 317)}…` : trimmed;
    return {
      success: false,
      error: contractErrorFromHttpStatus(response.status, message),
    };
  }
}

export function contractErrorFromHttpStatus(
  status: number,
  message: string,
): ContractErrorBody {
  if (status === 429) {
    return {
      code: "RATE_LIMITED",
      message: message.includes("Too many")
        ? message
        : "Too many requests. Please wait a few minutes and try again.",
    };
  }
  if (status === 401) {
    return { code: "UNAUTHORIZED", message: message || "Sign in required." };
  }
  if (status === 403) {
    return { code: "FORBIDDEN", message: message || "You do not have access." };
  }
  if (status === 404) {
    return { code: "NOT_FOUND", message: message || "Not found." };
  }
  if (status >= 500) {
    return {
      code: "SERVER_ERROR",
      message: message || "Server error. Try again shortly.",
    };
  }
  return {
    code: `HTTP_${status}`,
    message: message || "Request failed.",
  };
}

function envelopeFailure(data: unknown): ContractErrorBody | undefined {
  if (!data || typeof data !== "object" || !("success" in data)) return undefined;
  const envelope = data as {
    success?: boolean;
    error?: ContractErrorBody & { fields?: unknown };
  };
  if (envelope.success !== false || !envelope.error) return undefined;
  const err = envelope.error;
  const details = err.details ?? err.fields;
  return {
    code: err.code,
    message: err.message?.trim() || "Request failed.",
    details,
    traceId: err.traceId,
  };
}

function flatErrorObject(data: unknown): ContractErrorBody | undefined {
  if (!data || typeof data !== "object") return undefined;
  const row = data as Record<string, unknown>;
  if (typeof row.message !== "string" || !row.message.trim()) return undefined;
  if (row.code != null && typeof row.code !== "string") return undefined;
  const details = row.details ?? row.fields;
  return {
    code: typeof row.code === "string" ? row.code : undefined,
    message: row.message.trim(),
    details,
    traceId: typeof row.traceId === "string" ? row.traceId : undefined,
  };
}

/** Turn any RTK `FetchBaseQueryError` into a stable CUSTOM_ERROR the UI can parse. */
export function normalizeFetchBaseQueryError(
  error: FetchBaseQueryError,
): FetchBaseQueryError {
  const status = error.status;

  if (status === "PARSING_ERROR") {
    const raw =
      typeof error.data === "string" && error.data.trim()
        ? error.data.trim()
        : typeof error.error === "string"
          ? error.error
          : "Request failed.";
    const httpStatus =
      typeof error.originalStatus === "number" ? error.originalStatus : 0;
    const body = contractErrorFromHttpStatus(httpStatus, raw);
    return buildCustomError(body, httpStatus || "PARSING_ERROR");
  }

  if (status === "FETCH_ERROR" || status === "TIMEOUT_ERROR") {
    const message =
      typeof error.error === "string" && error.error.trim()
        ? error.error.trim()
        : status === "TIMEOUT_ERROR"
          ? "Request timed out. Check your connection and try again."
          : "Network error. Check your connection and try again.";
    return buildCustomError({ code: status, message }, status);
  }

  const fromEnvelope = envelopeFailure(error.data);
  if (fromEnvelope) return buildCustomError(fromEnvelope, status);

  const flat = flatErrorObject(error.data);
  if (flat) return buildCustomError(flat, status);

  if (typeof error.data === "string" && error.data.trim()) {
    const httpStatus = typeof status === "number" ? status : 0;
    return buildCustomError(
      contractErrorFromHttpStatus(httpStatus, error.data.trim()),
      status,
    );
  }

  if (typeof error.error === "string" && error.error.trim()) {
    const looksLikeParse =
      error.error.includes("SyntaxError") ||
      error.error.includes("is not valid JSON");
    if (looksLikeParse && typeof error.data === "string" && error.data.trim()) {
      const httpStatus = typeof status === "number" ? status : 0;
      return buildCustomError(
        contractErrorFromHttpStatus(httpStatus, error.data.trim()),
        status,
      );
    }
    return buildCustomError(
      { code: typeof status === "number" ? `HTTP_${status}` : "REQUEST_FAILED", message: error.error.trim() },
      status,
    );
  }

  return buildCustomError(
    {
      code: typeof status === "number" ? `HTTP_${status}` : "REQUEST_FAILED",
      message: "Request failed.",
    },
    status,
  );
}

function buildCustomError(
  body: ContractErrorBody,
  originalStatus: number | string,
): FetchBaseQueryError {
  return {
    status: "CUSTOM_ERROR",
    error: body.message,
    data: {
      success: false,
      error: body,
      code: body.code,
      message: body.message,
      details: body.details,
      traceId: body.traceId,
      httpStatus: originalStatus,
    },
  };
}
