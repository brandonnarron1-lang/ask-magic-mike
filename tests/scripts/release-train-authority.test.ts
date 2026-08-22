import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ownerQueue = readFileSync(
  resolve(process.cwd(), "docs/OWNER_APPROVAL_QUEUE.md"),
  "utf8",
);
const goLiveRunbook = readFileSync(
  resolve(process.cwd(), "docs/GO_LIVE_RUNBOOK.md"),
  "utf8",
);

const activeQueue = ownerQueue
  .split("## Active Production release sequence")[1]
  ?.split("## Historical candidate retained for audit")[0] ?? "";

const RELEASE_TRAIN = [
  {
    pr: 183,
    gate: "APPROVE PHASE 9 CAMPAIGN SAFETY AND THREE-OFFER OWNED-DEMAND FLIGHT MERGE AND PRODUCTION DEPLOYMENT",
  },
  {
    pr: 184,
    gate: "APPROVE PHASE 9 OWNED-DEMAND PUBLICATION PROOF LEDGER PRODUCTION MIGRATION, MERGE, AND PRODUCTION DEPLOYMENT",
  },
  {
    pr: 185,
    gate: "APPROVE PHASE 9 CURRENT-ROUTER SAFETY AND BUYER DISCOVERY MERGE AND PRODUCTION DEPLOYMENT",
  },
  {
    pr: 186,
    gate: "APPROVE PHASE 9 OWNED-DEMAND ASSET STUDIO MERGE AND PRODUCTION DEPLOYMENT",
  },
  {
    pr: 187,
    gate: "APPROVE PHASE 9 KPI TARGET REGISTER PRODUCTION MIGRATION, MERGE, AND PRODUCTION DEPLOYMENT",
  },
  {
    pr: 188,
    gate: "APPROVE PHASE 9 WORDPRESS OWNED-TRAFFIC CONSOLIDATION MERGE AND PRODUCTION DEPLOYMENT",
  },
  {
    pr: 189,
    gate: "APPROVE PHASE 9 EXACT OWNED-DEMAND ACTIVATION LOOP MERGE AND PRODUCTION DEPLOYMENT",
  },
  {
    pr: 179,
    gate: "APPROVE IOS PHONE ALERT INSTALL HANDOFF MERGE AND PRODUCTION DEPLOYMENT",
  },
  {
    pr: 190,
    gate: "APPROVE PHASE 9 DURABLE RATE-LIMIT PRIVACY HARDENING MERGE AND PRODUCTION DEPLOYMENT",
  },
  {
    pr: 191,
    gate: "APPROVE PHASE 9 ANALYTICS PRIVACY HARDENING MERGE AND PRODUCTION DEPLOYMENT",
  },
  {
    pr: 192,
    gate: "APPROVE PHASE 9 OUTCOME AND DELIVERY KPI TRUST MERGE AND PRODUCTION DEPLOYMENT",
  },
] as const;

const IMMUTABLE_PREDECESSORS = [
  { pr: 183, head: "95a4f210eed4f8991e96e2eee595da5907112ba9", run: "32539636103" },
  { pr: 184, head: "4b9109492bb157e45babc23aeda58b30022bae2e", run: "32540355761" },
  { pr: 185, head: "74b4b142ace5b7a1a258e6423638bc434ef1f532", run: "32540396465" },
  { pr: 186, head: "d193ab52215bd4d8a29db023bbfd4b45ded821ac", run: "32540497485" },
  { pr: 187, head: "9d9a1e6f38dbf96e26750945a3d00e1a6fb65827", run: "32540533222" },
  { pr: 188, head: "35438c311f8a3a5658691aa9568a5e80e4b5ef18", run: "32540568531" },
  { pr: 189, head: "f5b3165f63873dbf3b4c2719cb522b00935f72c7", run: "32540823212" },
  { pr: 179, head: "9dd6684596ac8afbc52076d2c1597c12a0fa33e2", run: "32540896724" },
  { pr: 190, head: "d431bc3427720ae68167b1864e98e406206a47a3", run: "32543177677" },
  { pr: 191, head: "695bd11f3bb4727c684e4fef0186734be3c9c7fa", run: "32544720391" },
] as const;

function occurrences(source: string, value: string) {
  return source.split(value).length - 1;
}

describe("authoritative Phase 9 release train", () => {
  it("lists every active PR exactly once and in dependency order", () => {
    let previousIndex = -1;
    for (const item of RELEASE_TRAIN) {
      const marker = `/pull/${item.pr})`;
      expect(occurrences(activeQueue, marker), `PR #${item.pr}`).toBe(1);
      const currentIndex = activeQueue.indexOf(marker);
      expect(currentIndex, `PR #${item.pr} order`).toBeGreaterThan(previousIndex);
      previousIndex = currentIndex;
    }
  });

  it("preserves one exact approval phrase per active release", () => {
    for (const item of RELEASE_TRAIN) {
      expect(occurrences(activeQueue, item.gate), `PR #${item.pr} gate`).toBe(1);
    }
  });

  it("keeps immutable predecessor heads and Node 24 runs in the runbook", () => {
    for (const item of IMMUTABLE_PREDECESSORS) {
      expect(goLiveRunbook).toContain(`\`#${item.pr}\``);
      expect(goLiveRunbook).toContain(item.head);
      expect(goLiveRunbook).toContain(item.run);
    }
    expect(goLiveRunbook).toContain("recorded in PR #192 metadata");
  });

  it("keeps migration authority limited to the two reviewed migration PRs", () => {
    expect(activeQueue).toContain("Only the #184 publication-proof and #187 KPI-target-register phrases authorize");
    expect(goLiveRunbook).toContain("Only #184 and #187 add migrations");
  });
});
