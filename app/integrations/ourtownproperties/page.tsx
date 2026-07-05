import Link from "next/link";
import { BlackDiamondHeader } from "../../components/black-diamond/BlackDiamondHeader";
import { Footer } from "../../components/black-diamond/BlackDiamondShell";

const snippet = `<script
  async
  src="https://askmagicmike.com/widget.js"
  data-source="ourtownproperties"
  data-medium="website"
  data-campaign="parent-site-widget"
  data-placement="sitewide-floating">
</script>`;

export default function OurTownIntegrationPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f4ead4]">
      <section className="px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <BlackDiamondHeader />
        </div>
      </section>
      <section className="px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e2c06f]">OurTownProperties.com integration</p>
            <h1 className="mt-4 font-serif text-5xl leading-tight sm:text-6xl">
              Sitewide Ask Magic Mike widget, built for the parent brand.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#d9ceb8]">
              Add the script before the closing body tag, or place it in a WordPress Custom HTML block or Google Tag Manager tag.
            </p>
            <Link href="/widget-preview" className="mt-8 inline-flex rounded-full bg-[#cda24a] px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-black">
              Open Widget Preview
            </Link>
          </div>
          <div className="rounded-lg border border-[#cda24a33] bg-[#111113] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#22c6d2]">Production snippet</p>
            <pre className="mt-4 overflow-auto rounded-md border border-white/10 bg-black p-4 text-sm leading-6 text-[#d9ceb8]">
              <code>{snippet}</code>
            </pre>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {["Home-value funnel", "Ask Mike chat", "Seller strategy"].map((item) => (
                <div key={item} className="rounded-md border border-[#cda24a33] p-4 text-sm text-[#d9ceb8]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
