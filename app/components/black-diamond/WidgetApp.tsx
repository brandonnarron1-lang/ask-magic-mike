"use client";

import { useEffect, useMemo, useState } from "react";
import { AskMikeChatPanel } from "./AskMikeChatPanel";
import { HomeValueFunnel } from "./HomeValueFunnel";
import { SellerIntentSection } from "./SellerIntentSection";
import { BuyerIntentSection } from "./BuyerIntentSection";
import { PageTracker } from "./PageTracker";
import type { Attribution } from "../../lib/leadPayload";
import { postToWidgetParent } from "../../lib/widgetMessaging";
import { widgetFullFormQuery } from "../../lib/widgetFullForm";
import { PUBLIC_INTAKE_PENDING_EVENT, readPendingHomeValueRequest } from "../../lib/homeValuePendingRequest";
import { PublicMikeContact } from "./PublicMikeContact";

type Tab = "value" | "buy" | "ask" | "sell";

export function WidgetApp() {
  const [active, setActive] = useState<Tab>("value");
  const [askVisited, setAskVisited] = useState(false);
  const [personRequest, setPersonRequest] = useState(0);
  const [fullFormQuery, setFullFormQuery] = useState(() => widgetFullFormQuery(""));
  const [pending, setPending] = useState(false);
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
      placement_id: params.get("placement_id") || params.get("placement") || "sitewide-floating",
      listing_id: params.get("listing_id") || undefined,
      property_id: params.get("property_id") || undefined,
      agent_id: params.get("agent_id") || undefined,
      page_title: params.get("page_title") || undefined,
      gclid: params.get("gclid") || undefined,
      gbraid: params.get("gbraid") || undefined,
      wbraid: params.get("wbraid") || undefined,
      fbclid: params.get("fbclid") || undefined,
      msclkid: params.get("msclkid") || undefined,
    };
  }, []);

  useEffect(() => {
    setFullFormQuery(widgetFullFormQuery(window.location.search));
    postToWidgetParent({ type: "askmagicmike:opened" }, attributionOverrides as Attribution);
  }, [attributionOverrides]);

  useEffect(() => {
    const changed = () => setPending(Boolean(readPendingHomeValueRequest()));
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) postToWidgetParent({ type: "askmagicmike:close" }, attributionOverrides as Attribution);
    };
    changed();
    window.addEventListener(PUBLIC_INTAKE_PENDING_EVENT, changed);
    window.addEventListener("keydown", escape);
    return () => { window.removeEventListener(PUBLIC_INTAKE_PENDING_EVENT, changed); window.removeEventListener("keydown", escape); };
  }, [attributionOverrides]);

  function selectTab(tab: Tab) {
    // Check synchronously too; a second gesture must not beat a React commit.
    if (readPendingHomeValueRequest() && tab !== active) { setPending(true); return false; }
    setActive(tab);
    if (tab === "ask") setAskVisited(true);
    return true;
  }

  return (
    <main className="min-h-screen bg-[#050505] text-[#f4ead4]">
      <PageTracker funnelName="widget" />
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-[#cda24a33] bg-[linear-gradient(135deg,#080808,rgba(34,198,210,.08))] px-4 py-4">
          <h1 className="text-xs font-bold uppercase tracking-[0.2em] text-[#e2c06f]">Ask Magic Mike</h1>
          <p className="mt-1 text-sm text-[#d9ceb8]">Your next move, made clearer · Our Town Properties, Inc.</p>
          <div className="mt-3"><PublicMikeContact surface="widget" compact /></div>
          <button type="button" disabled={pending && active !== "ask"} onClick={() => {
            if (selectTab("ask")) setPersonRequest(value => value + 1);
          }} className="amm-primary-button mt-3 min-h-11 w-full px-4 py-3 disabled:opacity-60">Request a person</button>
        </header>
        <nav className="grid grid-cols-2 gap-1 border-b border-[#cda24a24] bg-black p-2" role="tablist" aria-label="Ask Magic Mike paths">
          {[
            ["value", "Home Value Review"],
            ["buy", "Buying Help"],
            ["sell", "Selling Options"],
            ["ask", "Ask a Question"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              tabIndex={active === key ? 0 : -1}
              id={`widget-tab-${key}`}
              aria-controls="widget-path-panel"
              aria-selected={active === key}
              disabled={pending && active !== key}
              onClick={() => selectTab(key as Tab)}
              onKeyDown={(event) => {
                const paths: Tab[] = ["value", "buy", "sell", "ask"];
                const index = paths.indexOf(key as Tab);
                const next = event.key === "ArrowRight" ? paths[(index + 1) % paths.length]
                  : event.key === "ArrowLeft" ? paths[(index + paths.length - 1) % paths.length]
                  : event.key === "Home" ? paths[0] : event.key === "End" ? paths.at(-1) : null;
                if (!next) return;
                event.preventDefault();
                if (selectTab(next)) document.getElementById(`widget-tab-${next}`)?.focus();
              }}
              className={`min-h-12 min-w-0 rounded-xl px-2 py-3 text-sm font-semibold leading-5 [overflow-wrap:anywhere] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22c6d2] ${
                active === key ? "bg-[#cda24a] text-black" : "text-[#d9ceb8] hover:text-[#f4ead4]"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div id="widget-path-panel" role="tabpanel" aria-labelledby={`widget-tab-${active}`} className="min-w-0 flex-1 p-4">
          {active === "value" ? (
            <HomeValueFunnel surface="widget" compact attributionOverrides={attributionOverrides} />
          ) : null}
          {active === "buy" ? <BuyerIntentSection surface="widget" compact attributionOverrides={attributionOverrides} /> : null}
          {askVisited ? <div hidden={active !== "ask"}><AskMikeChatPanel surface="widget" compact personRequest={personRequest}/></div> : null}
          {active === "sell" ? <SellerIntentSection surface="widget" compact variant="options" initialOption="compare" /> : null}
        </div>
        <footer className="border-t border-[#cda24a24] px-4 py-3 text-sm text-[#d9ceb8]">
          {pending ? <p role="status" className="leading-6">Keep this form open while the request is unresolved. Check its saved reference before starting another request.</p> : <a href={`https://www.askmagicmike.com${active === "buy" ? "/buy" : active === "ask" ? "/ask" : active === "sell" ? "/sell" : "/home-value"}?${active === "sell" ? "seller_option=compare&" : ""}${fullFormQuery}`} onClick={event => { if (readPendingHomeValueRequest()) { event.preventDefault(); setPending(true); } }} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4">
            Open full form
          </a>}
          {!pending ? <p className="mt-1 text-xs">If the embedded form is unavailable, continue securely in a new tab.</p> : null}
        </footer>
      </div>
    </main>
  );
}
