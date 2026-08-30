import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260830190000_admin_lead_api_persistence.sql",
  "utf8",
);

describe("canonical admin lead API persistence migration", () => {
  it("ships atomic lead patch, note, task, and reason-aware assignment functions", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.patch_admin_lead_v1(");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.add_admin_lead_note_v1(");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.create_admin_lead_task_v1(");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.mutate_admin_assignment_v2(");
    expect(migration).toContain("public.mutate_admin_assignment_v1(");
  });

  it("uses static allowlisted fields and parameterized RPC inputs", () => {
    expect(migration).toContain("jsonb_object_keys(p_patch)");
    expect(migration).toContain("'next_follow_up_at'");
    expect(migration).toContain("'last_contacted_at'");
    expect(migration).not.toMatch(/EXECUTE\s+['"]UPDATE public\.leads/i);
  });

  it("restores a spam-cleared lead from immutable pre-spam status evidence", () => {
    expect(migration).toContain("restore_status_before_spam");
    expect(migration).toContain("after_state->>'status' = 'spam'");
    expect(migration).toContain("before_state->>'status'");
    expect(migration).toContain("v_prior_status := COALESCE(v_prior_status, 'new')");
  });

  it("stores durable IDs and privacy-minimized immutable audit evidence", () => {
    expect(migration).toContain("'message_id', v_message_id");
    expect(migration).toContain("'task_id', v_task_id");
    expect(migration).toContain("'content_length', LENGTH(v_content)");
    expect(migration).not.toContain("'content', v_content");
    expect(migration).toContain("'assignment_reason', v_reason");
    expect(migration).toContain("'lead.assignment_reason_recorded'");
  });

  it("revokes the RPC surface from public browser roles", () => {
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.patch_admin_lead_v1(UUID, JSONB, TEXT, TIMESTAMPTZ) FROM PUBLIC",
    );
    expect(migration).toContain("ARRAY['anon', 'authenticated']");
    expect(migration).toContain("SECURITY INVOKER");
  });
});
