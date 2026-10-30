export type DigitalMetalAssetKey = `${"GOLD" | "SILVER"}:${number}`;

export function assetKey(metal: string, finenessPpm: number): DigitalMetalAssetKey {
  return `${metal}:${finenessPpm}` as DigitalMetalAssetKey;
}

export function parseAssetKey(key: string): { metal: "GOLD" | "SILVER"; finenessPpm: number } | null {
  const [metal, fineness] = key.split(":");
  if (metal !== "GOLD" && metal !== "SILVER") return null;
  const finenessPpm = Number(fineness);
  if (!Number.isFinite(finenessPpm)) return null;
  return { metal, finenessPpm };
}

export function formatAssetLabel(metal: string, finenessPpm: number): string {
  // 999000 → "999", 999900 → "999.9" (millesimal fineness, as printed on bars and coins).
  const purity = finenessPpm >= 1000 ? `${Number((finenessPpm / 1000).toFixed(1))}` : `${finenessPpm} ppm`;
  const name = metal === "SILVER" ? "Silver" : "Gold";
  return `${name} ${purity}`;
}

export function gramsToUg(grams: string | number): number {
  return Math.round(Number(grams) * 1_000_000);
}

export function ugToGramsDisplay(ug: string | number): string {
  return (Number(ug) / 1_000_000).toFixed(4);
}

export type CapabilityAsset = {
  metal?: string;
  finenessPpm?: number;
  quoteReady?: boolean;
  issues?: { code: string; message: string }[];
};

export function tradableAssetsFromCapability(assets: CapabilityAsset[] | undefined): CapabilityAsset[] {
  return (assets ?? []).filter((a) => a.metal && a.finenessPpm != null);
}

export function quoteReadyAssets(assets: CapabilityAsset[] | undefined): CapabilityAsset[] {
  return tradableAssetsFromCapability(assets).filter((a) => a.quoteReady === true);
}
