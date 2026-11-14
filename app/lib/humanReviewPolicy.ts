/** Server-authored review objectives, not staff presence, calendar availability,
 * contact permission or a reminder scheduler. Retain old versions on revision. */
export type CoverageException = { day: string; windows: Array<[number, number]>; reason: "holiday" | "vacation" | "no_staff" | "reduced_coverage" };
export type ReviewPolicy = { version: string; timezone: "America/New_York"; minutes: number; exceptions: CoverageException[] };
export const HUMAN_REVIEW_POLICY: ReviewPolicy = {
  version: "amm.human-review.v1", timezone: "America/New_York", minutes: 5,
  // No holiday or actual staff absence is inferred. Changes require server-side
  // review; [] windows explicitly closes that local day. No visitor override.
  exceptions: [],
};
export type SavedReviewObjective = { policyVersion: string; timezone: "America/New_York"; acceptedAt: string; targetAt: string };
const MINUTE = 60_000;
const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
const clockFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
function localDay(at: number) { return dayFormat.format(new Date(at)); }
function nextDay(day: string) { return new Date(Date.parse(`${day}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10); }
function validDay(day: string) { return /^20\d{2}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(`${day}T12:00:00Z`)) && new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) === day; }
function validate(policy: ReviewPolicy) {
  if (!policy.version || policy.timezone !== "America/New_York" || policy.minutes !== 5 || policy.exceptions.length > 366) throw Error("invalid_review_policy");
  const seen = new Set<string>();
  for (const e of policy.exceptions) {
    if (!validDay(e.day) || seen.has(e.day) || !["holiday", "vacation", "no_staff", "reduced_coverage"].includes(e.reason)) throw Error("invalid_review_exception");
    seen.add(e.day);
    let end = 480;
    for (const [a,b] of e.windows) {
      // Exceptions only reduce the ordinary 08–20 window. These local times
      // cannot land in the repeated/missing DST transition hour.
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < end || b <= a || b > 1200) throw Error("invalid_review_exception");
      end = b;
    }
  }
}
function instant(day: string, minute: number) {
  const noon = Date.parse(`${day}T12:00:00Z`);
  const parts = clockFormat.format(new Date(noon)).split(":").map(Number);
  return noon + (minute - (parts[0]*60+parts[1])) * MINUTE;
}
function windows(day: string, policy: ReviewPolicy): Array<[number, number]> {
  const e = policy.exceptions.find(e => e.day === day);
  return (e ? e.windows : [[480,1200]]).map(([a,b]) => [instant(day,a),instant(day,b)]);
}
export function reviewTarget(acceptedAt: string, policy = HUMAN_REVIEW_POLICY): string {
  validate(policy);
  const start = Date.parse(acceptedAt);
  if (!Number.isFinite(start)) throw Error("invalid_review_instant");
  let remaining = policy.minutes * MINUTE, day = localDay(start);
  for (let i=0;i<368;i++,day=nextDay(day)) {
    for (const [open,close] of windows(day,policy)) {
      const from = Math.max(start,open), available = Math.max(0,close-from);
      if (available >= remaining) return new Date(from+remaining).toISOString();
      remaining -= available;
    }
  }
  throw Error("review_coverage_unavailable");
}
export function coveredWait(acceptedAt: string, observedAt: string, policy = HUMAN_REVIEW_POLICY): number | null {
  validate(policy);
  const start = Date.parse(acceptedAt), end = Date.parse(observedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  let day=localDay(start), total=0;
  // Bounded reporting. Older cohorts remain unknown rather than blocking a view.
  for (let i=0;i<367;i++,day=nextDay(day)) {
    for (const [open,close] of windows(day,policy)) total += Math.max(0,Math.min(end,close)-Math.max(start,open));
    if (day===localDay(end)) return total/MINUTE;
  }
  return null;
}
/** Called only after ingress/consent validation. Atomic capture stores this
 * metadata on its existing primary internal intent; retries never amend it. */
export function newReviewObjective(acceptedAt: string): SavedReviewObjective {
  return { policyVersion: HUMAN_REVIEW_POLICY.version, timezone: HUMAN_REVIEW_POLICY.timezone, acceptedAt, targetAt: reviewTarget(acceptedAt) };
}
export function savedReviewObjective(value: unknown): SavedReviewObjective | null {
  if (!value || typeof value !== "object") return null;
  const v=value as SavedReviewObjective;
  try {
    if (v.policyVersion !== HUMAN_REVIEW_POLICY.version || v.timezone !== HUMAN_REVIEW_POLICY.timezone || v.targetAt !== reviewTarget(v.acceptedAt)) return null;
    return {policyVersion:v.policyVersion,timezone:v.timezone,acceptedAt:v.acceptedAt,targetAt:v.targetAt};
  } catch { return null; }
}
export function publicReviewPolicy(now = new Date()) {
  const at=now.getTime(), day=localDay(at);
  const current=windows(day,HUMAN_REVIEW_POLICY);
  const inCoverage=current.some(([a,b])=>at>=a&&at<b);
  let nextOpening: string|null=null, d=day;
  for(let i=0;i<368&&!nextOpening;i++,d=nextDay(d)) {
    const next=windows(d,HUMAN_REVIEW_POLICY).find(([a,b])=>b>at);
    if(next) nextOpening=new Date(Math.max(at,next[0])).toISOString();
  }
  return {version:HUMAN_REVIEW_POLICY.version,timezone:HUMAN_REVIEW_POLICY.timezone,
    normalHours:"Daily 8 a.m.–8 p.m. Eastern, subject to coverage exceptions.",
    message:inCoverage ? "This is a normal human-review window, not confirmation that a person is online."
      : nextOpening ? `No immediate human connection is confirmed. The next review window begins ${new Intl.DateTimeFormat("en-US",{timeZone:HUMAN_REVIEW_POLICY.timezone,month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(new Date(nextOpening))}.`
      : "Human-review coverage is not currently established. Your request can still be stored for review.",
    observedAt:now.toISOString()};
}
