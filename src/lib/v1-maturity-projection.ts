export type MaturityProjection = {
  schemeId: string;
  maturityDate: string;
  projectedPrincipalPaise: number;
  projectedBenefitPaise: number;
  projectedAmountPaise: number;
  projectedWeightMg: number;
};

export function adaptMaturityProjection(raw: unknown): MaturityProjection | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const schemeId = String(row.schemeId ?? "");
  if (!schemeId) return null;
  return {
    schemeId,
    maturityDate: String(row.maturityDate ?? ""),
    projectedPrincipalPaise: Number(row.projectedPrincipalPaise ?? 0),
    projectedBenefitPaise: Number(row.projectedBenefitPaise ?? 0),
    projectedAmountPaise: Number(row.projectedAmountPaise ?? 0),
    projectedWeightMg: Number(row.projectedWeightMg ?? 0),
  };
}
