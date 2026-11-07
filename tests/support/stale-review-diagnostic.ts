// Opt-in passive observation of the original serial case. Not a permission,
// SQL-result mock, retry, delay, reload, timeout change or release gate.
import { createHash } from "node:crypto";
import { appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Page, Request } from "@playwright/test";

const enabled = process.env.AMM_STALE_REVIEW_DIAGNOSTIC === "1";
const directory = process.env.AMM_SESSION_ARTIFACT_DIR || "";
function clean(value: string) {
  for (const name of ["DATABASE_URL", "BETTER_AUTH_SECRET", "AMM_E2E_FIXTURE_PASSWORD", "AMM_E2E_TWILIO_TOKEN"]) {
    const secret = process.env[name];
    if (secret) value = value.replaceAll(secret, `[REDACTED:${name}]`);
  }
  return value.replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, "[REDACTED:connection]");
}
export function staleReviewNote(stage: string, value: unknown) {
  if (!enabled) return;
  appendFileSync(join(directory, "stale-review-test.jsonl"), clean(JSON.stringify({ at: new Date().toISOString(), stage, value })) + "\n", { mode: 0o600 });
}
export function staleReviewSql(query: string, params: unknown[], rows: unknown[]) {
  if (enabled && /(?:FROM|UPDATE) tasks\b/i.test(query)) staleReviewNote("test_sql", { query, params, rows });
}
export function staleReviewServerInputs(body: string) {
  const groups: Array<Record<string, string | number>> = [];
  let group: Record<string, string | number> = {};
  for (const match of body.matchAll(/"name":"(action_id|lead_id|task_id|record_version|review_version)"[^}]*?"value":("(?:\\.|[^"\\])*"|\d+)/g)) {
    if (!groups.length || match[1] === "action_id" || (match[1] === "lead_id" && group.lead_id !== undefined)) { group = {}; groups.push(group); }
    group[match[1]] = JSON.parse(match[2]);
  }
  return groups;
}
export async function observeStaleReview(page: Page, leadId: string) {
  if (!enabled) return { finish: async () => {} };
  if (process.env.AMM_ISOLATED_SESSION_ACCEPTANCE !== "1" || process.env.VERCEL_ENV !== "development" || !directory) throw new Error("isolated_diagnostic_only");
  const pending: Promise<unknown>[] = [];
  const requests = new WeakMap<Request, number>();
  let sequence = 0;
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname !== "/admin/today") return;
    const id = ++sequence;
    requests.set(request, id);
    const payload = request.postData() || "";
    staleReviewNote("request", { id, method: request.method(), path: url.pathname,
      rsc: request.headers()["rsc"] || null, action: Boolean(request.headers()["next-action"]),
      payloadSha256: createHash("sha256").update(payload).digest("hex"),
      includesLead: payload.includes(leadId),
      // Only concurrency/identity fields, never the full action wire or headers.
      formFields: [...payload.matchAll(/name="(?:\d+_)?(lead_id|action_id|record_version|response_mode)"\r?\n\r?\n([^\r\n]*)/g)].map(m => ({ name:m[1],value:m[2] })),
    });
  });
  page.on("requestfailed", request => {
    if (requests.has(request)) staleReviewNote("request_failed", { id: requests.get(request), error: request.failure()?.errorText });
  });
  page.on("response", response => {
    const id = requests.get(response.request());
    if (!id) return;
    const work = (async () => {
      const body = await response.text();
      const headers = response.headers();
      staleReviewNote("response", { id, status: response.status(),
        metadata: Object.fromEntries(["content-type","cache-control","vary","x-nextjs-cache","x-nextjs-stale-time"].map(name => [name,headers[name] || null])),
        bodySha256: createHash("sha256").update(body).digest("hex"), bytes: Buffer.byteLength(body),
        serverForms: staleReviewServerInputs(body), staleActionResult: /"error":"stale_action"/.test(body),
      });
    })().catch(error => staleReviewNote("response_capture_failed", { id, error: String(error) }));
    pending.push(work);
  });
  page.on("pageerror", error => staleReviewNote("page_error", { message:error.message }));
  page.on("console", message => { if (message.type() === "error" || message.type() === "warning") staleReviewNote("console", { type:message.type(),text:message.text() }); });
  await page.addInitScript(({ leadId }) => {
    const observations: unknown[] = [];
    let last = "";
    const state = window as typeof window & { __ammStaleReview?: unknown[] };
    state.__ammStaleReview = observations;
    function snapshot(trigger: string) {
      const forms = Array.from(document.querySelectorAll("form")).flatMap((form, index) => {
        const input = (name: string) => form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
        if (input("lead_id")?.value !== leadId) return [];
        const version = input("record_version");
        const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
        return [{ index, label:form.getAttribute("aria-label"),lead:input("lead_id")?.value,action:input("action_id")?.value,
          value:version?.value,defaultValue:version?.defaultValue,attribute:version?.getAttribute("value"),
          submitDisabled:submit?.disabled,fieldsetDisabled:form.querySelector("fieldset")?.disabled,
          alert:form.querySelector('[role="alert"]')?.textContent,
          reviewPresent:Array.from(form.querySelectorAll("button")).some(b => b.textContent === "Review latest record (keep draft)"),
        }];
      });
      const serialized = JSON.stringify(forms);
      if (serialized === last && trigger === "mutation") return;
      last = serialized;
      if (observations.length < 500) observations.push({ at:Date.now(),monotonic:performance.now(),trigger,forms });
    }
    new MutationObserver(() => snapshot("mutation")).observe(document, { subtree:true,childList:true,attributes:true,attributeFilter:["value","disabled","aria-busy"] });
    document.addEventListener("click", event => {
      if (event.target instanceof Element && event.target.closest("button")?.textContent === "Review latest record (keep draft)") snapshot("review_click");
    }, { capture:true,passive:true });
    document.addEventListener("submit", () => snapshot("submit"), { capture:true,passive:true });
  }, { leadId });
  return { finish: async () => {
    try {
      const events = await page.evaluate(() => (window as typeof window & { __ammStaleReview?: unknown[] }).__ammStaleReview || []);
      writeFileSync(join(directory,"stale-review-dom.json"),clean(JSON.stringify(events,null,2)),{mode:0o600});
      await page.screenshot({ path:join(directory,"stale-review-final.png"),fullPage:true });
    } catch (error) { staleReviewNote("dom_capture_failed", { error:String(error) }); }
    finally { await Promise.allSettled(pending); }
  } };
}
