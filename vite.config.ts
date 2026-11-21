import path from "node:path";
import { fileURLToPath } from "node:url";
import vinext from "vinext";
import { defineConfig } from "vite";
import { existsSync, readFileSync } from "node:fs";
import { readExecutionProfile } from "./scripts/execution-profile.mjs";


const rootDir = path.dirname(fileURLToPath(import.meta.url));

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const hostingPath = new URL("./.openai/hosting.json", import.meta.url);
const hostingConfig: { d1?: string; r2?: string } = existsSync(hostingPath)
  ? JSON.parse(readFileSync(hostingPath, "utf8")) : {};
const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
const managedLinux = readExecutionProfile() === "managed-linux";

const localBindingConfig = {
  main: "vinext/server/fetch-handler",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

/**
 * App code gets in-page navigation: `next/navigation` (useRouter) and `next/link` resolve to
 * src/lib/spa/*, which switch routes with history.pushState instead of asking the host for
 * an RSC payload. Static hosts (S3 + CloudFront, Netlify) cannot serve those payloads, so
 * vinext fell back to a full page reload on every link. Only files in this project are
 * redirected; vinext itself and the spa shims keep the real modules. Server components
 * (rsc environment) are left alone.
 */
const SPA_NAV_SHIMS: Record<string, string> = {
  "next/navigation": path.join(rootDir, "src/lib/spa/next-navigation.ts"),
  "next/link": path.join(rootDir, "src/lib/spa/next-link.tsx"),
};
const spaNavigation = {
  name: "swarna-spa-navigation",
  enforce: "pre" as const,
  resolveId(this: { environment?: { name?: string } }, source: string, importer?: string) {
    const shim = SPA_NAV_SHIMS[source];
    if (!shim || !importer) return null;
    if (this.environment?.name === "rsc") return null;
    const from = importer.replace(/\\/g, "/").split("?")[0];
    const projectRoot = rootDir.replace(/\\/g, "/");
    if (!from.startsWith(projectRoot) || from.includes("/node_modules/") || from.includes("/src/lib/spa/")) {
      return null;
    }
    return shim;
  },
};

export default defineConfig(async () => {
  const previewPluginPath = new URL("./build/sites-vite-plugin.ts", import.meta.url);
  if (managedLinux && !existsSync(previewPluginPath)) throw new Error("Managed preview requires its checkout-local Sites plugin.");
  const previewPlugins = existsSync(previewPluginPath)
    ? [(await import(previewPluginPath.href)).sites({ mockAuth: false })] : [];
  // Vercel / Nitro path (vinext docs): use Nitro instead of Cloudflare Workers plugin.
  const deployVercel =
    process.env.VERCEL === "1"
    || process.env.NITRO_PRESET === "vercel"
    || process.env.DEPLOY_TARGET === "vercel";

  if (deployVercel) {
    process.env.NITRO_PRESET ??= "vercel";
    const { nitro } = await import("nitro/vite");
    // vinext Link soft-nav breaks under Nitro minify: dynamic
    // `const { navigateClientSide } = await import(...)` loses the export name.
    // Fall back to a full document navigation when the soft-nav entry is missing.
    const patchVinextLink = {
      name: "swarna-patch-vinext-link",
      enforce: "pre" as const,
      transform(code: string, id: string) {
        const norm = id.replace(/\\/g, "/");
        if (!norm.includes("/vinext/") || !norm.endsWith("/shims/link.js")) {
          return null;
        }
        const needle =
          "const { navigateClientSide } = loadedNavigationModule ?? await loadNavigationModule();";
        if (!code.includes(needle)) return null;
        return code.replace(
          needle,
          `const __navMod = loadedNavigationModule ?? await loadNavigationModule();
			const navigateClientSide = __navMod.navigateClientSide;
			if (typeof navigateClientSide !== "function") {
				if (replace) window.location.replace(absoluteFullHref);
				else window.location.assign(absoluteFullHref);
				return;
			}`,
        );
      },
    };
    return {
      plugins: [spaNavigation, patchVinextLink, vinext(), ...previewPlugins, nitro()],
    };
  }

  // Use Miniflare's local Request.cf placeholder unless fetching is requested.
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
  process.env.WRANGLER_SEND_METRICS ??= "false";

  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.WRANGLER_REGISTRY_PATH ??= ".wrangler/dev-registry";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      ...(managedLinux
        ? { host: "0.0.0.0", allowedHosts: ["terminal.local"] }
        : {}),
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
    },
    plugins: [
      spaNavigation,
      vinext(),
      ...previewPlugins,
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: localBindingConfig,
      }),
    ],
  };
});
