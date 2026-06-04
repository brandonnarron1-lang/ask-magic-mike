/**
 * Spam / bot detection.
 *
 * Heuristic scorer that runs inline at lead capture. Output is 0–100
 * (higher = more likely spam) plus a reason list that lands in the
 * `leads.spam_reasons` JSONB column for audit.
 *
 * A score >= 70 should reject the lead outright; 40–69 should mark it as
 * `is_spam_suspect` and skip auto-sends; < 40 is treated as fine.
 */
import { normalizeLeadIdentity } from "./normalize";

export interface SpamCandidate {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  question?: string | null;
  userAgent?: string | null;
  honeypot?: string | null;
  /** Time the form started rendering, in ms epoch. If submission happens
   *  in < 1.5 s we count that as bot-fast. */
  formStartedAtMs?: number | null;
  /** Submission timestamp. Defaults to Date.now(). */
  submittedAtMs?: number | null;
}

export interface SpamScore {
  score: number;
  reasons: Array<{ code: string; points: number; label: string }>;
  isReject: boolean;
  isSuspect: boolean;
}

export const SPAM_REJECT_THRESHOLD = 70;
export const SPAM_SUSPECT_THRESHOLD = 40;

const URL_REGEX = /\b(?:https?:\/\/|www\.)\S+/i;
const REPEATED_CHAR_REGEX = /(.)\1{5,}/;
const COMMON_BOT_UA = /(curl|wget|python-requests|java|httpclient|scrapy|bot|spider)/i;

export function scoreSpam(candidate: SpamCandidate): SpamScore {
  const reasons: SpamScore["reasons"] = [];
  let score = 0;

  // 1) Honeypot field — should always be empty.
  if (candidate.honeypot && candidate.honeypot.trim() !== "") {
    score += 80;
    reasons.push({ code: "honeypot_filled", points: 80, label: "Honeypot filled" });
  }

  // 2) Form submitted suspiciously fast (< 1.5s after render).
  const submittedAt = candidate.submittedAtMs ?? Date.now();
  if (
    candidate.formStartedAtMs &&
    submittedAt - candidate.formStartedAtMs < 1500
  ) {
    score += 35;
    reasons.push({
      code: "form_submit_too_fast",
      points: 35,
      label: "Submitted in under 1.5 seconds",
    });
  }

  // 3) Question/body contains URLs (classic spam vector).
  if (candidate.question && URL_REGEX.test(candidate.question)) {
    score += 25;
    reasons.push({
      code: "url_in_message",
      points: 25,
      label: "Free-text contains a URL",
    });
  }

  // 4) Repeated-character spam (aaaaaaa…).
  if (
    (candidate.name && REPEATED_CHAR_REGEX.test(candidate.name)) ||
    (candidate.question && REPEATED_CHAR_REGEX.test(candidate.question))
  ) {
    score += 20;
    reasons.push({
      code: "repeated_chars",
      points: 20,
      label: "Repeated character spam pattern",
    });
  }

  // 5) Common bot user agents.
  if (candidate.userAgent && COMMON_BOT_UA.test(candidate.userAgent)) {
    score += 30;
    reasons.push({
      code: "bot_user_agent",
      points: 30,
      label: "User agent looks like a bot",
    });
  }

  // 6) Email + phone validity / disposability.
  const ids = normalizeLeadIdentity({
    email: candidate.email,
    phone: candidate.phone,
    address: candidate.address,
  });

  if (candidate.email && !ids.email.valid) {
    score += 15;
    reasons.push({
      code: "invalid_email",
      points: 15,
      label: "Email is not valid",
    });
  }
  if (ids.email.disposable) {
    score += 25;
    reasons.push({
      code: "disposable_email",
      points: 25,
      label: `Disposable email domain (${ids.email.domain ?? "?"})`,
    });
  }
  if (candidate.phone && !ids.phone.valid) {
    score += 10;
    reasons.push({
      code: "invalid_phone",
      points: 10,
      label: "Phone is not valid E.164",
    });
  }

  // 7) Name looks like one all-caps blob with no spaces (e.g. ZJTHXKMPQR).
  if (
    candidate.name &&
    candidate.name.length >= 5 &&
    /^[A-Z]+$/.test(candidate.name) &&
    !/\s/.test(candidate.name)
  ) {
    score += 15;
    reasons.push({
      code: "name_looks_random",
      points: 15,
      label: "Name is all-caps with no spaces",
    });
  }

  score = Math.min(score, 100);

  return {
    score,
    reasons,
    isReject: score >= SPAM_REJECT_THRESHOLD,
    isSuspect: score >= SPAM_SUSPECT_THRESHOLD && score < SPAM_REJECT_THRESHOLD,
  };
}
