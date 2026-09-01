import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/../app/api/chat/route";

describe("POST /api/chat secure public boundary", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalOpenAiKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    if (originalDatabaseUrl) process.env.DATABASE_URL = originalDatabaseUrl;
    else delete process.env.DATABASE_URL;
    if (originalOpenAiKey) process.env.OPENAI_API_KEY = originalOpenAiKey;
    else delete process.env.OPENAI_API_KEY;
  });

  it("rejects an unapproved browser origin", async () => {
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://evil.invalid", "x-forwarded-for": "203.0.113.20" },
      body: JSON.stringify({ message: "Hello" }),
    }));
    expect(response.status).toBe(403);
  });

  it("rejects oversized messages before provider use", async () => {
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://www.askmagicmike.com", "x-forwarded-for": "203.0.113.21" },
      body: JSON.stringify({ message: "x".repeat(2_001) }),
    }));
    expect(response.status).toBe(413);
  });

  it("stream-bounds the entire request when Content-Length is absent", async () => {
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://www.askmagicmike.com", "x-forwarded-for": "203.0.113.23" },
      body: JSON.stringify({ message: "Hello", ignored_padding: "x".repeat(8_192) }),
    }));
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ error: "Message is too large." });
  });

  it("returns the safe local fallback with a correlation ID when AI is disabled", async () => {
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://www.askmagicmike.com", "x-forwarded-for": "203.0.113.22" },
      body: JSON.stringify({ message: "How should I prepare to sell?" }),
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toContain("address-specific guidance");
    expect(body.correlation_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
