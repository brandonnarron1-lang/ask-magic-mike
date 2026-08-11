import { describe, expect, it, vi } from "vitest";
import { NeonPostgresAdapter } from "../../app/lib/persistence/neonPostgresAdapter";

describe("NeonPostgresAdapter", () => {
  it("inserts consent columns explicitly so database defaults remain intact", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const adapter = new NeonPostgresAdapter({ query } as never);

    await adapter.enrichLeadRecord({
      leadId: "11111111-1111-4111-8111-111111111111",
      leadPatch: { score: 91, is_test: true },
      attributionPatch: { placement_id: "preview_qa" },
      consents: [
        {
          lead_id: "11111111-1111-4111-8111-111111111111",
          consent_type: "email",
          granted: false,
          language_version: "qa-v1",
          collected_at: "2026-08-11T15:00:00.000Z",
        },
      ],
    });

    expect(query).toHaveBeenCalledTimes(3);
    const consentSql = String(query.mock.calls[2][0]);
    expect(consentSql).toContain("INSERT INTO public.consents (");
    expect(consentSql).toContain("lead_id, consent_type, granted");
    expect(consentSql).not.toContain("jsonb_populate_record");
  });
});
