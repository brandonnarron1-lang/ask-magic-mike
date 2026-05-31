export function Footer() {
  return (
    <footer className="relative border-t border-gold-400/10 bg-[#080806] px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <svg width="28" height="28" viewBox="0 0 60 60" fill="none">
                <rect x="2" y="2" width="56" height="56" rx="4" fill="#0A0A0A" stroke="#D4A017" strokeWidth="2"/>
                <path d="M30 8 C18 8 10 18 10 28 L10 50 L20 50 L20 36 L40 36 L40 50 L50 50 L50 28 C50 18 42 8 30 8Z" fill="none" stroke="#D4A017" strokeWidth="2.5"/>
                <rect x="23" y="36" width="14" height="14" rx="1" fill="none" stroke="#D4A017" strokeWidth="2"/>
              </svg>
              <div>
                <div className="text-xs font-semibold tracking-[0.15em] uppercase text-gold-400">Ask Magic Mike</div>
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
            <h4 className="text-xs font-semibold tracking-[0.15em] uppercase text-cream mb-4">Contact</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div><a href="tel:2522454337" className="hover:text-gold-400 transition-colors">252-245-4337</a></div>
              <div><a href="tel:2522437700" className="hover:text-gold-400 transition-colors">252-243-7700 (office)</a></div>
              <div><a href="https://ourtownproperties.com" className="hover:text-gold-400 transition-colors">ourtownproperties.com</a></div>
              <div className="text-slate-500">Wilson, NC · Eastern NC</div>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold tracking-[0.15em] uppercase text-cream mb-4">Disclosures</h4>
            <p className="text-[11px] leading-relaxed text-slate-600">
              Mike Eatmon is a licensed North Carolina real estate professional (Our Town
              Properties, Inc. Broker). All market data is approximate and for informational
              purposes only. AVM estimates are not appraisals. Past sales performance does not
              guarantee future results. Equal Housing Opportunity.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="gold-rule mb-6" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} Our Town Properties, Inc. · Mike Eatmon, REALTOR®</span>
          <span className="flex items-center gap-2">
            <span>🏠</span>
            <span>Equal Housing Opportunity</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
