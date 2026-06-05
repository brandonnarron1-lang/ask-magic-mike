/**
 * Pure-helper tests for the listing-search / detail fallback shapes.
 * No network. No Supabase. No Next.
 */
import { describe, expect, it } from "vitest";
import {
  FALLBACK_REASON,
  FALLBACK_SOURCE,
  containsPrivateFieldName,
  isRecoverableListingProviderError,
  safeEmptyListingDetailResponse,
  safeEmptyListingSearchResponse,
} from "@/lib/listings/safe-responses";
import { PRIVATE_FIELD_NAMES } from "@/lib/compliance/listing-sanitizer";

describe("safeEmptyListingSearchResponse", () => {
  it("returns the public-safe empty shape with the caller's limit echo", () => {
    const r = safeEmptyListingSearchResponse(15);
    expect(r.ok).toBe(true);
    expect(r.items).toEqual([]);
    expect(r.limit).toBe(15);
    expect(r.degraded).toBe(true);
    expect(r.source).toBe(FALLBACK_SOURCE);
    expect(r.reason).toBe(FALLBACK_REASON);
  });

  it("never contains any private MLS field name", () => {
    const r = safeEmptyListingSearchResponse(20);
    expect(containsPrivateFieldName(r)).toBeNull();
    for (const name of PRIVATE_FIELD_NAMES) {
      expect(JSON.stringify(r)).not.toContain(name);
    }
  });

  it("does not include any raw error / error message field", () => {
    const r = safeEmptyListingSearchResponse(20) as unknown as Record<
      string,
      unknown
    >;
    expect(r.error).toBeUndefined();
    expect(r.error_message).toBeUndefined();
    expect("message" in r).toBe(false);
  });
});

describe("safeEmptyListingDetailResponse", () => {
  it("returns the public-safe empty detail shape", () => {
    const r = safeEmptyListingDetailResponse();
    expect(r.ok).toBe(true);
    expect(r.listing).toBeNull();
    expect(r.degraded).toBe(true);
    expect(r.source).toBe(FALLBACK_SOURCE);
    expect(r.reason).toBe(FALLBACK_REASON);
  });

  it("never contains any private MLS field name", () => {
    const r = safeEmptyListingDetailResponse();
    expect(containsPrivateFieldName(r)).toBeNull();
    for (const name of PRIVATE_FIELD_NAMES) {
      expect(JSON.stringify(r)).not.toContain(name);
    }
  });
});

describe("isRecoverableListingProviderError", () => {
  it("classifies a Postgres-style schema-cache miss as recoverable", () => {
    expect(
      isRecoverableListingProviderError({
        message: "Could not find the table 'public.listings' in the schema cache",
        code: "PGRST205",
      })
    ).toBe(true);
  });

  it("classifies a thrown JS Error as recoverable", () => {
    expect(isRecoverableListingProviderError(new Error("boom"))).toBe(true);
  });

  it("classifies a thrown non-object error as recoverable", () => {
    expect(isRecoverableListingProviderError("network down")).toBe(true);
    expect(isRecoverableListingProviderError(500)).toBe(true);
  });

  it("treats null/undefined as not-an-error", () => {
    expect(isRecoverableListingProviderError(null)).toBe(false);
    expect(isRecoverableListingProviderError(undefined)).toBe(false);
  });
});

describe("containsPrivateFieldName", () => {
  it("flags top-level private keys", () => {
    expect(
      containsPrivateFieldName({ agent_remarks: "internal" })
    ).toBe("agent_remarks");
    expect(
      containsPrivateFieldName({ lockbox_info: "1234#" })
    ).toBe("lockbox_info");
  });

  it("flags nested private keys", () => {
    expect(
      containsPrivateFieldName({
        listing: { showing_instructions: "by appt" },
      })
    ).toBe("showing_instructions");
  });

  it("returns null for a clean public payload", () => {
    expect(
      containsPrivateFieldName({
        ok: true,
        items: [
          { id: "1", city: "Wilson", list_price: 250000 },
          { id: "2", city: "Wilson", list_price: 320000 },
        ],
      })
    ).toBeNull();
  });

  it("handles arrays without crashing", () => {
    expect(
      containsPrivateFieldName({
        items: [{ id: "x" }, { compensation: "2.5%" }],
      })
    ).toBe("compensation");
  });

  it("handles null/undefined safely", () => {
    expect(containsPrivateFieldName(null)).toBeNull();
    expect(containsPrivateFieldName(undefined)).toBeNull();
  });
});
