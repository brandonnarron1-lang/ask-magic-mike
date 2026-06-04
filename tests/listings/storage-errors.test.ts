import { describe, expect, it } from "vitest";
import { isRecoverableListingStorageError } from "@/lib/listings/storage-errors";

describe("isRecoverableListingStorageError", () => {
  it("flags the production missing-table message", () => {
    // Exact shape returned by production today.
    expect(
      isRecoverableListingStorageError({
        message: "Could not find the table 'public.listings' in the schema cache",
      })
    ).toBe(true);
  });

  it("flags PostgREST schema-cache codes", () => {
    expect(isRecoverableListingStorageError({ code: "PGRST205" })).toBe(true);
    expect(isRecoverableListingStorageError({ code: "PGRST204" })).toBe(true);
  });

  it("flags raw Postgres undefined_table / undefined_column codes", () => {
    expect(isRecoverableListingStorageError({ code: "42P01" })).toBe(true);
    expect(isRecoverableListingStorageError({ code: "42703" })).toBe(true);
  });

  it("flags raw Postgres relation/column does-not-exist messages", () => {
    expect(
      isRecoverableListingStorageError({
        message: 'relation "public.listings" does not exist',
      })
    ).toBe(true);
    expect(
      isRecoverableListingStorageError({
        message: 'column "beds" does not exist',
      })
    ).toBe(true);
  });

  it("flags a misconfigured admin client (thrown Error)", () => {
    expect(
      isRecoverableListingStorageError(
        new Error(
          "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for admin operations."
        )
      )
    ).toBe(true);
  });

  it("does NOT flag genuine server faults", () => {
    expect(isRecoverableListingStorageError({ code: "PGRST301" })).toBe(false);
    expect(
      isRecoverableListingStorageError({
        code: "57014",
        message: "canceling statement due to statement timeout",
      })
    ).toBe(false);
    expect(
      isRecoverableListingStorageError(new Error("connection refused"))
    ).toBe(false);
  });

  it("does NOT flag empty / nullish input", () => {
    expect(isRecoverableListingStorageError(null)).toBe(false);
    expect(isRecoverableListingStorageError(undefined)).toBe(false);
    expect(isRecoverableListingStorageError({})).toBe(false);
    expect(isRecoverableListingStorageError("")).toBe(false);
  });
});
