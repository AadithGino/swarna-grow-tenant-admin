/** Extract upload id from API viewUrl (`/uploads/upl_…`) or pass through raw ids. */
export function uploadIdFromCatalogRef(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.includes("/")) return trimmed;
  const match = trimmed.match(/\/uploads\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
