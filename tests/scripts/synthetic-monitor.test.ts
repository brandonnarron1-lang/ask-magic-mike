import { describe, expect, it } from "vitest";
import { findPrivateListingLeak } from "../../scripts/synthetic-monitor.mjs";

describe("findPrivateListingLeak", () => {
  it("returns null for a clean public listing payload", () => {
    expect(
      findPrivateListingLeak([
        { id: "1", address: "123 Nash St", list_price: 250000 },
        { id: "2", address: "456 Main St", list_price: 320000 },
      ])
    ).toBeNull();
  });

  it("flags agent_remarks", () => {
    expect(
      findPrivateListingLeak([
        { id: "1", agent_remarks: "internal note" },
      ])
    ).toBe("agent_remarks");
  });

  it("flags lockbox_info even if address is also present", () => {
    expect(
      findPrivateListingLeak([
        { id: "1", address: "123 Nash St", lockbox_info: "1234#" },
      ])
    ).toBe("lockbox_info");
  });

  it("flags showing_instructions and compensation", () => {
    expect(
      findPrivateListingLeak([
        { id: "1", showing_instructions: "call first" },
      ])
    ).toBe("showing_instructions");
    expect(
      findPrivateListingLeak([{ id: "2", compensation: "2.5%" }])
    ).toBe("compensation");
  });

  it("returns null when items is missing or not an array", () => {
    // @ts-expect-error intentional bad input
    expect(findPrivateListingLeak(null)).toBeNull();
    // @ts-expect-error intentional bad input
    expect(findPrivateListingLeak(undefined)).toBeNull();
    // @ts-expect-error intentional bad input
    expect(findPrivateListingLeak({})).toBeNull();
  });

  it("skips non-object items safely", () => {
    expect(
      findPrivateListingLeak([
        null as unknown as Record<string, unknown>,
        undefined as unknown as Record<string, unknown>,
        "string" as unknown as Record<string, unknown>,
        { id: "good", address: "ok" },
      ])
    ).toBeNull();
  });
});
