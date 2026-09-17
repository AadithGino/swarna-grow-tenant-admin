/** Parse access (and optional refresh) from API refresh responses or contract envelopes. */
export function parseRefreshTokens(
  data: unknown,
): { accessToken: string; refreshToken?: string } | null {
  if (!data || typeof data !== "object") return null;
  const envelope = data as {
    success?: boolean;
    data?: { accessToken?: string; refreshToken?: string };
    accessToken?: string;
    refreshToken?: string;
    payload?: { accessToken?: string; refreshToken?: string };
    __contract?: boolean;
  };
  if (envelope.__contract && envelope.payload?.accessToken) {
    return {
      accessToken: envelope.payload.accessToken,
      refreshToken: envelope.payload.refreshToken,
    };
  }
  if (envelope.success && envelope.data?.accessToken) {
    return {
      accessToken: envelope.data.accessToken,
      refreshToken: envelope.data.refreshToken,
    };
  }
  if (typeof envelope.accessToken === "string") {
    return {
      accessToken: envelope.accessToken,
      refreshToken: envelope.refreshToken,
    };
  }
  return null;
}
