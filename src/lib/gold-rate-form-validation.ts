const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const GOLD_RATE_SOURCE_MAX = 120;

export function validateGoldRatePerGram(rate: number): string | undefined {
  if (!Number.isFinite(rate) || rate <= 0) {
    return "Rate per gram must be greater than zero.";
  }
  return undefined;
}

export function liveGoldRatePerGramError(rate: number): string | undefined {
  if (!rate) return undefined;
  return validateGoldRatePerGram(rate);
}

export function validateGoldEffectiveDate(date: string): string | undefined {
  const trimmed = date.trim();
  if (!ISO_DATE.test(trimmed)) {
    return "Use date format YYYY-MM-DD.";
  }
  const [y, m, d] = trimmed.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return "Enter a valid calendar date.";
  }
  return undefined;
}

export function validateGoldRateSource(source: string): string | undefined {
  if (source.length > GOLD_RATE_SOURCE_MAX) {
    return `Source must be ${GOLD_RATE_SOURCE_MAX} characters or fewer.`;
  }
  return undefined;
}

export function goldRateFormReady(rate: number, effectiveDate: string): boolean {
  return (
    validateGoldRatePerGram(rate) === undefined &&
    validateGoldEffectiveDate(effectiveDate) === undefined
  );
}
