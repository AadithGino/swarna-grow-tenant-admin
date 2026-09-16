/** Split a search string into tokens (words). */
export function fuzzySearchTokens(q: string): string[] {
  return String(q ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build a subsequence regex for one token (characters in order, gaps allowed). */
export function fuzzyTokenRegex(token: string): RegExp | null {
  const raw = String(token ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replace(/[\s_-]+/g, "");
  if (!normalized) return null;
  const chars = [...normalized].map(escapeRegex);
  if (!chars.length) return null;
  if (chars.length === 1) return new RegExp(chars[0], "i");
  return new RegExp(chars.join(".*?"), "i");
}

/** True if `haystack` fuzzy-matches full query (all tokens). */
export function fuzzyMatch(haystack: unknown, query: string): boolean {
  const text = String(haystack ?? "");
  if (!text) return false;
  const tokens = fuzzySearchTokens(query);
  if (!tokens.length) return false;
  return tokens.every((token) => {
    const re = fuzzyTokenRegex(token);
    return re ? re.test(text) : false;
  });
}

/** Match query against any of several fields (OR across fields, AND across tokens). */
export function fuzzyMatchAny(values: unknown[], query: string): boolean {
  const tokens = fuzzySearchTokens(query);
  if (!tokens.length) return false;
  return tokens.every((token) => {
    const re = fuzzyTokenRegex(token);
    if (!re) return false;
    return values.some((v) => re.test(String(v ?? "")));
  });
}
