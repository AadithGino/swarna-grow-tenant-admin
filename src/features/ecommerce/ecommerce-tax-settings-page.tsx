"use client";

import { useGetEcommerceTaxSettingsQuery } from "@/src/store/api/admin-api";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";

export function EcommerceTaxSettingsPage() {
  const query = useGetEcommerceTaxSettingsQuery();
  if (query.isLoading) return <PageSkeleton cards={2} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;
  const data = query.data;
  return (
    <>
      <PageHeader
        eyebrow="Online store"
        title="Tax settings"
        description="Jeweller-configured rate codes (basis points). Confirm classifications with your accountant before checkout goes live."
      />
      <Surface title={`Configuration v${data?.version ?? 1}`}>
        <div className="space-y-4 p-6 text-sm">
          <p>
            Default classification:{" "}
            <strong>{data?.defaultClassification ?? "—"}</strong>
          </p>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-xs uppercase text-muted-foreground">
                <th className="py-2">Code</th>
                <th>Label</th>
                <th>Rate (bps)</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rates ?? []).map((r: { code: string; label?: string; rateBps: number; active?: boolean }) => (
                <tr key={r.code} className="border-b">
                  <td className="py-2 font-mono">{r.code}</td>
                  <td>{r.label ?? "—"}</td>
                  <td>{r.rateBps}</td>
                  <td>{r.active === false ? "No" : "Yes"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>
    </>
  );
}
