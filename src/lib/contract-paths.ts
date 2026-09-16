/** Map contract `actionPath` values to this portal's routes. */
export function portalPathFromContract(actionPath: string): string {
  const [path, query] = actionPath.split("?");
  const mapped: Record<string, string> = {
    "/payments": "/collections",
    "/overdues": "/dues",
    "/dues": "/dues",
    "/maturities": "/maturity",
    "/cash-handovers": "/cash-control",
    "/settings/gold-rate": "/gold-rates",
    "/settings/subscription": "/settings",
    "/redemptions": "/maturity",
    "/schemes": "/schemes",
    "/customers": "/customers",
    "/reports/gold-accrual": "/reports",
  };
  const base = mapped[path] ?? path;
  return query ? `${base}?${query}` : base;
}
