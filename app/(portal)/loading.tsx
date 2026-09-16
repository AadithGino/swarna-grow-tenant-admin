import { PageSkeleton } from "@/src/components/common/query-state";

/** Main content only — shell stays mounted in (portal)/layout. */
export default function PortalLoading() {
  return <PageSkeleton cards={4} />;
}
