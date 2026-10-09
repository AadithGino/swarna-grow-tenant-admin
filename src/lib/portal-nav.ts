import { isKnownPortalSection } from "@/src/lib/portal-routes";

const CURRENT_KEY = "sg.portal.currentPath";
const PREVIOUS_KEY = "sg.portal.previousPath";

function customerPortalMatch(pathname: string): RegExpMatchArray | null {
  return pathname.match(/^\/customer\/([^/]+)(?:\/|$)/);
}

function agentPortalMatch(pathname: string): boolean {
  return pathname === "/agent" || pathname.startsWith("/agent/");
}

function tenantAdminPortalMatch(pathname: string): boolean {
  const section = pathname.split("/").filter(Boolean)[0] ?? "";
  if (!section) return pathname === "/" || pathname === "";
  return isKnownPortalSection(section);
}

/** Whether a path belongs to any SwarnaGrow portal surface. */
export function isPortalInternalPath(pathname: string): boolean {
  return (
    tenantAdminPortalMatch(pathname) ||
    Boolean(customerPortalMatch(pathname)) ||
    agentPortalMatch(pathname)
  );
}

/** Same portal realm and tenant (customer slug) when applicable. */
export function samePortalRealm(currentPath: string, previousPath: string): boolean {
  const customer = customerPortalMatch(currentPath);
  if (customer) {
    const prev = customerPortalMatch(previousPath);
    return Boolean(prev && prev[1] === customer[1]);
  }
  if (agentPortalMatch(currentPath)) return agentPortalMatch(previousPath);
  return tenantAdminPortalMatch(currentPath) && tenantAdminPortalMatch(previousPath);
}

/** Track in-app navigations so back can avoid leaving the portal on direct/external entry. */
export function recordPortalNavigation(pathname: string) {
  if (typeof window === "undefined") return;
  const prev = sessionStorage.getItem(CURRENT_KEY);
  if (prev && prev !== pathname) {
    sessionStorage.setItem(PREVIOUS_KEY, prev);
  }
  sessionStorage.setItem(CURRENT_KEY, pathname);
}

export function readPreviousPortalPath(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(PREVIOUS_KEY);
}
