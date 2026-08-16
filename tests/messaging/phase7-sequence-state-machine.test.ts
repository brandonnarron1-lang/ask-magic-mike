import { describe, expect, it } from "vitest";
import { sequenceMustStop, transitionSequence } from "@/lib/messaging/sequence-state-machine";

describe("Phase 7 durable sequence state machine", () => {
  it("uses explicit, reviewable transitions", () => {
    expect(transitionSequence("draft", "request_approval")).toMatchObject({ ok: true, next: "approval_required" });
    expect(transitionSequence("approval_required", "approve")).toMatchObject({ ok: true, next: "scheduled" });
    expect(transitionSequence("scheduled", "activate")).toMatchObject({ ok: true, next: "active" });
    expect(transitionSequence("active", "pause")).toMatchObject({ ok: true, next: "paused" });
    expect(transitionSequence("paused", "resume")).toMatchObject({ ok: true, next: "approval_required" });
  });

  it("rejects terminal or unsafe transitions", () => {
    expect(transitionSequence("completed", "resume")).toMatchObject({ ok: false, error: "invalid_sequence_transition" });
    expect(transitionSequence("draft", "approve")).toMatchObject({ ok: false });
  });

  it("stops unsafe test, suppressed, opt-out, duplicate, and terminal records", () => {
    expect(sequenceMustStop({ isTest: true })).toMatchObject({ stop: true, reason: "test_or_suppressed" });
    expect(sequenceMustStop({ suppressed: true })).toMatchObject({ stop: true, reason: "test_or_suppressed" });
    expect(sequenceMustStop({ isTest: true, suppressed: true, allowSuppressedQaTest: true })).toEqual({ stop: false, reason: null });
    expect(sequenceMustStop({ optedOut: true })).toMatchObject({ stop: true, reason: "opt_out" });
    expect(sequenceMustStop({ duplicate: true })).toMatchObject({ stop: true, reason: "duplicate_consolidation" });
    expect(sequenceMustStop({ terminalStage: true })).toMatchObject({ stop: true, reason: "terminal_stage" });
    expect(sequenceMustStop({})).toEqual({ stop: false, reason: null });
  });
});
