import {
  PUBLIC_KNOWLEDGE_VERSION, readPublicCitations, feedbackCategories, isRecord, isUuid, isRevision, isAnswerRef,
  type GroundedReply, type AnswerRef, type SourceRef, type FeedbackReceipt, type FeedbackCategory,
} from "./contracts";
import type { SecureStore } from "./localPlan";

type Path = "/api/chat/message" | "/api/intelligence/feedback" | `/api/intelligence/answers?id=${string}` | `/api/intelligence/feedback?answerId=${string}&revision=${number}`;
export interface NativeSessionAdapter {
  readonly audience: "consumer-or-guest";
  /** Main must verify first-party cookie/session + origin/CSRF handling on the
   * real QA runtime. Bound origin only; no redirects, logs, analytics, shared
   * staff cookies, URL credentials or model keys. Bound JSON size + deadline.
   * Do not set fake browser-origin headers to bypass a rejected native flow.
   */
  request(input: { origin: string; path: Path; method: "GET" | "POST"; body?: string }): Promise<{ status: number; body: unknown }>;
}
export type QaBinding = {
  origin: string; verificationReceipt: string;
  /** Random UUID per native consumer/guest session, NOT a user ID or token.
   * Change on logout/revocation/account switch; dispose the prior client. */
  localScopeId: string; session: NativeSessionAdapter;
} & ({ kind: "verified-isolated-qa" } | { kind: "verified-local-loopback"; platform: "ios" | "android"; expiresAt: number });
export type CurrentAnswer = GroundedReply & AnswerRef & { currentSourceValidity: "valid"; sourceRefs: SourceRef[] };
type Pending = AnswerRef & { requestId: string; kind: FeedbackReceipt["kind"]; category: FeedbackCategory | null; comment: "" };
type Journal = { version: 1; receipt: AnswerRef | null; pending: Pending | null };
type State = { answer: CurrentAnswer | null; receipt: AnswerRef | null; feedback: FeedbackReceipt[]; pending: Pending | null; validity: "unverified" | "valid" | "source_invalid"; notice: string };
const checkedText = (v: unknown, max: number): v is string => typeof v === "string" && !!v.trim() && v.length <= max;
const category = (v: unknown): v is FeedbackCategory => feedbackCategories.includes(v as FeedbackCategory);
const DEVICE_CLOCK_SKEW_MS = 120000; // Client display validation only; server expiry/authorization never changes.

function pendingValue(v: unknown): v is Pending {
  return isAnswerRef(v) && isRecord(v) && isUuid(v.requestId) && v.comment === "" &&
    Object.keys(v).length === 6 &&
    (v.kind === "report" ? category(v.category) : (v.kind === "helpful" || v.kind === "not_helpful") && v.category === null);
}
export function readCurrentAnswer(raw: unknown, reference?: AnswerRef): CurrentAnswer {
  if (!isRecord(raw) || !isAnswerRef(raw) || raw.currentSourceValidity !== "valid"
    || (reference && (raw.answerId !== reference.answerId || raw.revision !== reference.revision))) throw Error("Answer receipt unavailable or changed.");
  const reply = raw.reply ?? raw;
  if (!isRecord(reply) || reply.mode !== "approved_source" || !checkedText(reply.message, 6000) || !checkedText(reply.limitation, 2000)
    || !Array.isArray(reply.citations) || reply.citations.length < 1 || reply.citations.length > 3) throw Error("A supported cited answer is unavailable.");
  const citations = readPublicCitations(reply.citations);
  if (citations.length !== reply.citations.length || citations.some(c => !checkedText(c.id, 160) || !checkedText(c.title, 100) || !checkedText(c.version, 160))) throw Error("Citation validation failed.");
  const refs = reply.sourceRefs ?? raw.sourceRefs;
  if (!Array.isArray(refs) || refs.length < 1 || refs.length > 10 || refs.some(r => !isRecord(r) || !checkedText(r.sourceId, 80) || !isUuid(r.versionId) || !isRevision(r.revision))) throw Error("Source receipt validation failed.");
  return { answerId: raw.answerId, revision: raw.revision, currentSourceValidity: "valid", sourceRefs: refs.map(r => ({ sourceId: r.sourceId, versionId: r.versionId, revision: r.revision })),
    message: reply.message, mode: "approved_source", limitation: reply.limitation, citations };
}
export function readFeedback(raw: unknown, now: number): FeedbackReceipt {
  if (!isRecord(raw) || !isUuid(raw.id) || !isRevision(raw.revision) || !["open", "resolved"].includes(String(raw.status))
    || !(raw.kind === "report" ? category(raw.category) : (raw.kind === "helpful" || raw.kind === "not_helpful") && raw.category === null)
    || typeof raw.createdAt !== "string" || typeof raw.expiresAt !== "string"
    || !Number.isFinite(Date.parse(raw.createdAt)) || !Number.isFinite(Date.parse(raw.expiresAt))
    || Date.parse(raw.createdAt) > now + DEVICE_CLOCK_SKEW_MS || Date.parse(raw.expiresAt) <= now || Date.parse(raw.expiresAt) <= Date.parse(raw.createdAt)) throw Error("Feedback acknowledgment unavailable.");
  return { id: raw.id, kind: raw.kind as FeedbackReceipt["kind"], category: raw.category as string | null, status: raw.status as FeedbackReceipt["status"],
    revision: raw.revision, createdAt: raw.createdAt, expiresAt: raw.expiresAt };
}

/** No fetch implementation, session creation, automatic reads or offline queue.
 * Every network method is invoked by a deliberate UI action. */
export class R2Client {
  private state: State = { answer: null, receipt: null, feedback: [], pending: null, validity: "unverified", notice: "Not connected. Local saved interests and plans still work." };
  private journal: Journal = { version: 1, receipt: null, pending: null };
  private busy = false;
  private ready = false;
  private epoch = 0;
  private readonly key: string;
  constructor(private readonly store: SecureStore, private readonly qa?: QaBinding, private readonly newId?: () => string, private readonly now: () => number = Date.now) {
    if (qa) {
      const url = new URL(qa.origin);
      const remote = qa.kind === "verified-isolated-qa" && url.protocol === "https:";
      const local = qa.kind === "verified-local-loopback" && url.protocol === "http:" && Number(url.port) >= 1024 && Number(url.port) <= 65535
        && ((qa.platform === "ios" && url.hostname === "127.0.0.1") || (qa.platform === "android" && url.hostname === "10.0.2.2"))
        && Number.isFinite(qa.expiresAt) && qa.expiresAt > now();
      if ((!remote && !local) || url.origin !== qa.origin || url.username || url.password
        || !qa.verificationReceipt.trim() || !isUuid(qa.localScopeId) || qa.session.audience !== "consumer-or-guest") throw Error("Verified native QA binding required.");
    }
    this.key = `amm-r3-receipts-v1.${qa?.localScopeId ?? "disconnected"}`;
  }
  snapshot(): Readonly<State> { return { ...this.state, feedback: [...this.state.feedback], pending: this.state.pending ? { ...this.state.pending } : null }; }
  get connected() { return !!this.qa; }
  /** No answer text survives tab reopen, backgrounding or an auth/source error.
   * An epoch fence suppresses late in-flight responses after these events. */
  hideAnswer() { this.epoch++; this.state = { ...this.state, answer: null, feedback: [], validity: "unverified" }; }
  async restore() {
    if (this.ready) return;
    const raw = await this.store.getItem(this.key);
    if (raw) {
      if (raw.length > 3000) throw Error("Receipt storage unavailable.");
      const value: unknown = JSON.parse(raw);
      if (!isRecord(value) || value.version !== 1 || !(value.receipt === null || isAnswerRef(value.receipt)) || !(value.pending === null || pendingValue(value.pending))) throw Error("Receipt storage unavailable.");
      const ref = value.receipt as AnswerRef | null;
      if (value.pending && (!ref || value.pending.answerId !== ref.answerId || value.pending.revision !== ref.revision)) throw Error("Receipt storage unavailable.");
      this.journal = { version: 1, receipt: ref ? { answerId: ref.answerId, revision: ref.revision } : null, pending: value.pending as Pending | null };
    }
    this.state = { ...this.state, receipt: this.journal.receipt, pending: this.journal.pending,
      notice: this.qa ? "QA bound. Recheck a saved receipt or deliberately ask; no automatic requests." : this.state.notice };
    this.ready = true;
  }
  private async persist(next: Journal) {
    await this.store.setItem(this.key, JSON.stringify(next));
    this.journal = next;
    this.state = { ...this.state, receipt: next.receipt, pending: next.pending };
  }
  private async run(action: (epoch: number) => Promise<void>) {
    if (!this.qa || !this.ready) throw Error("Native QA/session binding is not ready.");
    if (this.busy) throw Error("Wait for the current request.");
    this.busy = true;
    const epoch = this.epoch;
    try { await action(epoch); }
    catch {
      const invalid = this.state.validity === "source_invalid";
      this.hideAnswer();
      this.state = { ...this.state, validity: invalid ? "source_invalid" : "unverified",
        notice: this.journal.pending ? "Feedback is unconfirmed. Retry ONLY the saved request; its key and payload are unchanged."
          : "Answer unavailable or unverified. Recheck explicitly. Asking again is a new request, not a recovered receipt." };
      throw Error(this.state.notice);
    } finally { this.busy = false; }
  }
  private async request(path: Path, method: "GET" | "POST", body?: unknown) {
    const response = await this.qa!.session.request({ origin: this.qa!.origin, path, method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (response.status < 200 || response.status >= 300) throw Error("Request not confirmed.");
    if (isRecord(response.body) && response.body.currentSourceValidity === "source_invalid") {
      this.state = { ...this.state, validity: "source_invalid" };
      throw Error("Source invalid.");
    }
    return response.body;
  }
  async ask(question: string) {
    if (!question.trim() || question.trim().length > 2000) throw Error("Use a question within 2,000 characters.");
    if (this.journal.pending) throw Error("Reconcile the saved feedback request first.");
    await this.run(async epoch => {
      this.state = { ...this.state, answer: null, feedback: [], validity: "unverified" };
      const raw = await this.request("/api/chat/message", "POST", { message: question.trim(), knowledge_version: PUBLIC_KNOWLEDGE_VERSION });
      const answer = readCurrentAnswer(raw);
      await this.persist({ ...this.journal, receipt: { answerId: answer.answerId, revision: answer.revision } });
      if (epoch === this.epoch) this.state = { ...this.state, answer, validity: "valid", notice: "Source valid at answer release. No contact request was submitted." };
    });
  }
  async recheck() {
    const receipt = this.journal.receipt;
    if (!receipt) throw Error("No saved answer receipt.");
    await this.run(async epoch => {
      this.state = { ...this.state, answer: null, feedback: [], validity: "unverified" };
      const raw = await this.request(`/api/intelligence/answers?id=${receipt.answerId}`, "GET");
      if (!isRecord(raw) || raw.ok !== true) throw Error("Answer unavailable.");
      const answer = readCurrentAnswer(raw, receipt);
      const result = await this.request(`/api/intelligence/feedback?answerId=${receipt.answerId}&revision=${receipt.revision}`, "GET");
      if (!isRecord(result) || result.ok !== true || !Array.isArray(result.feedback) || result.feedback.length > 100) throw Error("Feedback read unavailable.");
      const feedback = result.feedback.map(v => readFeedback(v, this.now()));
      if (epoch === this.epoch) this.state = { ...this.state, answer, feedback, validity: "valid", notice: "Source valid at this explicit read; this is not continuous monitoring." };
    });
  }
  async feedback(kind: FeedbackReceipt["kind"], reportCategory: FeedbackCategory | null = null) {
    if (this.journal.pending) throw Error("Retry the saved request before changing feedback.");
    const answer = this.state.answer;
    if (!answer || this.state.validity !== "valid") throw Error("Recheck the supported answer first.");
    const requestId = this.newId?.();
    const pending = { answerId: answer.answerId, revision: answer.revision, requestId, kind, category: reportCategory, comment: "" };
    if (!pendingValue(pending)) throw Error("Feedback identity or category unavailable.");
    await this.run(async epoch => {
      // Persist BEFORE any send. Failed storage means no request is attempted.
      await this.persist({ ...this.journal, pending });
      await this.sendPending(epoch);
    });
  }
  async retryFeedback() {
    if (!this.journal.pending) throw Error("No pending feedback request.");
    await this.run(epoch => this.sendPending(epoch));
  }
  private async sendPending(epoch: number) {
    const pending = this.journal.pending!;
    const result = await this.request("/api/intelligence/feedback", "POST", pending);
    if (!isRecord(result) || result.ok !== true || typeof result.replayed !== "boolean") throw Error("Feedback not confirmed.");
    const receipt = readFeedback(result.feedback, this.now());
    // Exact replay is confirmed by the canonical SQL payload hash. Staff may
    // have reclassified a report since the lost acknowledgment; return its
    // current disposition without changing the original pending request.
    if (receipt.kind !== pending.kind || (!result.replayed && receipt.category !== pending.category)) throw Error("Feedback receipt mismatch.");
    // A failed local acknowledgment write ALSO retains the exact retry key.
    await this.persist({ ...this.journal, pending: null });
    if (epoch === this.epoch) this.state = { ...this.state, feedback: [...this.state.feedback.filter(f => f.id !== receipt.id), receipt],
      notice: `Feedback recorded${result.replayed ? " (existing request)" : ""}. No contact message, task or appointment was created by this action.` };
  }
}
