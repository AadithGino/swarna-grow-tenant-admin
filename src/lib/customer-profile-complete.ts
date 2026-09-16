import type { CustomerProfile } from "@/src/types/customer";

/** Matches backend `isCustomerProfileComplete` — onboarding only for placeholder / new signups. */
export function customerNeedsOnboarding(profile: CustomerProfile | undefined): boolean {
  if (!profile) return false;
  if (profile.profileComplete) return false;
  const name = profile.name?.trim() ?? "";
  if (name.length >= 2 && name !== "Customer") return false;
  return true;
}
