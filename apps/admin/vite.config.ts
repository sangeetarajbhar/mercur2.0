import { fileURLToPath } from "node:url";
import medusaVitePlugin from "@medusajs/admin-vite-plugin";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mercurDashboardPlugin } from "@mercurjs/dashboard-sdk";

/**
 * `@mercurjs/dashboard-sdk` merges `optimizeDeps.include: ["@medusajs/dashboard", "@medusajs/js-sdk", ...]`.
 * Those entries are **always** pre-bundled (`addManuallyIncludedOptimizeDeps`), and esbuild cannot resolve
 * `virtual:medusa/*` — only the full Vite pipeline + `@medusajs/admin-vite-plugin` can.
 * `optimizeDeps.exclude` does not override a forced `include` after array concatenation, so we strip them here.
 */
function stripMedusaPackagesFromOptimizeInclude(): import("vite").Plugin {
  const strip = new Set(["@medusajs/dashboard", "@medusajs/js-sdk"]);
  return {
    name: "strip-medusa-dashboard-from-optimize-include",
    enforce: "post",
    configResolved(resolved) {
      const inc = resolved.optimizeDeps?.include;
      if (!inc?.length) return;
      const next = inc.filter((id) => !strip.has(id));
      if (next.length !== inc.length) {
        resolved.optimizeDeps.include = next;
      }
    },
  };
}

/**
 * Mercur’s admin bundle lazy-loads hashed chunks like `./location-edit-XXXX.js`.
 * Aliasing those to local shims (resolveId + absolute path) avoids Windows issues
 * with regex `alias` and ensures `/settings/locations/.../edit` uses our wizard.
 */
function mercurLocationRouteShims(): import("vite").Plugin {
  const editShim = fileURLToPath(
    new URL("./src/shims/override-location-edit.tsx", import.meta.url)
  );
  const createShim = fileURLToPath(
    new URL("./src/shims/override-location-create.tsx", import.meta.url)
  );

  return {
    name: "mercur-location-route-shims",
    enforce: "pre",
    resolveId(source) {
      // Source can be relative or full path and may include query params in dev.
      const normalized = source.replace(/\\/g, "/").split("?")[0];
      if (/(^|\/)location-edit-[\w-]+\.js$/.test(normalized)) {
        return editShim;
      }
      if (/(^|\/)location-create-[\w-]+\.js$/.test(normalized)) {
        return createShim;
      }
      return undefined;
    },
  };
}

/**
 * Hard-rewrite Mercur's location lazy chunks inside `@mercurjs/admin/dist/index.js`.
 * This guarantees edit/create route overrides even when path-based resolveId checks
 * are bypassed by dependency optimization or platform-specific path formatting.
 */
function rewriteMercurLocationLazyImports(): import("vite").Plugin {
  const editShim = fileURLToPath(
    new URL("./src/shims/override-location-edit.tsx", import.meta.url)
  ).replace(/\\/g, "/");
  const createShim = fileURLToPath(
    new URL("./src/shims/override-location-create.tsx", import.meta.url)
  ).replace(/\\/g, "/");

  return {
    name: "rewrite-mercur-location-lazy-imports",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, "/");
      if (!normalizedId.includes("@mercurjs/admin/dist/index.js")) {
        return null;
      }

      let next = code.replace(
        /\.\/location-edit-[\w-]+\.js/g,
        editShim
      );
      next = next.replace(
        /\.\/location-create-[\w-]+\.js/g,
        createShim
      );

      if (next === code) {
        return null;
      }
      return { code: next, map: null };
    },
  };
}

/** Same rules as `packages/api` `rewriteProductFieldsSellerToSellers` — dashboard still sends `seller.*` on product `fields`. */
function rewriteProductFieldsSellerToSellersForProxy(fields: string): string {
  let s = fields;
  s = s.replace(/\*seller\b/g, "*sellers");
  s = s.replace(/\bseller\./g, "sellers.");
  s = s.replace(/(^|,)seller(?=\*|,|$)/g, "$1sellers");
  return s;
}

export default defineConfig({
  plugins: [
    react(),
    /**
     * Resolves `virtual:medusa/*` imports from `@medusajs/dashboard` (routes, widgets,
     * i18n, etc.). `@mercurjs/dashboard-sdk` only provides `virtual:mercur/*` — both are required.
     */
    medusaVitePlugin(),
    rewriteMercurLocationLazyImports(),
    mercurLocationRouteShims(),
    mercurDashboardPlugin({
      medusaConfigPath: "../../packages/api/medusa-config.ts",
    }),
    stripMedusaPackagesFromOptimizeInclude(),
  ],
  optimizeDeps: {
    exclude: ["@medusajs/dashboard", "@medusajs/js-sdk"],
  },
  server: {
    proxy: {
      "/admin": {
        target: "http://localhost:9000", // your medusa backend port
        changeOrigin: true,
        configure(proxy) {
          proxy.on("proxyReq", (proxyReq, req) => {
            if (req.method !== "GET") return;
            const url = req.url;
            if (!url?.includes("fields=") || !url.includes("/products")) return;
            try {
              const parsed = new URL(url, "http://127.0.0.1");
              const fields = parsed.searchParams.get("fields");
              if (
                !fields ||
                (!fields.includes("seller.") && !fields.includes("*seller"))
              ) {
                return;
              }
              parsed.searchParams.set(
                "fields",
                rewriteProductFieldsSellerToSellersForProxy(fields)
              );
              proxyReq.path = parsed.pathname + parsed.search;
            } catch {
              /* ignore */
            }
          });
        },
      },
    },
  },
});
