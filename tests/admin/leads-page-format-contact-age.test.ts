import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { formatContactAge } from "../../src/lib/admin/lead-contact-format";

describe("formatContactAge", () => {
  const NOW = new Date("2026-06-26T12:00:00Z").getTime();

  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 'never' for null", () => {
    expect(formatContactAge(null)).toBe("never");
  });

  it("returns 'just now' for contact less than 1 minute ago", () => {
    const iso = new Date(NOW - 30_000).toISOString();
    expect(formatContactAge(iso)).toBe("just now");
  });

  it("returns minutes ago for contact within the last hour", () => {
    const iso = new Date(NOW - 15 * 60_000).toISOString();
    expect(formatContactAge(iso)).toBe("15m ago");
  });

  it("returns hours ago for contact within the last 24h", () => {
    const iso = new Date(NOW - 3 * 60 * 60_000).toISOString();
    expect(formatContactAge(iso)).toBe("3h ago");
  });

  it("returns days ago for contact older than 24h", () => {
    const iso = new Date(NOW - 2 * 24 * 60 * 60_000).toISOString();
    expect(formatContactAge(iso)).toBe("2d ago");
  });

  it("returns 'just now' for a future timestamp", () => {
    const iso = new Date(NOW + 5_000).toISOString();
    expect(formatContactAge(iso)).toBe("just now");
  });
});
