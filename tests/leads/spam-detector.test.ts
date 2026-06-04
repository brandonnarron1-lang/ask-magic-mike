import { describe, expect, it } from "vitest";
import {
  scoreSpam,
  SPAM_REJECT_THRESHOLD,
  SPAM_SUSPECT_THRESHOLD,
} from "@/lib/leads/spam-detector";

describe("scoreSpam", () => {
  it("scores clean leads at 0", () => {
    const r = scoreSpam({
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "+12525551234",
      question: "What is my home worth in Wilson, NC?",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
    });
    expect(r.score).toBe(0);
    expect(r.isReject).toBe(false);
    expect(r.isSuspect).toBe(false);
  });

  it("rejects when the honeypot field is filled", () => {
    const r = scoreSpam({
      name: "Jane",
      email: "jane@example.com",
      honeypot: "I am a bot",
    });
    expect(r.isReject).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(SPAM_REJECT_THRESHOLD);
  });

  it("flags submissions under 1.5s as suspect", () => {
    const now = Date.now();
    const r = scoreSpam({
      name: "Jane",
      email: "jane@example.com",
      formStartedAtMs: now - 400,
      submittedAtMs: now,
    });
    expect(r.reasons.some((x) => x.code === "form_submit_too_fast")).toBe(true);
  });

  it("flags URLs inside the question body", () => {
    const r = scoreSpam({
      email: "jane@example.com",
      question: "Visit https://spam.example for cheap deals",
    });
    expect(r.reasons.some((x) => x.code === "url_in_message")).toBe(true);
  });

  it("flags disposable email domains", () => {
    const r = scoreSpam({
      email: "burner@mailinator.com",
      question: "hi",
    });
    expect(r.reasons.some((x) => x.code === "disposable_email")).toBe(true);
  });

  it("flags bot user agents", () => {
    const r = scoreSpam({
      email: "jane@example.com",
      userAgent: "python-requests/2.31",
    });
    expect(r.reasons.some((x) => x.code === "bot_user_agent")).toBe(true);
  });

  it("combines signals to push into suspect territory", () => {
    const r = scoreSpam({
      email: "jane@mailinator.com",
      question: "Click https://spam.example/now",
      userAgent: "curl/8.0",
    });
    expect(r.score).toBeGreaterThanOrEqual(SPAM_SUSPECT_THRESHOLD);
  });
});
