import { useAppSelector } from "@/src/store/hooks";

/** Global top-bar branch filter → API `branchId` (undefined = all branches). */
export function useActingBranchId(): string | undefined {
  const globalBranch = useAppSelector((s) => s.ui.branchId);
  return globalBranch && globalBranch !== "ALL" ? globalBranch : undefined;
}

/** Stable key for pagination reset when the acting branch changes. */
export function useActingBranchKey(): string {
  return useAppSelector((s) => s.ui.branchId) ?? "ALL";
}
