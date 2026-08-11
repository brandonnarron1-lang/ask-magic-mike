import { describe, expect, it } from "vitest";
import {
  decodeBasicPassword,
  edgeSecretsMatch,
} from "@/lib/admin/edge-secret";

describe("edge admin secret helpers", () => {
  it("decodes a Basic password without Node Buffer", () => {
    expect(decodeBasicPassword(`Basic ${btoa("admin:correct:with-colon")}`)).toBe(
      "correct:with-colon",
    );
  });

  it("rejects malformed authorization", () => {
    expect(decodeBasicPassword("Bearer token")).toBeNull();
    expect(decodeBasicPassword("Basic !!!")).toBeNull();
  });

  it("compares secrets through fixed-size digests", async () => {
    await expect(edgeSecretsMatch("correct", "correct")).resolves.toBe(true);
    await expect(edgeSecretsMatch("correct", "wrong")).resolves.toBe(false);
    await expect(edgeSecretsMatch(undefined, "wrong")).resolves.toBe(false);
  });
});
