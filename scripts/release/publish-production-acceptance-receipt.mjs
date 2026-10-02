#!/usr/bin/env node

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import {
  assertIdempotentReceiptReplay,
  receiptTag,
  validateProductionAcceptanceReceipt,
  validateReleaseAuthorityPolicy,
} from "../lib/release-authority-receipt.mjs";
import { runJsonCommand, runTextCommand } from "../lib/release-authority-platform.mjs";

const ROOT = resolve(".");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function releaseExists(repository, tag) {
  try {
    return runJsonCommand("gh", ["release", "view", tag, "--repo", repository, "--json", "tagName,url"]);
  } catch (error) {
    if (String(error.message).includes("release not found")) return null;
    throw error;
  }
}

async function main() {
  const policy = validateReleaseAuthorityPolicy(
    await readJson(resolve(ROOT, "config/release-authority-policy.json")),
  );
  const receiptPath = resolve(
    ROOT,
    process.env.RELEASE_RECEIPT_PATH || `artifacts/release-authority/${policy.receiptStore.assetName}`,
  );
  const checksumPath = resolve(
    ROOT,
    process.env.RELEASE_CHECKSUM_PATH || `artifacts/release-authority/${policy.receiptStore.checksumAssetName}`,
  );
  const notesPath = resolve(
    ROOT,
    process.env.RELEASE_NOTES_PATH || "artifacts/release-authority/release-notes.md",
  );
  const receipt = validateProductionAcceptanceReceipt(await readJson(receiptPath), policy);
  const tag = receiptTag(receipt, policy);
  const existing = releaseExists(policy.repository, tag);

  if (existing) {
    const temp = await mkdtemp(join(tmpdir(), "amm-release-receipt-"));
    try {
      runTextCommand("gh", [
        "release",
        "download",
        tag,
        "--repo",
        policy.repository,
        "--pattern",
        policy.receiptStore.assetName,
        "--dir",
        temp,
      ]);
      const published = await readJson(join(temp, policy.receiptStore.assetName));
      assertIdempotentReceiptReplay(published, receipt);
      process.stdout.write(`${JSON.stringify({ status: "already_published", tag, url: existing.url })}\n`);
      return;
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  }

  runTextCommand("gh", [
    "release",
    "create",
    tag,
    receiptPath,
    checksumPath,
    "--repo",
    policy.repository,
    "--target",
    receipt.source.mergeCommit,
    "--title",
    `Ask Magic Mike Production acceptance ${receipt.source.mergeCommit.slice(0, 7)}`,
    "--notes-file",
    notesPath,
    "--latest=false",
  ]);
  const created = releaseExists(policy.repository, tag);
  if (!created) throw new Error("receipt_release_creation_unverified");
  process.stdout.write(`${JSON.stringify({ status: "published", tag, url: created.url, asset: basename(receiptPath) })}\n`);
}

main().catch((error) => {
  process.stderr.write(`production acceptance receipt publication failed: ${error instanceof Error ? error.message : "unknown_error"}\n`);
  process.exitCode = 1;
});
