import Image from "next/image";
import { siteConfig } from "@/lib/site-config";
import { brandPackAssets } from "@/components/amm/brand-pack-assets";

function EqualHousingIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Equal Housing Opportunity"
      className={className}
    >
      <path
        d="M3 10.5L12 3L21 10.5V21H15V15H9V21H3V10.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 12H15M9 14.5H15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="relative border-t border-gold-400/10 bg-[#080806] px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <Image
                src={brandPackAssets.logo.primary}
                alt="Our Town Properties, Inc."
                width={52}
                height={27}
                className="h-auto w-auto opacity-80"
              />
              <div>
                <div className="text-xs font-semibold tracking-label uppercase text-gold-400">Ask Magic Mike</div>
                <div className="text-[10px] text-slate-500">Powered by Our Town Properties</div>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              Eastern NC&apos;s real estate AI. Instant answers, expert follow-up,
              and the most experienced closer in Eastern North Carolina.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-semibold tracking-label uppercase text-cream mb-4">Contact</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div>
                <span className="text-slate-600 text-[10px] uppercase tracking-label block mb-0.5">Direct</span>
                <a href="tel:2522454337" className="hover:text-gold-400 transition-colors">252-245-4337</a>
              </div>
              <div>
                <span className="text-slate-600 text-[10px] uppercase tracking-label block mb-0.5">Office</span>
                <a href="tel:2522437700" className="hover:text-gold-400 transition-colors">252-243-7700</a>
              </div>
              <div>
                <span className="text-slate-600 text-[10px] uppercase tracking-label block mb-0.5">Web</span>
                <a href={siteConfig.parentBrandUrl} className="hover:text-gold-400 transition-colors">
                  ourtownproperties.com
                </a>
              </div>
              <div className="text-slate-500 pt-1">Wilson, NC · Eastern NC</div>
              <div className="pt-3 border-t border-white/[0.05] space-y-1.5">
                <span className="text-slate-600 text-[10px] uppercase tracking-label block mb-1.5">Quick Links</span>
                <a href="/ask" className="block hover:text-gold-400 transition-colors">Ask a Question</a>
                <a href="/value" className="block hover:text-gold-400 transition-colors">Home Value Estimate</a>
              </div>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold tracking-label uppercase text-cream mb-4">Disclosures</h4>
            <p className="text-xs leading-relaxed text-slate-600">
              Mike Eatmon is a licensed North Carolina real estate professional (Our Town
              Properties, Inc. Broker). All market data is approximate and for informational
              purposes only. AVM estimates are not appraisals. Past sales performance does not
              guarantee future results. Equal Housing Opportunity.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="gold-rule mb-6" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <span>© {new Date().getFullYear()} Our Town Properties, Inc. · Mike Eatmon, REALTOR®</span>
          <span className="flex items-center gap-1.5">
            <EqualHousingIcon />
            <span>Equal Housing Opportunity</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
