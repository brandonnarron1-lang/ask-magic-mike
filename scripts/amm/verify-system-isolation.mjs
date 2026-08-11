#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(".");
const expectedVercel = Object.freeze({
  projectId: "prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8",
  orgId: "team_OVg2uOSyJCpX100BPgb8nJK9",
  projectName: "ask-magic-mike",
});
const deployableRoots = ["app", "src", "public", "middleware.ts", "next.config.js", "next.config.mjs", "vercel.json"];
const forbidden = [
  /nelly\s*selly/i,
  /org-spring-salad-74189404/i,
  /org-lucky-mode-67034979/i,
];
const failures = [];

async function filesAt(path, out = []) {
  const absolute = join(root, path);
  let entries;
  try {
    entries = await readdir(absolute, { withFileTypes: true });
  } catch {
    try {
      await readFile(absolute);
      out.push(absolute);
    } catch {
      // Optional config path is absent.
    }
    return out;
  }
  for (const entry of entries) {
    const child = join(absolute, entry.name);
    if (entry.isDirectory()) await filesAt(relative(root, child), out);
    else out.push(child);
  }
  return out;
}

for (const path of deployableRoots) {
  for (const file of await filesAt(path)) {
    if (!/\.(?:[cm]?[jt]sx?|json|html|css|svg|txt|xml|webmanifest)$/.test(file)) continue;
    const text = await readFile(file, "utf8");
    for (const pattern of forbidden) {
      if (pattern.test(text)) failures.push(`${relative(root, file)} contains forbidden cross-system identifier ${pattern}`);
    }
  }
}

let projectLinkVerified = false;
try {
  const linked = JSON.parse(await readFile(join(root, ".vercel/project.json"), "utf8"));
  for (const [key, expected] of Object.entries(expectedVercel)) {
    if (linked[key] !== expected) failures.push(`.vercel/project.json ${key} is ${JSON.stringify(linked[key])}; expected ${JSON.stringify(expected)}`);
  }
  projectLinkVerified = true;
} catch {
  // .vercel is intentionally gitignored. Vercel builds expose immutable project
  // metadata as system variables; plain GitHub CI has neither and still runs the
  // deployable-source boundary scan below.
  const deployed = {
    projectId: process.env.VERCEL_PROJECT_ID,
    orgId: process.env.VERCEL_ORG_ID,
    projectName: process.env.VERCEL_PROJECT_NAME,
  };
  if (Object.values(deployed).some(Boolean)) {
    for (const [key, expected] of Object.entries(expectedVercel)) {
      if (deployed[key] !== expected) failures.push(`Vercel system variable ${key} is ${JSON.stringify(deployed[key])}; expected ${JSON.stringify(expected)}`);
    }
    projectLinkVerified = true;
  }
}

if (failures.length) {
  console.error("Ask Magic Mike system-isolation verification FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Ask Magic Mike system-isolation verification passed");
console.log(projectLinkVerified
  ? `- Vercel project verified: ${expectedVercel.projectName} (${expectedVercel.projectId})`
  : "- Vercel link metadata unavailable in plain CI; deployable-source boundary verified");
console.log("- Deployable code contains no NellySelly project identifiers");
console.log("- Documentation is intentionally excluded so isolation decisions can be recorded");
