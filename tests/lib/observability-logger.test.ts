import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { scrubPii, createLogger } from "@/lib/observability/logger";

describe("scrubPii", () => {
  it("passes through non-PII fields unchanged", () => {
    const input = { leadId: "abc-123", status: "new", score: 72 };
    expect(scrubPii(input)).toEqual(input);
  });

  it("redacts email", () => {
    const result = scrubPii({ email: "test@example.com", leadId: "x" }) as Record<string, unknown>;
    expect(result.email).toBe("[redacted]");
    expect(result.leadId).toBe("x");
  });

  it("redacts phone", () => {
    const result = scrubPii({ phone: "555-1234" }) as Record<string, unknown>;
    expect(result.phone).toBe("[redacted]");
  });

  it("redacts address, firstName, lastName, name", () => {
    const result = scrubPii({
      address: "123 Main St",
      firstName: "John",
      lastName: "Doe",
      name: "John Doe",
      event: "lead.created",
    }) as Record<string, unknown>;
    expect(result.address).toBe("[redacted]");
    expect(result.firstName).toBe("[redacted]");
    expect(result.lastName).toBe("[redacted]");
    expect(result.name).toBe("[redacted]");
    expect(result.event).toBe("lead.created");
  });

  it("redacts nested PII fields", () => {
    const result = scrubPii({ lead: { email: "x@y.com", score: 80 } }) as Record<string, unknown>;
    const lead = result.lead as Record<string, unknown>;
    expect(lead.email).toBe("[redacted]");
    expect(lead.score).toBe(80);
  });

  it("handles arrays — scrubs object elements", () => {
    const result = scrubPii([{ email: "a@b.com" }, { score: 5 }]) as unknown[];
    expect((result[0] as Record<string, unknown>).email).toBe("[redacted]");
    expect((result[1] as Record<string, unknown>).score).toBe(5);
  });

  it("passes through primitives unchanged", () => {
    expect(scrubPii("hello")).toBe("hello");
    expect(scrubPii(42)).toBe(42);
    expect(scrubPii(null)).toBe(null);
    expect(scrubPii(true)).toBe(true);
  });
});

describe("createLogger", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits info via console.log with JSON structure", () => {
    const log = createLogger("test-module");
    log.info("lead.scored", { leadId: "abc", score: 72 });
    expect(infoSpy).toHaveBeenCalledOnce();
    const entry = JSON.parse(infoSpy.mock.calls[0][0] as string);
    expect(entry.level).toBe("info");
    expect(entry.context).toBe("test-module");
    expect(entry.event).toBe("lead.scored");
    expect(entry.leadId).toBe("abc");
    expect(entry.score).toBe(72);
  });

  it("emits warn via console.warn", () => {
    const log = createLogger("test-module");
    log.warn("rate_limit.near_limit", { remaining: 1 });
    expect(warnSpy).toHaveBeenCalledOnce();
    const entry = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(entry.level).toBe("warn");
    expect(entry.remaining).toBe(1);
  });

  it("emits error via console.error", () => {
    const log = createLogger("sms-inbound");
    log.error("messages.insert_failed", { code: "PGRST" });
    expect(errorSpy).toHaveBeenCalledOnce();
    const entry = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(entry.level).toBe("error");
    expect(entry.context).toBe("sms-inbound");
    expect(entry.event).toBe("messages.insert_failed");
  });

  it("scrubs PII from meta before logging", () => {
    const log = createLogger("intake");
    log.info("lead.captured", { email: "test@test.com", score: 80, leadId: "xyz" });
    const entry = JSON.parse(infoSpy.mock.calls[0][0] as string);
    expect(entry.email).toBe("[redacted]");
    expect(entry.score).toBe(80);
    expect(entry.leadId).toBe("xyz");
  });

  it("includes a ts timestamp field", () => {
    const log = createLogger("x");
    log.info("test.event");
    const entry = JSON.parse(infoSpy.mock.calls[0][0] as string);
    expect(typeof entry.ts).toBe("string");
    expect(entry.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
