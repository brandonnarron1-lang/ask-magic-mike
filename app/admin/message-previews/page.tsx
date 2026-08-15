import Link from "next/link";
import { requireLeadCenterPermission } from "../../../src/lib/admin/rbac-session";
import {
  MESSAGE_TEMPLATE_REGISTRY,
  renderBrandedEmail,
} from "../../../src/lib/messaging/template-registry";
import { MESSAGE_SEQUENCES } from "../../../src/lib/messaging/sequence-engine";
import { smsSegmentCount } from "../../../src/lib/messaging/sms-policy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MessagePreviewPage() {
  await requireLeadCenterPermission("notification:manage");
  const qaEmail = renderBrandedEmail({
    subject: "Your home-value review request was received",
    preheader: "Controlled internal rendering preview",
    heading: "Your request is recorded for human review.",
    body: "We received the property details for a broker-reviewed conversation. This is not an appraisal, automated valuation, guaranteed offer, or confirmed appointment.",
    ctaLabel: "Open test Lead Center record",
    ctaUrl: "https://www.askmagicmike.com/admin/leads",
    isTest: true,
  });
  const smsTemplates = MESSAGE_TEMPLATE_REGISTRY.filter((template) => template.channel === "sms");

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-[#f4ead4]">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-[#cda24a33] pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e2c06f]">AdminOps</p>
              <h1 className="mt-3 font-serif text-4xl">Message review studio</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#d9ceb8]">
                Read-only previews for the Phase 6 template registry. Nothing on this page queues, schedules, or sends a message.
              </p>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Admin navigation">
              <Link href="/admin/notifications" className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]">Notification outbox</Link>
              <Link href="/admin/leads" className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]">Lead inbox</Link>
            </nav>
          </div>
          <p className="mt-5 rounded-md border border-[#7f1d1d] bg-[#2a0909] p-3 text-sm text-[#ffd7d7]">
            Consumer auto-send and sequence scheduling remain disabled. Every consumer template requires purpose-specific permission and human approval.
          </p>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-xl border border-white/10 bg-[#0b0b0b] p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#e2c06f]">Responsive email QA rendering</p>
            <iframe
              title="Brandon-only QA email preview"
              srcDoc={qaEmail.html}
              className="h-[620px] w-full rounded-lg border border-white/10 bg-white"
              sandbox=""
            />
          </div>
          <div className="space-y-4">
            <section className="rounded-xl border border-white/10 bg-[#0b0b0b] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e2c06f]">Exact test subject</p>
              <p className="mt-3 break-words text-sm text-[#f4ead4]">{qaEmail.subject}</p>
            </section>
            <section className="rounded-xl border border-white/10 bg-[#0b0b0b] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e2c06f]">Sequence inventory</p>
              <ul className="mt-4 space-y-3">
                {MESSAGE_SEQUENCES.map((sequence) => (
                  <li key={sequence.id} className="rounded-md border border-white/10 bg-black/30 p-3">
                    <p className="text-sm font-semibold text-[#f4ead4]">{sequence.group.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-xs text-[#8f8778]">{sequence.steps.length} steps · approval required at every step</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e2c06f]">SMS previews</p>
              <h2 className="mt-2 font-serif text-3xl">Carrier send is disabled</h2>
            </div>
            <p className="text-xs text-[#8f8778]">STOP/HELP language and segment count shown before approval.</p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {smsTemplates.map((template) => (
              <article key={template.id} className="rounded-xl border border-white/10 bg-[#0b0b0b] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">{template.group.replaceAll("_", " ")}</p>
                  <span className="rounded-full border border-[#cda24a33] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-[#e2c06f]">{template.approval.replaceAll("_", " ")}</span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#f4ead4]">{template.body}</p>
                <p className="mt-4 text-xs text-[#8f8778]">{smsSegmentCount(template.body)} segment(s) · {template.purpose.replaceAll("_", " ")}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
