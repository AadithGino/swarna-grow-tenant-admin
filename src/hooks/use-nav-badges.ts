import { useActingBranchId } from "@/src/hooks/use-acting-branch-id";
import { useGetNavBadgesQuery } from "@/src/store/api/admin-api";

export type NavBadgeKey =
  | "dues"
  | "cashHandovers"
  | "openRedemptions"
  | "failedMessages"
  | "paymentsNeedingAttention";

export function useNavBadges(): Partial<Record<NavBadgeKey, number>> {
  const branchId = useActingBranchId();
  const { data } = useGetNavBadgesQuery(branchId ? { branchId } : {}, {
    pollingInterval: 60_000,
  });
  if (!data) return {};
  return {
    dues: Number(data.dues ?? 0) || undefined,
    cashHandovers: Number(data.cashHandovers ?? 0) || undefined,
    openRedemptions: Number(data.openRedemptions ?? 0) || undefined,
    failedMessages: Number(data.failedMessages ?? 0) || undefined,
    paymentsNeedingAttention: Number(data.paymentsNeedingAttention ?? 0) || undefined,
  };
}
