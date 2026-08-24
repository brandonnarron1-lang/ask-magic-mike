import { LEAD_ALERT_DESIGN_PREVIEWS } from "../../lib/leadAlertDesignPreview";

export function LeadAlertPreviewGallery({ standalone = false }: { standalone?: boolean }) {
  const Heading = standalone ? "h1" : "h2";

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e2c06f]">Internal lead-alert identity</p>
          <Heading className="mt-2 font-serif text-3xl">Urgency changes. Mike and Our Town remain unmistakable.</Heading>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#8f8778]">
            These are read-only synthetic renders. No lead exists, no recipient is selected, and nothing on this page can queue or send a message.
          </p>
        </div>
        <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">No-send preview</span>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        {LEAD_ALERT_DESIGN_PREVIEWS.map((preview) => (
          <article key={preview.id} className="rounded-xl border border-white/10 bg-[#0b0b0b] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#f4ead4]">{preview.label}</p>
                <p className="mt-1 text-xs text-[#8f8778]">Synthetic score {preview.score}</p>
              </div>
              <span className="rounded-full border border-[#cda24a33] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-[#e2c06f]">{preview.rendered.visualTemplate.version}</span>
            </div>
            <iframe
              title={`${preview.label} internal lead-alert preview`}
              srcDoc={preview.rendered.html}
              className="h-[760px] w-full rounded-lg border border-white/10 bg-[#090909]"
              sandbox=""
            />
          </article>
        ))}
      </div>
    </section>
  );
}
