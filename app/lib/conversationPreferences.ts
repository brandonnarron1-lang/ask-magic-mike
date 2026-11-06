export type ConversationPreferences = {
  version: 1;
  channel: "no_preference" | "email" | "phone";
  day: string | null;
  window: "no_preference" | "morning" | "afternoon" | "evening";
  timezone: "America/New_York";
};
export const EMPTY_CONVERSATION_PREFERENCES: ConversationPreferences = {
  version: 1, channel: "no_preference", day: null, window: "no_preference", timezone: "America/New_York",
};
/** Calendar preference, not availability, consent, an instant, or a booking. */
export function parseConversationPreferences(value: unknown): ConversationPreferences | null {
  if (value === undefined) return { ...EMPTY_CONVERSATION_PREFERENCES };
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  if (Object.keys(p).sort().join() !== "channel,day,timezone,version,window" || p.version !== 1 ||
    p.timezone !== "America/New_York" || !["no_preference", "email", "phone"].includes(String(p.channel)) ||
    !["no_preference", "morning", "afternoon", "evening"].includes(String(p.window))) return null;
  if (p.day !== null && (typeof p.day !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(p.day) ||
    !Number.isFinite(Date.parse(`${p.day}T12:00:00Z`)) || new Date(`${p.day}T12:00:00Z`).toISOString().slice(0, 10) !== p.day)) return null;
  return p as ConversationPreferences;
}
export function conversationPreferenceLabel(p: ConversationPreferences) {
  return `${p.channel === "no_preference" ? "No channel preference" : p.channel === "phone" ? "Phone" : "Email"} · ${p.day || "No day preference"} · ${p.window === "no_preference" ? "No time preference" : p.window} · Eastern time`;
}
