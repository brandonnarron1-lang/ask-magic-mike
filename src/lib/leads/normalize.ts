/**
 * Lead normalization helpers.
 *
 * Outputs are deterministic and case-stable so they can be used as
 * dedup keys against the new `leads.normalized_*` columns.
 */
import { normalizeToE164, isValidE164 } from "@/lib/utils/phone";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Disposable / throwaway domains that depress lead quality. Extend over time. */
export const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "tempmail.net",
  "tempmail.org",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "trashmail.com",
  "throwawaymail.com",
  "fakeinbox.com",
  "getnada.com",
  "dispostable.com",
  "maildrop.cc",
]);

export interface NormalizedEmail {
  raw: string;
  normalized: string | null;
  valid: boolean;
  disposable: boolean;
  domain: string | null;
}

export function normalizeEmail(raw: string | null | undefined): NormalizedEmail {
  if (!raw) {
    return { raw: "", normalized: null, valid: false, disposable: false, domain: null };
  }
  const trimmed = raw.trim();
  const lowered = trimmed.toLowerCase();
  const valid = EMAIL_REGEX.test(lowered);
  const domain = valid ? lowered.split("@")[1] : null;
  const disposable = !!domain && DISPOSABLE_DOMAINS.has(domain);
  return {
    raw: trimmed,
    normalized: valid ? lowered : null,
    valid,
    disposable,
    domain,
  };
}

export interface NormalizedPhone {
  raw: string;
  e164: string | null;
  digits: string;
  valid: boolean;
}

export function normalizePhone(raw: string | null | undefined): NormalizedPhone {
  if (!raw) {
    return { raw: "", e164: null, digits: "", valid: false };
  }
  const trimmed = raw.trim();
  const e164 = normalizeToE164(trimmed);
  const digits = trimmed.replace(/\D/g, "");
  return {
    raw: trimmed,
    e164,
    digits,
    valid: !!e164 && isValidE164(e164),
  };
}

export interface NormalizedAddress {
  raw: string;
  normalized: string | null;
  /** Lower-cased, stripped of punctuation, with common abbreviations expanded.
   *  Used purely for dedup matching — never re-displayed to users. */
  fingerprint: string | null;
}

const STREET_ABBREV_EXPAND: Record<string, string> = {
  st: "street",
  str: "street",
  rd: "road",
  ave: "avenue",
  av: "avenue",
  blvd: "boulevard",
  dr: "drive",
  ln: "lane",
  ct: "court",
  pl: "place",
  pkwy: "parkway",
  ter: "terrace",
  trl: "trail",
  hwy: "highway",
  cir: "circle",
  sq: "square",
  ne: "northeast",
  nw: "northwest",
  se: "southeast",
  sw: "southwest",
  n: "north",
  s: "south",
  e: "east",
  w: "west",
};

const UNIT_PATTERNS = [
  /\b(apt|apartment|unit|suite|ste|#)\s*[a-z0-9-]+/gi,
];

export function normalizeAddress(
  raw: string | null | undefined
): NormalizedAddress {
  if (!raw) return { raw: "", normalized: null, fingerprint: null };
  const trimmed = raw.trim();
  if (!trimmed) return { raw: "", normalized: null, fingerprint: null };

  // 1) lower, strip punctuation, collapse whitespace
  const cleaned = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9\s#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 2) strip unit indicators for the fingerprint, but keep them in `normalized`
  let withoutUnit = cleaned;
  for (const rx of UNIT_PATTERNS) withoutUnit = withoutUnit.replace(rx, " ");
  withoutUnit = withoutUnit.replace(/\s+/g, " ").trim();

  // 3) expand abbreviations in the fingerprint
  const fpTokens = withoutUnit.split(" ").map((t) => {
    const stripped = t.replace(/[.,]/g, "");
    return STREET_ABBREV_EXPAND[stripped] ?? stripped;
  });

  return {
    raw: trimmed,
    normalized: cleaned || null,
    fingerprint: fpTokens.join(" ") || null,
  };
}

/** Convenience: produce all three normalized fields for a lead row. */
export interface NormalizedLeadIdentity {
  email: NormalizedEmail;
  phone: NormalizedPhone;
  address: NormalizedAddress;
}

export function normalizeLeadIdentity(input: {
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}): NormalizedLeadIdentity {
  return {
    email: normalizeEmail(input.email),
    phone: normalizePhone(input.phone),
    address: normalizeAddress(input.address),
  };
}
