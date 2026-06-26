"use client";

import { useState } from "react";
import {
  assignLeadAction,
  updateStatusAction,
  updateLeadTypeAction,
  markSpamAction,
  addNoteAction,
  createTaskAction,
  sendMessageAction,
  runListingMatchAction,
  runSellerOfferReviewAction,
  setFollowUpAction,
  markContactedAction,
} from "@/app/(admin)/admin/leads/[id]/actions";
import { LEAD_STATUSES, LEAD_TYPES } from "@/lib/leads/lead-types";
import { SMS_TEMPLATES, EMAIL_TEMPLATES } from "@/lib/engines/communications-templates";

interface AdminLeadActionsProps {
  leadId: string;
  currentStatus?: string | null;
  currentLeadType?: string | null;
  consentSms?: boolean;
  consentEmail?: boolean;
  smsOptOut?: boolean;
  emailOptOut?: boolean;
  smsEnabled?: boolean;
  emailEnabled?: boolean;
}

interface ActionResultDisplay {
  ok: boolean;
  message?: string;
  error?: string;
}

/**
 * Cockpit operator surface. Each form posts via a server action so
 * `ADMIN_SECRET` never reaches the browser. Every successful action
 * revalidates the lead detail page.
 */
export function AdminLeadActions({
  leadId,
  currentStatus,
  currentLeadType,
  consentSms = false,
  consentEmail = false,
  smsOptOut = false,
  emailOptOut = false,
  smsEnabled = false,
  emailEnabled = false,
}: AdminLeadActionsProps) {
  const [result, setResult] = useState<ActionResultDisplay | null>(null);

  async function wrap(action: (fd: FormData) => Promise<ActionResultDisplay>, fd: FormData) {
    const r = await action(fd);
    setResult(r);
  }

  return (
    <div data-testid="admin-lead-actions" className="space-y-4">
      {result ? (
        <p
          role="status"
          className={`text-[12.5px] rounded-md px-3 py-2 ${
            result.ok
              ? "bg-emerald-500/10 border border-emerald-400/40 text-emerald-200"
              : "bg-ruby-400/10 border border-ruby-400/40 text-ruby-200"
          }`}
        >
          {result.ok ? result.message : `Error: ${result.error}`}
        </p>
      ) : null}

      {/* Assign */}
      <Card title="Assign / reassign">
        <form
          className="flex gap-2"
          action={(fd) => wrap(assignLeadAction, fd)}
        >
          <input type="hidden" name="lead_id" value={leadId} />
          <input
            name="agent_id"
            required
            placeholder="agent UUID"
            className="flex-1 rounded-md border border-white/12 bg-[#0B0E14] px-2 py-1.5 text-[12.5px]"
          />
          <input
            name="reason"
            placeholder="reason (optional)"
            className="flex-1 rounded-md border border-white/12 bg-[#0B0E14] px-2 py-1.5 text-[12.5px]"
          />
          <SubmitBtn>Assign</SubmitBtn>
        </form>
      </Card>

      {/* Status + lead type + spam */}
      <Card title="Status / classification">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <form action={(fd) => wrap(updateStatusAction, fd)} className="flex gap-2">
            <input type="hidden" name="lead_id" value={leadId} />
            <select
              name="status"
              defaultValue={currentStatus ?? ""}
              className="flex-1 rounded-md border border-white/12 bg-[#0B0E14] px-2 py-1.5 text-[12.5px]"
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <SubmitBtn>Save status</SubmitBtn>
          </form>

          <form action={(fd) => wrap(updateLeadTypeAction, fd)} className="flex gap-2">
            <input type="hidden" name="lead_id" value={leadId} />
            <select
              name="lead_type"
              defaultValue={currentLeadType ?? ""}
              className="flex-1 rounded-md border border-white/12 bg-[#0B0E14] px-2 py-1.5 text-[12.5px]"
            >
              {LEAD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <SubmitBtn>Save type</SubmitBtn>
          </form>

          <form action={(fd) => wrap(markSpamAction, fd)} className="flex gap-2">
            <input type="hidden" name="lead_id" value={leadId} />
            <select
              name="spam"
              defaultValue="true"
              className="flex-1 rounded-md border border-white/12 bg-[#0B0E14] px-2 py-1.5 text-[12.5px]"
            >
              <option value="true">Mark spam</option>
              <option value="false">Clear spam</option>
            </select>
            <SubmitBtn>Apply</SubmitBtn>
          </form>
        </div>
      </Card>

      {/* Notes */}
      <Card title="Add note">
        <form
          action={(fd) => wrap(addNoteAction, fd)}
          className="space-y-2"
        >
          <input type="hidden" name="lead_id" value={leadId} />
          <textarea
            name="note"
            required
            rows={3}
            placeholder="Internal note — visible only to admin"
            className="w-full rounded-md border border-white/12 bg-[#0B0E14] px-2 py-1.5 text-[12.5px]"
          />
          <SubmitBtn>Save note</SubmitBtn>
        </form>
      </Card>

      {/* Task */}
      <Card title="Create task">
        <form
          action={(fd) => wrap(createTaskAction, fd)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          <input type="hidden" name="lead_id" value={leadId} />
          <input
            name="title"
            required
            placeholder="Title"
            className="rounded-md border border-white/12 bg-[#0B0E14] px-2 py-1.5 text-[12.5px]"
          />
          <input
            name="due_at"
            type="datetime-local"
            className="rounded-md border border-white/12 bg-[#0B0E14] px-2 py-1.5 text-[12.5px]"
          />
          <select
            name="priority"
            defaultValue="normal"
            className="rounded-md border border-white/12 bg-[#0B0E14] px-2 py-1.5 text-[12.5px]"
          >
            <option value="low">low</option>
            <option value="normal">normal</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
          <textarea
            name="body"
            rows={2}
            placeholder="Notes (optional)"
            className="sm:col-span-2 rounded-md border border-white/12 bg-[#0B0E14] px-2 py-1.5 text-[12.5px]"
          />
          <SubmitBtn className="sm:col-span-2">Create task</SubmitBtn>
        </form>
      </Card>

      {/* Messaging */}
      <Card title="Send templated message">
        <p className="text-[10.5px] uppercase tracking-[0.16em] text-slate-400 mb-2">
          Mock provider: SMS={smsEnabled ? "LIVE" : "MOCK"} · EMAIL=
          {emailEnabled ? "LIVE" : "MOCK"}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* SMS form */}
          <form
            action={(fd) => wrap(sendMessageAction, fd)}
            className="space-y-2"
          >
            <input type="hidden" name="lead_id" value={leadId} />
            <input type="hidden" name="channel" value="sms" />
            <p className="text-[11.5px] text-slate-300">
              SMS · consent: {consentSms ? "yes" : "no"}{" "}
              {smsOptOut ? "· opted out" : ""}
            </p>
            <select
              name="template_slug"
              required
              className="w-full rounded-md border border-white/12 bg-[#0B0E14] px-2 py-1.5 text-[12.5px]"
            >
              {Object.keys(SMS_TEMPLATES).map((slug) => (
                <option key={slug} value={slug}>
                  {slug}
                </option>
              ))}
            </select>
            <SubmitBtn disabled={smsOptOut}>
              {smsOptOut ? "Blocked (opt-out)" : "Send SMS"}
            </SubmitBtn>
          </form>

          {/* Email form */}
          <form
            action={(fd) => wrap(sendMessageAction, fd)}
            className="space-y-2"
          >
            <input type="hidden" name="lead_id" value={leadId} />
            <input type="hidden" name="channel" value="email" />
            <p className="text-[11.5px] text-slate-300">
              Email · consent: {consentEmail ? "yes" : "no"}{" "}
              {emailOptOut ? "· opted out" : ""}
            </p>
            <select
              name="template_slug"
              required
              className="w-full rounded-md border border-white/12 bg-[#0B0E14] px-2 py-1.5 text-[12.5px]"
            >
              {Object.keys(EMAIL_TEMPLATES).map((slug) => (
                <option key={slug} value={slug}>
                  {slug}
                </option>
              ))}
            </select>
            <SubmitBtn disabled={emailOptOut}>
              {emailOptOut ? "Blocked (opt-out)" : "Send email"}
            </SubmitBtn>
          </form>
        </div>
      </Card>

      {/* Intel: listing match + seller offer review */}
      <Card title="Intel">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <form action={(fd) => wrap(runListingMatchAction, fd)} className="flex gap-2">
            <input type="hidden" name="lead_id" value={leadId} />
            <SubmitBtn className="flex-1">Run listing match</SubmitBtn>
          </form>
          <form action={(fd) => wrap(runSellerOfferReviewAction, fd)} className="flex gap-2">
            <input type="hidden" name="lead_id" value={leadId} />
            <SubmitBtn className="flex-1">Seller-offer review</SubmitBtn>
          </form>
        </div>
      </Card>

      {/* Contact activity */}
      <Card title="Contact activity">
        <form
          action={(fd) => wrap(markContactedAction, fd)}
          className="flex items-center gap-2"
        >
          <input type="hidden" name="lead_id" value={leadId} />
          <p className="text-[11.5px] text-slate-400 flex-1">
            Records the current timestamp as last contacted.
          </p>
          <SubmitBtn>Mark contacted now</SubmitBtn>
        </form>
      </Card>

      {/* Follow-up date */}
      <Card title="Follow-up date">
        <form
          action={(fd) => wrap(setFollowUpAction, fd)}
          className="flex flex-wrap gap-2 items-end"
        >
          <input type="hidden" name="lead_id" value={leadId} />
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10.5px] text-slate-400 mb-1">
              Schedule next follow-up
            </label>
            <input
              type="datetime-local"
              name="follow_up_at"
              className="w-full rounded-md border border-white/12 bg-[#0B0E14] px-2 py-1.5 text-[12.5px]"
            />
          </div>
          <SubmitBtn>Set date</SubmitBtn>
          <button
            type="submit"
            onClick={(e) => {
              const form = (e.currentTarget as HTMLButtonElement).closest("form") as HTMLFormElement;
              const input = form.querySelector<HTMLInputElement>("input[name=follow_up_at]");
              if (input) input.value = "";
            }}
            className="rounded-md border border-white/12 px-3 py-1.5 text-[12.5px] text-slate-300 hover:bg-white/5"
          >
            Clear
          </button>
        </form>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.09] bg-white/[0.025] p-4">
      <p className="text-[10.5px] tracking-[0.18em] uppercase text-gold-300/85 mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function SubmitBtn({
  children,
  className,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={`rounded-md bg-gold-400 px-3 py-1.5 text-[12.5px] font-bold text-[#050505] disabled:opacity-50 disabled:cursor-not-allowed ${
        className ?? ""
      }`}
    >
      {children}
    </button>
  );
}
