/**
 * API mode: defaults to the live backend (`NEXT_PUBLIC_USE_MOCKS=false`).
 * Set `NEXT_PUBLIC_USE_MOCKS=true` for offline demo without swarnagrow-backend.
 */
function readUseMocks(): boolean {
  const raw = process.env.NEXT_PUBLIC_USE_MOCKS?.trim().toLowerCase();
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return false;
}

export const env = {
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1",
  useMocks: readUseMocks(),
  mockDelayMs: Number(process.env.NEXT_PUBLIC_MOCK_DELAY_MS ?? 420),
};
