import { describe, expect, it } from "vitest";
import { loadLeadList } from "@/lib/admin/lead-list";

describe("loadLeadList — mock mode (no Supabase)", () => {
  it("returns a stable empty shape when Supabase isn't configured", async () => {
    const r = await loadLeadList({ limit: 25 });
    expect(r.configured).toBe(false);
    expect(r.items).toEqual([]);
    expect(r.total).toBe(0);
    expect(r.limit).toBe(25);
    expect(r.offset).toBe(0);
  });

  it("caps limit at 100", async () => {
    const r = await loadLeadList({ limit: 999 });
    expect(r.limit).toBeLessThanOrEqual(100);
  });

  it("never goes negative on offset", async () => {
    const r = await loadLeadList({ offset: -100 });
    expect(r.offset).toBe(0);
  });
});
