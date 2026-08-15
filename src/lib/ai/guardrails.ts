const INJECTION_PATTERNS = [
  /ignore (all|any|the|your) (previous|prior|above) instructions?/i,
  /reveal (the )?(system|developer) prompt/i,
  /print (all )?(secrets|environment variables|api keys)/i,
  /bypass (consent|authorization|guardrails?|policy)/i,
  /send (an? )?(email|sms|message) without (approval|consent)/i,
  /act as (root|administrator|system)/i,
];

export function detectPromptInjection(value: string) {
  const matches = INJECTION_PATTERNS.filter((pattern) => pattern.test(value)).map((pattern) => pattern.source);
  return { blocked: matches.length > 0, matchedRules: matches };
}

export function redactLeadText(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL_REDACTED]")
    .replace(/\+?1?[\s.(-]*\d{3}[\s.)-]*\d{3}[\s.-]*\d{4}/g, "[PHONE_REDACTED]")
    .replace(/\b\d{1,6}\s+[A-Za-z0-9.' -]{2,45}\s(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Boulevard|Blvd|Highway|Hwy)\b/gi, "[ADDRESS_REDACTED]")
    .slice(0, 4_000);
}

export function delimitUntrusted(value: string) {
  return `<untrusted_lead_text>\n${value.replace(/<\/?untrusted_lead_text>/gi, "[TAG_REMOVED]")}\n</untrusted_lead_text>`;
}
