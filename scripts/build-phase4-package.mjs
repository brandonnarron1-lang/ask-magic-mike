#!/usr/bin/env node

import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(".");
const outputDirectory = join(root, "output/phase4");
const packageName = "Ask_Magic_Mike_Phase4_Operational_Readiness_Package_2026-08-15.zip";
const packagePath = join(outputDirectory, packageName);
const checksumPath = `${packagePath}.sha256`;
const stagingRoot = await mkdtemp(join(tmpdir(), "amm-phase4-package-"));
const staging = join(stagingRoot, "Ask_Magic_Mike_Phase4_Operational_Readiness");

const files = [
  "docs/PHASE4_PRECHANGE_PRODUCTION_SNAPSHOT.md",
  "docs/PRODUCTION_ACCEPTANCE_PHASE4.md",
  "docs/QA_EVIDENCE_PHASE4.md",
  "docs/SECURITY_REVIEW_PHASE4.md",
  "docs/PHASE4_ARTIFACT_STATUS.md",
  "docs/PRODUCTION_MONITORING_RUNBOOK.md",
  "docs/FIRST_LIVE_LEAD_RESPONSE_RUNBOOK.md",
  "docs/FIRST_LIVE_LEAD_ACCEPTANCE_TEMPLATE.md",
  "docs/BRANDON_ADMIN_ACTIVATION_STATUS.md",
  "docs/MIKE_PRIMARY_OWNER_ACTIVATION_STATUS.md",
  "docs/BRANDON_WEB_PUSH_ENROLLMENT.md",
  "docs/MIKE_WEB_PUSH_ENROLLMENT.md",
  "docs/WEB_PUSH_ACCEPTANCE_REPORT.md",
  "docs/WEB_PUSH_DEVICE_REGISTER.csv",
  "docs/GRAVITY_FORMS_BIC_APPROVAL_PACKET.md",
  "docs/GRAVITY_FORMS_CANONICAL_INVENTORY.md",
  "docs/FORM_ACTIVATION_CHANGE_LOG.md",
  "docs/FORM7_ENTRY_1550_DISPOSITION.md",
  "docs/META_CRAWLER_ROOT_CAUSE.md",
  "docs/META_CRAWLER_FIREWALL_CHANGE.md",
  "docs/SOCIAL_PREVIEW_ACCEPTANCE_PHASE4.md",
  "docs/LEAD_CENTER_SUBDOMAIN_DECISION.md",
  "docs/LEAD_CENTER_SUBDOMAIN_CHANGE.md",
  "docs/LEAD_CENTER_SUBDOMAIN_ROLLBACK.md",
  "docs/ASK_MAGIC_MIKE_UTM_LINK_LIBRARY.csv",
  "docs/ZERO_SPEND_CONTENT_APPROVAL_QUEUE.csv",
  "docs/INCIDENT_ESCALATION_MATRIX.csv",
  "docs/ASK_MAGIC_MIKE_DAY1_OPERATIONS_REPORT.md",
  "docs/ASK_MAGIC_MIKE_7_DAY_OPERATIONS_REPORT_SOURCE.md",
  "docs/ASK_MAGIC_MIKE_30_DAY_EXECUTIVE_REPORT_SOURCE.md",
  "docs/ASK_MAGIC_MIKE_PHASE4_OPERATIONS_PRESENTATION_SOURCE.md",
  "docs/ENVIRONMENT_VARIABLE_MATRIX.md",
  "docs/ROLLBACK_PLAN.md",
  "output/phase4/ASK_MAGIC_MIKE_QR_ASSET_PACKAGE.zip",
  "src/lib/operations/first-live-lead-monitor.ts",
  "app/api/admin/operations/first-live/route.ts",
  "supabase/migrations/20260815133000_first_live_lead_monitor.sql",
  "tests/operations/first-live-lead-monitor.test.ts",
];

try {
  await mkdir(staging, { recursive: true });
  for (const relativePath of files) {
    const source = join(root, relativePath);
    const destination = join(staging, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await cp(source, destination);
  }

  const manifest = {
    created_at: new Date().toISOString(),
    main_commit: "4528fc8407070a3c82a4089841c2afffccd217ee",
    production_deployment: "dpl_AmnXdUZnxax3xb1LTzf26xzwDpfV",
    live_prospects_at_acceptance: 0,
    suppressed_qa_at_acceptance: 6,
    native_office_artifacts: "deferred_required_runtime_unavailable",
    excluded: ["passwords", "reset URLs/tokens", "secrets", "hidden BCC value", "sessions", "Push endpoints", "genuine lead PII", "billing data"],
    files,
  };
  await writeFile(join(staging, "PACKAGE_MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  await mkdir(outputDirectory, { recursive: true });
  const zip = spawnSync("zip", ["-q", "-r", packagePath, basename(staging)], {
    cwd: dirname(staging),
    encoding: "utf8",
  });
  if (zip.status !== 0) throw new Error(zip.stderr || "zip_failed");

  const bytes = await readFile(packagePath);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  await writeFile(checksumPath, `${checksum}  ${packageName}\n`);
  console.log(JSON.stringify({ package: packagePath, sha256: checksum, files: files.length + 1 }, null, 2));
} finally {
  await rm(stagingRoot, { recursive: true, force: true });
}
