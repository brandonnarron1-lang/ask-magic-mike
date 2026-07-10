import Link from "next/link";
import { BlackDiamondHeader } from "./components/black-diamond/BlackDiamondHeader";
import { Footer } from "./components/black-diamond/BlackDiamondShell";

export default function NotFound() {
  return (
    <main className="amm-page-surface min-h-screen text-[#f4ead4]">
      <section className="px-5 py-6 sm:px-8 lg:px-10">
        <div className="amm-container">
          <BlackDiamondHeader />
        </div>
      </section>
      <section className="amm-section">
        <div className="amm-container grid min-h-[56svh] gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="amm-eyebrow">Page not found</p>
            <h1 className="mt-4 max-w-2xl font-serif text-5xl leading-tight text-[#f4ead4] sm:text-6xl">
              This path is not part of the live Ask Magic Mike flow.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#d9ceb8]">
              Start with a home-value request, seller strategy, or a direct question for Mike and Our Town Properties.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/home-value" className="amm-primary-button px-6 py-4">
                Get My Home Value
              </Link>
              <Link href="/ask" className="amm-secondary-button px-6 py-4">
                Ask Mike
              </Link>
            </div>
          </div>
          <div className="amm-glass-card rounded-lg p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#22c6d2]">
              Available public paths
            </p>
            <div className="mt-5 grid gap-3">
              {[
                ["/home-value", "Home-value request"],
                ["/sell", "Seller options"],
                ["/ask", "Ask Mike"],
                ["/widget", "Embeddable widget"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-md border border-[#cda24a33] bg-black/35 p-4 text-[#f4ead4] transition hover:border-[#e2c06f]"
                >
                  <span className="font-semibold">{label}</span>
                  <span className="mt-1 block text-sm text-[#d9ceb8]">{href}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
