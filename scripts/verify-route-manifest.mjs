#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

const ROOT = resolve(".");
const DEFAULT_EXPECTED = join(ROOT, "config/active-route-manifest.json");
const DEFAULT_BUILD = join(ROOT, ".next/app-path-routes-manifest.json");
const EVIDENCE = join(ROOT, ".amm-run/infra-02");

function sorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function same(left, right) {
  return JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
}

async function routeFiles(root) {
  const found = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/^(page|route)\.(?:js|jsx|ts|tsx)$/.test(entry.name)) found.push(path);
    }
  }
  await walk(root);
  return found.sort();
}

export function routePathForFile(file, routerRoot) {
  const relativePath = relative(routerRoot, file).split(sep);
  relativePath.pop();
  const segments = relativePath.filter(
    (segment) => !(segment.startsWith("(") && segment.endsWith(")")),
  );
  return `/${segments.join("/")}`.replace(/\/$/, "") || "/";
}

export async function inventoryRouter(routerRoot) {
  return Promise.all(
    (await routeFiles(routerRoot)).map(async (file) => ({
      path: routePathForFile(file, routerRoot),
      file: relative(ROOT, file).split(sep).join("/"),
    })),
  );
}

export function configuredRouteReferences(vercel) {
  const cron = Array.isArray(vercel.crons)
    ? vercel.crons.map((entry) => ({ kind: "cron", path: entry.path }))
    : [];
  const rewrites = Array.isArray(vercel.rewrites)
    ? vercel.rewrites.map((entry) => ({ kind: "rewrite-destination", path: entry.destination }))
    : [];
  const redirects = Array.isArray(vercel.redirects)
    ? vercel.redirects.map((entry) => ({ kind: "redirect-destination", path: entry.destination }))
    : [];
  return [...cron, ...rewrites, ...redirects].filter(
    (entry) => typeof entry.path === "string" && entry.path.startsWith("/"),
  );
}

export function evaluateRouteManifest({ expected, activeRoutes, rootInventory, srcInventory, vercel }) {
  const active = sorted(activeRoutes.filter((route) => route !== "/_not-found"));
  const rootRoutes = sorted(rootInventory.map((entry) => entry.path));
  const srcRoutes = sorted(srcInventory.map((entry) => entry.path));
  const rootSet = new Set(rootRoutes);
  const activeSet = new Set(active);
  const duplicates = sorted(srcRoutes.filter((route) => rootSet.has(route)));
  const srcOnlyRoutes = srcRoutes.filter((route) => !rootSet.has(route));
  const srcOnlyInBuild = srcOnlyRoutes.filter((route) => activeSet.has(route));
  const references = configuredRouteReferences(vercel);
  const missingConfiguredRoutes = references.filter((entry) => !activeSet.has(entry.path));
  const requiredRoutes = Object.values(expected.required).flat();
  const missingRequiredRoutes = sorted(requiredRoutes.filter((route) => !activeSet.has(route)));
  const errors = [];
  if (!same(active, expected.expectedRoutes)) errors.push("active_route_manifest_drift");
  if (srcOnlyInBuild.length) errors.push("ignored_src_routes_present_in_build");
  if (!same(duplicates, expected.acknowledgedRootSrcDuplicates)) {
    errors.push("root_src_duplicate_manifest_drift");
  }
  if (missingConfiguredRoutes.length) errors.push("configured_route_target_missing");
  if (missingRequiredRoutes.length) errors.push("required_route_missing");
  return {
    ok: errors.length === 0,
    errors,
    activeRoutes: active,
    rootRoutes,
    srcRoutes,
    srcOnlyRoutes,
    srcOnlyInBuild,
    duplicates,
    configuredRouteReferences: references,
    missingConfiguredRoutes,
    missingRequiredRoutes,
  };
}

export async function verifyRouteManifest({
  expectedPath = DEFAULT_EXPECTED,
  buildPath = DEFAULT_BUILD,
  evidenceDirectory = EVIDENCE,
} = {}) {
  const [expected, build, vercel, rootInventory, srcInventory] = await Promise.all([
    readFile(expectedPath, "utf8").then(JSON.parse),
    readFile(buildPath, "utf8").then(JSON.parse),
    readFile(join(ROOT, "vercel.json"), "utf8").then(JSON.parse),
    inventoryRouter(join(ROOT, "app")),
    inventoryRouter(join(ROOT, "src/app")),
  ]);
  const result = evaluateRouteManifest({
    expected,
    activeRoutes: Object.values(build),
    rootInventory,
    srcInventory,
    vercel,
  });
  await mkdir(evidenceDirectory, { recursive: true });
  await Promise.all([
    writeFile(
      join(evidenceDirectory, "route-manifest.json"),
      `${JSON.stringify({
        schemaVersion: 1,
        canonicalRouter: expected.canonicalRouter,
        ignoredRouter: expected.ignoredRouter,
        ...result,
      }, null, 2)}\n`,
    ),
    writeFile(
      join(evidenceDirectory, "duplicate-route-report.json"),
      `${JSON.stringify({
        schemaVersion: 1,
        ok: same(result.duplicates, expected.acknowledgedRootSrcDuplicates),
        duplicatePaths: result.duplicates,
        acknowledgedPaths: expected.acknowledgedRootSrcDuplicates,
        rootInventory,
        srcInventory,
      }, null, 2)}\n`,
    ),
  ]);
  return result;
}

async function main() {
  if (process.argv.includes("--build")) {
    const build = spawnSync("pnpm", ["run", "build"], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    if (build.status !== 0) process.exit(build.status || 1);
  }
  if (!existsSync(DEFAULT_BUILD)) {
    console.error("route-manifest: missing .next build output; run with --build");
    process.exit(1);
  }
  const result = await verifyRouteManifest();
  console.log(
    `route-manifest: ${result.ok ? "PASS" : "FAIL"} (${result.activeRoutes.length} active; ${result.duplicates.length} acknowledged root/src duplicates)`,
  );
  if (!result.ok) {
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith("verify-route-manifest.mjs")) {
  main().catch((error) => {
    console.error(`route-manifest: FAIL (${error instanceof Error ? error.message : "unknown error"})`);
    process.exit(1);
  });
}
