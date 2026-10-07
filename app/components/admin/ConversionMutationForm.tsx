"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export type ConversionMutationResult =
  | { ok: true; warning?: string }
  | { ok: false; error: string };

const messages: Record<string, string> = {
  confirmation_required: "Confirm the actual event before saving.",
  revenue_permission_required: "Your role cannot record brokerage revenue.",
  rbac_not_enabled: "An authenticated Lead Center session is required.",
  forbidden: "Your role cannot change this record.",
  invalid_terminal_reason: "Choose the required lifecycle reason.",
  invalid_outcome_amount: "Enter actual brokerage revenue as a positive dollar amount with at most two decimal places.",
  appointment_start_required: "A scheduled appointment needs a start time.",
  appointment_end_before_start: "The end time must be after the start time.",
  invalid_timezone: "Enter a valid timezone, such as America/New_York.",
  invalid_followup_due_at: "Enter a valid follow-up due time.",
  duplicate_active_appointment: "This lead already has an active appointment. Review that record instead of creating another.",
  stale_appointment_version: "This appointment changed in another session.",
  concurrent_appointment_update: "This appointment changed while you were saving.",
  stale_followup_version: "This follow-up changed in another session.",
  concurrent_followup_update: "This follow-up changed while you were saving.",
  stale_action: "This action changed in another session.",
  idempotency_conflict: "This request token belongs to a different action. Review the current record before starting a new action.",
  invalid_interaction_channel: "Choose the actual manual interaction channel.",
  invalid_interaction_result: "Choose the actual interaction result.",
  invalid_human_interaction: "Choose the actual channel and result, and enter a safe note of one to 160 characters.",
  conversation_confirmation_required: "First-response evidence requires an explicitly confirmed two-way conversation.",
  conversion_transaction_unavailable: "The atomic save could not be confirmed. Retry the same request; do not create a duplicate action.",
  conversion_actor_forbidden: "Your authenticated role or current assignment cannot perform this action.",
  conversion_action_already_saved: "This logical action was already saved. No duplicate appointment, task, or interaction was created.",
  followup_owner_changed: "The follow-up owner changed. Review current assignment before continuing.",
  appointment_owner_changed: "The appointment owner changed. Review current assignment before continuing.",
  followup_terminal_state: "This task is already completed or canceled. Create a separate follow-up if needed.",
  appointment_native_conflict: "This time overlaps another internal appointment for the assigned agent. Review the schedule or choose another time; external calendar availability was not checked.",
  invalid_appointment_duration: "End must follow start, with a duration of at most eight hours.",
  appointment_window_required: "A scheduled appointment needs both start and end times, with a duration of at most eight hours.",
  terminal_lead_appointment_held: "This lead has a terminal lifecycle. Review it before creating or advancing an appointment.",
  invalid_datetime: "Enter a valid date and time.",
  nonexistent_local_time: "That local time does not exist because the clock changes. Choose another time.",
  ambiguous_local_time: "That local time occurs twice because the clock changes. Choose an unambiguous time.",
  invalid_appointment_timezone: "Enter a valid declared timezone, such as America/New_York.",
  invalid_conversion_time: "Enter a valid date and time in the declared timezone.",
  nonexistent_conversion_time: "That local time does not exist because the clock changes. Choose another time.",
  ambiguous_conversion_time: "That local time occurs twice because the clock changes. Choose an unambiguous time.",
  appointment_status_already_current: "The appointment already has that status; no new transition was recorded.",
  followup_status_already_current: "The follow-up already has that status; no new completion was recorded.",
  first_response_already_recorded: "First human response was already recorded; no duplicate was created.",
  status_already_current: "The lifecycle already has that status.",
  outcome_revenue_updated: "Actual brokerage revenue updated without duplicating the outcome.",
  appointment_created_audit_failed: "The appointment was saved, but its audit evidence is incomplete. Review before continuing.",
  appointment_updated_audit_failed: "The appointment was saved, but its audit evidence is incomplete. Review before continuing.",
  lifecycle_updated_audit_failed: "The lifecycle was saved, but its audit evidence is incomplete. Review before continuing.",
  preview_data_disabled: "Preview is read-only. No change was saved.",
};

const versionConflicts = new Set([
  "stale_appointment_version", "concurrent_appointment_update",
  "stale_followup_version", "concurrent_followup_update", "stale_action",
]);

type Editable = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type DraftField = { name: string; value: string; checked?: boolean };

function editableFields(form: HTMLFormElement): Editable[] {
  return Array.from(form.elements).filter((element): element is Editable =>
    (element instanceof HTMLInputElement && !["hidden", "submit", "file"].includes(element.type)) ||
    element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement,
  );
}

function readDraft(form: HTMLFormElement): DraftField[] {
  return editableFields(form).map((field) => ({
    name: field.name,
    value: field.value,
    ...(field instanceof HTMLInputElement && ["checkbox", "radio"].includes(field.type)
      ? { checked: field.checked } : {}),
  }));
}

function restoreDraft(form: HTMLFormElement, draft: DraftField[]) {
  const fields = editableFields(form);
  for (const saved of draft) {
    const field = fields.find((candidate) => candidate.name === saved.name &&
      (saved.checked === undefined || candidate.value === saved.value));
    if (!field) continue;
    if (saved.checked !== undefined && field instanceof HTMLInputElement) field.checked = saved.checked;
    else field.value = saved.value;
  }
}

export function ConversionMutationForm({
  action, children, submitLabel, successMessage, confirmationLabel, className,
  newActionLabel,
}: {
  action: (formData: FormData, responseMode: "inline") => Promise<ConversionMutationResult>;
  children: ReactNode;
  submitLabel: string;
  successMessage: string;
  confirmationLabel?: string;
  className?: string;
  newActionLabel?: string;
}) {
  const router = useRouter();
  const statusId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const draft = useRef<DraftField[] | null>(null);
  const token = useRef<string | null>(null);
  const request = useRef<FormData | null>(null);
  const saving = useRef(false);
  const conflictVersion = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [result, setResult] = useState<ConversionMutationResult | null>(null);

  // RSC refreshes update hidden versions, but never replace the unsaved editable draft.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    if (draft.current) restoreDraft(form, draft.current);
    const version = form.querySelector<HTMLInputElement>('input[name="record_version"]')?.value || "";
    if (conflictVersion.current !== null && version !== conflictVersion.current) {
      conflictVersion.current = null;
      token.current = null;
      const confirm = form.querySelector<HTMLInputElement>('input[name="confirm"]');
      if (confirm) confirm.checked = false;
      draft.current = readDraft(form);
      setResult(null);
    }
  }, [children]);

  function rememberDraft() {
    if (formRef.current) draft.current = readDraft(formRef.current);
    // A corrected, definitively rejected submission is a new logical request.
    if (result && !result.ok && !uncertain) token.current = null;
  }

  async function save(data: FormData) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setResult(null);
    try {
      const saved = await action(data, "inline");
      if (!saved || typeof saved.ok !== "boolean") throw new Error("unconfirmed_response");
      if (!saved.ok && saved.error === "conversion_transaction_unavailable") {
        setUncertain(true);
        return;
      }
      setUncertain(false);
      setResult(saved);
      if (!saved.ok && versionConflicts.has(saved.error)) {
        conflictVersion.current = String(data.get("record_version") || "");
      }
      if (saved.ok) router.refresh();
    } catch {
      // A lost response is not evidence of failure. Replay only the captured request.
      setUncertain(true);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || uncertain || result?.ok || conflictVersion.current !== null) return;
    draft.current = readDraft(event.currentTarget);
    const data = new FormData(event.currentTarget);
    // The server resolves wall-clock values using the form's declared zone and
    // rejects DST gaps/repeated times. Never use the browser/server default zone.
    token.current ||= crypto.randomUUID();
    data.set("idempotency_key", token.current);
    data.set("response_mode", "inline");
    request.current = data;
    void save(data);
  }

  const conflict = result && !result.ok && versionConflicts.has(result.error);
  const message = busy ? "Saving…" : uncertain
    ? "Save outcome not confirmed. Your draft is kept on this page. Retry the same request to check its result; do not start a duplicate action."
    : result?.ok
      ? result.warning ? `Saved with notice: ${messages[result.warning] || result.warning.replaceAll("_", " ")}` : successMessage
      : result ? `Not saved: ${messages[result.error] || result.error.replaceAll("_", " ")}. Your draft is kept on this page.` : "";

  return (
    <form ref={formRef} onSubmit={submit} onChange={rememberDraft} className={`min-w-0 ${className || ""}`} aria-label={submitLabel} aria-busy={busy} aria-describedby={statusId}>
      <fieldset disabled={busy || uncertain || Boolean(result?.ok)} className="min-w-0 space-y-3 disabled:opacity-70 [&_input:not([type=hidden])]:min-h-11 [&_input]:min-w-0 [&_input]:max-w-full [&_select]:min-h-11 [&_select]:min-w-0 [&_textarea]:min-h-11 [&_input]:focus-visible:outline-2 [&_input]:focus-visible:outline-cyan-300 [&_select]:focus-visible:outline-2 [&_select]:focus-visible:outline-cyan-300 [&_textarea]:focus-visible:outline-2 [&_textarea]:focus-visible:outline-cyan-300">
        {children}
        {confirmationLabel ? (
          <label className="flex items-start gap-3 text-sm leading-6 text-[#d9ceb8]">
            <input required type="checkbox" name="confirm" value="yes" className="w-5 shrink-0 accent-[#cda24a]" />
            <span className="min-w-0 break-words">{confirmationLabel}</span>
          </label>
        ) : null}
        <button type="submit" disabled={Boolean(conflict)} className="min-h-11 w-full whitespace-normal break-words rounded-md border border-[#cda24a55] bg-[#cda24a14] px-3 py-2 text-sm font-semibold text-[#f4ead4] outline-none hover:border-[#cda24a] focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-60">
          {busy ? "Saving…" : result?.ok ? "Saved" : submitLabel}
        </button>
      </fieldset>
      <p className="mt-2 break-words text-xs leading-5 text-[#b9b09f]">Drafts stay in this page's memory only; leaving or reloading discards them. Date/time fields use the timezone declared in this form. Missing or repeated daylight-saving times are rejected.</p>
      <p id={statusId} role={result && !result.ok || uncertain ? "alert" : "status"} aria-live={result && !result.ok || uncertain ? "assertive" : "polite"} aria-atomic="true" className={`mt-3 break-words text-sm leading-6 ${result && !result.ok || uncertain ? "text-[#ffb1bd]" : "text-cyan-100"}`}>{message}</p>
      {conflict ? (
        <button type="button" onClick={() => router.refresh()} className="mt-3 min-h-11 w-full rounded-md border border-cyan-300/35 px-3 py-2 text-sm text-cyan-100 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Review latest record (keep draft)</button>
      ) : null}
      {uncertain ? (
        <button type="button" disabled={busy} onClick={() => { if (request.current) void save(request.current); }} className="mt-3 min-h-11 w-full rounded-md border border-cyan-300/35 px-3 py-2 text-sm text-cyan-100 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-60">Retry same request</button>
      ) : null}
      {result?.ok && newActionLabel ? (
        <button type="button" onClick={() => {
          formRef.current?.reset();
          draft.current = null;
          token.current = null;
          request.current = null;
          setResult(null);
        }} className="mt-3 min-h-11 w-full rounded-md border border-white/25 px-3 py-2 text-sm text-[#f4ead4] outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">{newActionLabel}</button>
      ) : null}
    </form>
  );
}
