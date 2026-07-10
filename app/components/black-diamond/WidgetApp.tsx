"use client";

import { useEffect, useMemo, useState } from "react";
import { AskMikeChatPanel } from "./AskMikeChatPanel";
import { HomeValueFunnel } from "./HomeValueFunnel";
import { SellerIntentSection } from "./SellerIntentSection";
import { PageTracker } from "./PageTracker";
import type { Attribution } from "../../lib/leadPayload";

type Tab = "value" | "ask" | "sell";

export function WidgetApp() {
  const [active, setActive] = useState<Tab>("value");
  const attributionOverrides = useMemo<Partial<Attribution>>(() => {
    if (typeof window === "undefined") return {};
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get("utm_source") || params.get("source") || "widget",
      medium: params.get("utm_medium") || params.get("medium") || "embed",
      campaign: params.get("utm_campaign") || params.get("campaign") || undefined,
      parent_url: params.get("parent_url") || undefined,
      embed_host: params.get("embed_host") || undefined,
      placement: params.get("placement") || "sitewide-floating",
    };
  }, []);

  useEffect(() => {
    window.parent?.postMessage({ type: "askmagicmike:opened" }, "*");
  }, []);

  return (
    <main className="min-h-screen bg-[#050505] text-[#f4ead4]">
      <PageTracker funnelName="widget" />
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-[#cda24a33] bg-[linear-gradient(135deg,#080808,rgba(34,198,210,.08))] px-4 py-4">
          <h1 className="text-xs font-bold uppercase tracking-[0.2em] text-[#e2c06f]">Ask Magic Mike</h1>
          <p className="mt-1 text-sm text-[#d9ceb8]">Local guidance from Our Town Properties</p>
        </header>
        <nav className="grid grid-cols-3 border-b border-[#cda24a24] bg-black" role="tablist" aria-label="Ask Magic Mike paths">
          {[
            ["value", "Get My Home Value"],
            ["ask", "Ask a Question"],
            ["sell", "Selling Options"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active === key}
              onClick={() => setActive(key as Tab)}
              className={`min-h-12 px-2 py-3 text-xs font-bold uppercase tracking-[0.1em] transition ${
                active === key ? "bg-[#cda24a] text-black" : "text-[#d9ceb8] hover:text-[#f4ead4]"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="flex-1 overflow-auto p-4">
          {active === "value" ? (
            <HomeValueFunnel surface="widget" compact attributionOverrides={attributionOverrides} />
          ) : null}
          {active === "ask" ? <AskMikeChatPanel surface="widget" compact /> : null}
          {active === "sell" ? <SellerIntentSection surface="widget" compact /> : null}
        </div>
      </div>
    </main>
  );
}
