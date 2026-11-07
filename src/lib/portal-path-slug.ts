/** Map browser path to `PortalRouter` slug segments (Netlify / static hosting). */
export function pathnameToPortalSlug(pathname: string): string[] {
  const path = pathname.split("?")[0]?.replace(/\/+$/, "") || "/";
  if (path === "/") return [];
  return path.split("/").filter(Boolean);
}
