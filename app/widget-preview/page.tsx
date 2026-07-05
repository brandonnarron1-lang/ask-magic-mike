import { PageTracker } from "../components/black-diamond/PageTracker";

export default function WidgetPreviewPage() {
  return (
    <main className="min-h-screen bg-[#f7f3eb] text-[#151515]">
      <PageTracker funnelName="widget_preview" />
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="border-b border-black/10 pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6e1626]">Our Town Properties preview</p>
          <h1 className="mt-4 font-serif text-5xl leading-tight">Wilson real estate, locally guided.</h1>
        </div>
        <div className="grid gap-8 py-10 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="text-lg leading-8 text-[#4b453d]">
              This page simulates an OurTownProperties.com content page with the Ask Magic Mike floating widget loaded sitewide. The parent brand remains calm and local while the widget carries the Black Diamond conversion surface.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {["Home values", "Seller strategy", "Ask Mike"].map((item) => (
                <div key={item} className="rounded-lg border border-black/10 bg-white p-5">
                  <p className="font-semibold">{item}</p>
                  <p className="mt-3 text-sm leading-6 text-[#5c554c]">Routes traffic into a focused Ask Magic Mike path with attribution preserved.</p>
                </div>
              ))}
            </div>
          </div>
          <aside className="rounded-lg bg-[#111113] p-6 text-[#f4ead4]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e2c06f]">Integration check</p>
            <p className="mt-4 text-2xl font-serif">Open the bottom-right launcher to test the iframe widget.</p>
            <p className="mt-4 text-sm leading-6 text-[#d9ceb8]">
              It should carry source, medium, campaign, placement, parent URL, and embed host into the lead payload.
            </p>
          </aside>
        </div>
      </section>
      <script
        async
        src="/widget.js"
        data-source="ourtownproperties"
        data-medium="website"
        data-campaign="parent-site-widget"
        data-placement="sitewide-floating"
      />
    </main>
  );
}
