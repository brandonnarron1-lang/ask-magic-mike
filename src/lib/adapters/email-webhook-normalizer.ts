/**
 * Email provider webhook normalizer.
 *
 * Each provider ships a slightly different envelope. This module accepts
 * any of the supported shapes and returns a canonical
 * `NormalizedEmailEvent` so the route handler does not branch per
 * provider.
 *
 * Supported:
 *   - resend   (Resend.com — { type, data: { id, email, ... } })
 *   - sendgrid (single-event objects, batched in arrays)
 *   - postmark (Postmark — { RecordType, MessageID, Email, ... })
 *   - mock     (our own simple { event, message_id, email })
 *
 * Output:
 *   { provider, eventType, providerMessageId, email, timestamp, raw }
 *
 * Event types we care about: delivered, opened, clicked, bounced,
 * complained, unsubscribed, failed, unknown.
 */

export type EmailEventType =
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "unsubscribed"
  | "failed"
  | "unknown";

export type EmailProvider = "resend" | "sendgrid" | "postmark" | "mock";

export interface NormalizedEmailEvent {
  provider: EmailProvider;
  eventType: EmailEventType;
  providerMessageId: string | null;
  email: string | null;
  timestamp: string;
  raw: unknown;
}

/** Map a raw event-name string to our enum. Returns "unknown" for misses. */
function classify(raw: string | undefined | null): EmailEventType {
  if (!raw) return "unknown";
  const v = raw.toLowerCase();
  if (v.includes("deliver")) return "delivered";
  if (v.includes("open")) return "opened";
  if (v.includes("click")) return "clicked";
  if (v.includes("bounce")) return "bounced";
  if (v.includes("complain") || v.includes("spam")) return "complained";
  if (v.includes("unsub") || v.includes("opt-out") || v.includes("opt_out"))
    return "unsubscribed";
  if (v.includes("fail") || v.includes("dropped")) return "failed";
  return "unknown";
}

function asString(v: unknown): string | null {
  if (typeof v === "string" && v.length > 0) return v;
  return null;
}

function getPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = obj;
  for (const seg of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = cur[seg];
  }
  return cur;
}

/** Detect provider from envelope shape. */
export function detectProvider(payload: unknown): EmailProvider {
  if (!payload || typeof payload !== "object") return "mock";
  const obj = payload as Record<string, unknown>;
  if ("RecordType" in obj || "MessageID" in obj || "MessageStream" in obj) {
    return "postmark";
  }
  if ("type" in obj && "data" in obj) {
    // Resend uses { type: "email.delivered", data: {...} }.
    if (
      typeof obj.type === "string" &&
      (obj.type as string).startsWith("email.")
    ) {
      return "resend";
    }
  }
  // Mock shape: explicit { event, message_id, ... }. Check BEFORE
  // SendGrid so a mock payload that happens to include `email` isn't
  // misclassified.
  if ("event" in obj && "message_id" in obj) return "mock";
  // SendGrid requires one of its distinctive `sg_*` fields.
  if ("event" in obj && ("sg_event_id" in obj || "sg_message_id" in obj)) {
    return "sendgrid";
  }
  return "mock";
}

/** Normalize a single event payload. */
export function normalizeEmailEvent(payload: unknown): NormalizedEmailEvent {
  const provider = detectProvider(payload);
  const now = new Date().toISOString();

  switch (provider) {
    case "resend": {
      const type = asString(getPath(payload, "type"));
      // Resend strips the "email." prefix when classifying.
      const eventType = classify(type?.replace(/^email\./, "") ?? undefined);
      return {
        provider,
        eventType,
        providerMessageId:
          asString(getPath(payload, "data.email_id")) ??
          asString(getPath(payload, "data.id")) ??
          null,
        email:
          asString(getPath(payload, "data.to.0")) ??
          asString(getPath(payload, "data.to")) ??
          asString(getPath(payload, "data.email")) ??
          null,
        timestamp:
          asString(getPath(payload, "created_at")) ??
          asString(getPath(payload, "data.created_at")) ??
          now,
        raw: payload,
      };
    }
    case "sendgrid": {
      return {
        provider,
        eventType: classify(asString(getPath(payload, "event"))),
        providerMessageId:
          asString(getPath(payload, "sg_message_id")) ??
          asString(getPath(payload, "smtp-id")) ??
          null,
        email: asString(getPath(payload, "email")),
        timestamp:
          asString(getPath(payload, "timestamp")) ??
          now,
        raw: payload,
      };
    }
    case "postmark": {
      return {
        provider,
        eventType: classify(asString(getPath(payload, "RecordType"))),
        providerMessageId: asString(getPath(payload, "MessageID")),
        email:
          asString(getPath(payload, "Recipient")) ??
          asString(getPath(payload, "Email")) ??
          null,
        timestamp:
          asString(getPath(payload, "ReceivedAt")) ??
          asString(getPath(payload, "Timestamp")) ??
          now,
        raw: payload,
      };
    }
    case "mock":
    default:
      return {
        provider: "mock",
        eventType: classify(
          asString(getPath(payload, "event")) ??
            asString(getPath(payload, "type")) ??
            asString(getPath(payload, "event_type"))
        ),
        providerMessageId:
          asString(getPath(payload, "message_id")) ??
          asString(getPath(payload, "id")) ??
          asString(getPath(payload, "provider_message_id")),
        email: asString(getPath(payload, "email")),
        timestamp:
          asString(getPath(payload, "timestamp")) ?? now,
        raw: payload,
      };
  }
}
