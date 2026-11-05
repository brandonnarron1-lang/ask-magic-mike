"use client";
import { isBrowserAutomation } from "../browserAutomation";
import { readExternalAnalyticsConsent,isKnownQaAnalyticsContext } from "../externalAnalytics";
import { publicTrafficRoute, type TrafficEvidence } from "../trafficContract";

const VISIT = "amm_measured_visit_v1", BROWSER = "amm_measured_browser_v1";
const IDLE = 30 * 60_000, RETENTION = 90 * 24 * 60 * 60_000;
let navigation: { path: string; id: string } | null = null;
/** First-party cookieless counts do not require optional identity storage.
 * IDs are created/read only after the existing explicit analytics grant.
 * Neither ID is a canonical lead/session nor sent to third-party analytics. */
export function publicTrafficEvidence(providedEventId?: string): TrafficEvidence | null {
  if (typeof crypto.randomUUID !== "function") return null;
  const eventId = providedEventId ?? crypto.randomUUID();
  const route = publicTrafficRoute(window.location.pathname);
  if (!route || isBrowserAutomation() || !["askmagicmike.com", "www.askmagicmike.com"].includes(window.location.hostname)) return null;
  let stored:unknown=null,trafficClass:string|null=null;
  try {
    trafficClass=window.sessionStorage.getItem("amm_external_analytics_traffic_class");
    const raw=window.sessionStorage.getItem("amm_attribution");
    if(raw && raw.length<=8192) {try {stored=JSON.parse(raw);} catch { /* malformed source is unknown */ }}
    if (document.cookie.split(";").some(c => /^(?:__Secure-)?amm-lead-center[.]/.test(c.trim()))) return null;
  } catch { /* No session/cookie access is not permission for fingerprinting. */ }
  if(isKnownQaAnalyticsContext(window.location.search,stored,trafficClass)) return null;
  const context = window.parent !== window || ["/embed/ask", "/widget/v1"].includes(route) ? "embedded" : "top_level";
  const result: TrafficEvidence = { version: 1, eventId, route, context };
  if (readExternalAnalyticsConsent() !== "granted") {
    try { sessionStorage.removeItem(VISIT); localStorage.removeItem(BROWSER); } catch { /* optional storage */ }
    return result;
  }
  try {
    const now = Date.now();
    const read = (raw: string | null, ttl: number) => {
      try { const v = JSON.parse(raw || "null"); return v && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.id) && Number.isFinite(v.at) && now >= v.at && now-v.at < ttl ? v : null; } catch { return null; }
    };
    const visit = read(sessionStorage.getItem(VISIT), IDLE) || { id: crypto.randomUUID(), at: now };
    const browser = read(localStorage.getItem(BROWSER), RETENTION) || { id: crypto.randomUUID(), at: now };
    sessionStorage.setItem(VISIT, JSON.stringify({ ...visit, at: now }));
    localStorage.setItem(BROWSER, JSON.stringify(browser));
    result.visitId = visit.id; result.browserId = browser.id;
  } catch { /* A blocked store leaves countable events without identity. */ }
  return result;
}
/** One emission per pathname transition per document. Remount/StrictMode repeats
 * don't count; refresh is a new view; returning via SPA navigation is a new view.
 * Query/hash-only changes don't count. Full reloads never reuse page identities. */
export function claimPublicNavigation(path: string) {
  if (typeof crypto.randomUUID !== "function") return null;
  if (navigation?.path === path) return null;
  navigation = { path, id: crypto.randomUUID() };
  return navigation.id;
}
