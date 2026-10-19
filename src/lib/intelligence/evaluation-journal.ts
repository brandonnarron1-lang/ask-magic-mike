import { closeSync, constants, fstatSync, fsyncSync, lstatSync, openSync, readFileSync, realpathSync, unlinkSync, writeSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import type { GroundedBudget } from "./grounded-generation";

const key = z.string().regex(/^[A-Za-z0-9:._-]{16,180}$/);
const ref = z.string().regex(/^[a-f0-9]{40}$/);
const phase = z.enum(["sentinel", "fixed"]);
const mode = z.enum(["validated_selection", "deterministic", "reconciliation_required", "budget_blocked"]);
const reservation = z.object({ key, phase, model: z.string().regex(/^[a-z0-9][a-z0-9.-]{1,100}$/),
  maximumMicroUsd: z.number().int().positive().max(160000), sourceRef: ref }).strict();
const settlement = z.object({ key, inputTokens: z.number().int().nonnegative(), outputTokens: z.number().int().nonnegative(),
  costMicroUsd: z.number().int().nonnegative(), providerId: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/) }).strict();
const outcome = z.object({ key, sourceRef: ref, passed: z.boolean(), mode,
  latencyMs: z.number().int().nonnegative().max(120000), citations: z.number().int().nonnegative().max(3) }).strict();
const event = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("header"), projectId: z.string().regex(/^proj_[A-Za-z0-9]+$/), scope: z.literal("dedicated_nonproduction_evaluation"), version: z.literal(1) }).strict(),
  z.object({ kind: z.literal("reservation"), data: reservation }).strict(),
  z.object({ kind: z.literal("settled"), data: settlement }).strict(),
  z.object({ kind: z.literal("hold"), key, reason: z.literal("provider_outcome_or_usage_unverified") }).strict(),
  z.object({ kind: z.literal("outcome"), data: outcome }).strict(),
]);
type Event = z.infer<typeof event>;
export type EvaluationCheckpoint = z.infer<typeof reservation> & { settled?: z.infer<typeof settlement>; held?: boolean; outcome?: z.infer<typeof outcome> };
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const micro = (usd: number) => { if (!Number.isFinite(usd) || usd < 0) throw new Error("invalid_evaluation_cost"); return Math.ceil(usd * 1000000); };

/** Private execution receipt, not a second application budget/queue. It is
 * fsynced BEFORE a request is authorized by the existing SQL budget. An unknown
 * request remains held across process/DB teardown; the same key never retries.
 * Stale locks or a torn/tampered log fail closed and require reconciliation. */
export function openEvaluationJournal(input: { directory: string; projectId: string }) {
  const directory = realpathSync(input.directory);
  if (!path.isAbsolute(input.directory) || lstatSync(input.directory).isSymbolicLink()
    || (lstatSync(directory).mode & 0o077) !== 0) throw new Error("private_evaluation_directory_required");
  const file = path.join(directory, "r2-evaluation-journal.v1.jsonl"), lock = `${file}.lock`;
  const lockFd = openSync(lock, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
  writeSync(lockFd, JSON.stringify({ pid: process.pid, projectId: input.projectId, at: new Date().toISOString() })); fsyncSync(lockFd);
  const ownedLock = fstatSync(lockFd); let fd: number | undefined; let closed = false, poisoned = false;
  let sequence = 0, previousHash = "0".repeat(64);
  const records = new Map<string, EvaluationCheckpoint>();
  const outcomes = new Map<string, z.infer<typeof outcome>>();
  function apply(value: Event, reading = false) {
    if (sequence === 0 && value.kind !== "header") throw new Error("evaluation_header_required");
    if (value.kind === "header") {
      if (sequence !== 0 || value.projectId !== input.projectId) throw new Error("evaluation_project_binding_mismatch");
    } else if (value.kind === "reservation") {
      if (records.has(value.data.key)) throw new Error("duplicate_evaluation_reservation");
      records.set(value.data.key, { ...value.data });
    } else if (value.kind === "settled") {
      const row = records.get(value.data.key);
      if (!row || row.settled || value.data.costMicroUsd > row.maximumMicroUsd) throw new Error("invalid_evaluation_settlement");
      row.settled = value.data;
    } else if (value.kind === "hold") {
      const row = records.get(value.key); if (!row) throw new Error("evaluation_reservation_required"); row.held = true;
    } else {
      const row = records.get(value.data.key);
      if (outcomes.has(value.data.key) || (row && value.data.sourceRef !== row.sourceRef)
        || (value.data.mode === "validated_selection" && (!row?.settled || value.data.citations < 1))
        || (!row && !["deterministic", "budget_blocked"].includes(value.data.mode))) throw new Error("invalid_evaluation_outcome");
      outcomes.set(value.data.key, value.data); if (row) row.outcome = value.data;
    }
    if (reading && sequence >= 1000) throw new Error("evaluation_journal_size_limit");
  }
  function append(raw: Event) {
    if (closed || poisoned || fd === undefined || sequence >= 1000) throw new Error("evaluation_journal_unavailable");
    const value = event.parse(raw);
    const recordedAt = new Date().toISOString();
    const payload = JSON.stringify({ sequence, previousHash, recordedAt, event: value });
    const digest = hash(payload), line = JSON.stringify({ sequence, previousHash, recordedAt, event: value, hash: digest }) + "\n";
    // A partial write or fsync failure blocks this handle. Never continue with
    // state that was not durably recorded, or auto-repair a possibly sent call.
    try { const bytes = Buffer.from(line); if (writeSync(fd, bytes) !== bytes.length) throw new Error("evaluation_journal_short_write"); fsyncSync(fd); }
    catch { poisoned = true; throw new Error("evaluation_journal_write_failed"); }
    apply(value); previousHash = digest; sequence++;
  }
  try {
    fd = openSync(file, constants.O_CREAT | constants.O_APPEND | constants.O_RDWR | constants.O_NOFOLLOW, 0o600);
    const stat = fstatSync(fd); if (!stat.isFile() || stat.nlink !== 1 || (stat.mode & 0o077) !== 0 || stat.size > 1000000) throw new Error("private_evaluation_file_required");
    const text = readFileSync(fd, "utf8");
    if (text && !text.endsWith("\n")) throw new Error("evaluation_journal_incomplete_reconcile_required");
    for (const line of text.split("\n").filter(Boolean)) {
      const parsed = z.object({ sequence: z.number().int(), previousHash: z.string(), recordedAt: z.string().datetime(), event, hash: z.string() }).strict().parse(JSON.parse(line));
      const expected = hash(JSON.stringify({ sequence, previousHash, recordedAt: parsed.recordedAt, event: parsed.event }));
      if (parsed.sequence !== sequence || parsed.previousHash !== previousHash || parsed.hash !== expected) throw new Error("evaluation_journal_integrity_failed");
      apply(parsed.event, true); previousHash = parsed.hash; sequence++;
    }
    if (!sequence) append({ kind: "header", projectId: input.projectId, scope: "dedicated_nonproduction_evaluation", version: 1 });
  } catch (error) { if (fd !== undefined) closeSync(fd); closeSync(lockFd); unlinkSync(lock); throw error; }
  const snapshot = () => structuredClone([...records.values()]);
  return {
    file, snapshot,
    outcome(keyValue: string) { return structuredClone(outcomes.get(keyValue) ?? null); },
    totals() { const rows = [...records.values()]; return { maximumOrAccountedUsd: rows.reduce((n,r)=>n+(r.settled?.costMicroUsd ?? r.maximumMicroUsd),0)/1000000,
      sentinelMaximumOrAccountedUsd: rows.filter(r=>r.phase==="sentinel").reduce((n,r)=>n+(r.settled?.costMicroUsd ?? r.maximumMicroUsd),0)/1000000,
      sentinelAttempts: rows.filter(r=>r.phase==="sentinel").length, reservations: rows.length }; },
    reserve(raw: { key: string; model: string; maximumUsd: number; phase: "sentinel" | "fixed"; sourceRef: string }) {
      const data = reservation.parse({ key: raw.key, model: raw.model, maximumMicroUsd: micro(raw.maximumUsd), phase: raw.phase, sourceRef: raw.sourceRef });
      const existing = records.get(data.key);
      if (existing) { if (Object.keys(data).some(k=>data[k as keyof typeof data]!==existing[k as keyof typeof data])) throw new Error("evaluation_replay_conflict"); return false; }
      const rows = [...records.values()], total = rows.reduce((n,r)=>n+(r.settled?.costMicroUsd ?? r.maximumMicroUsd),0);
      const sentinels = rows.filter(r=>r.phase==="sentinel"), sentinelCost=sentinels.reduce((n,r)=>n+(r.settled?.costMicroUsd ?? r.maximumMicroUsd),0);
      if (total+data.maximumMicroUsd>10000000 || (data.phase==="sentinel" && (sentinels.length>=3 || sentinelCost+data.maximumMicroUsd>500000))
        || (data.phase==="fixed" && !sentinels.some(r=>r.settled && r.outcome?.passed && r.outcome.mode==="validated_selection"))) return false;
      append({ kind: "reservation", data }); return true;
    },
    settle(raw: { key: string; inputTokens: number; outputTokens: number; costUsd: number; providerId: string }) {
      const data = settlement.parse({ key: raw.key, inputTokens: raw.inputTokens, outputTokens: raw.outputTokens, costMicroUsd: micro(raw.costUsd), providerId: raw.providerId });
      const row = records.get(data.key); if (!row || row.settled || data.costMicroUsd>row.maximumMicroUsd) throw new Error("invalid_evaluation_settlement");
      append({ kind: "settled", data });
    },
    hold(keyValue: string) { if (!records.has(keyValue)) throw new Error("evaluation_reservation_required"); append({ kind: "hold", key: keyValue, reason: "provider_outcome_or_usage_unverified" }); },
    recordOutcome(raw: z.infer<typeof outcome>) {
      const data = outcome.parse(raw), row = records.get(data.key);
      if (outcomes.has(data.key) || (row && data.sourceRef!==row.sourceRef)
        || (data.mode==="validated_selection" && (!row?.settled || data.citations<1))
        || (!row && !["deterministic","budget_blocked"].includes(data.mode))) throw new Error("invalid_evaluation_outcome");
      append({ kind: "outcome", data });
    },
    close() { if (closed) return; closed=true; if (fd!==undefined) closeSync(fd); closeSync(lockFd);
      if (lstatSync(lock).ino !== ownedLock.ino) throw new Error("evaluation_lock_identity_changed"); unlinkSync(lock); },
  };
}
export type EvaluationJournal = ReturnType<typeof openEvaluationJournal>;

/** Journal first, then the unchanged SQL reservation; neither may be bypassed. */
export function journaledEvaluationBudget(budget: GroundedBudget, journal: EvaluationJournal, options: { phase: "sentinel" | "fixed"; sourceRef: string }): GroundedBudget {
  return {
    async reserve(input) { if (!journal.reserve({ ...input, ...options })) return { authorized: false }; return budget.reserve(input); },
    async settle(input) { await budget.settle(input); journal.settle(input); },
    async hold(input) { journal.hold(input.key); await budget.hold(input); },
  };
}
