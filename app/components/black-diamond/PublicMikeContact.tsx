"use client";

import { MessageSquare, Phone } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { trackEvent } from "../../lib/analytics";
import { readAttribution } from "../../lib/attribution";

type Props = {
  surface: "public_header" | "public_footer" | "widget" | "thank_you" | "intake_confirmation" | "widget_preview";
  compact?: boolean;
};

/** In-flow public contact only. Never submits intake or uses a prospect target.
 * No fixed overlay, external-app auto-launch, message body or private storage. */
export function PublicMikeContact({ surface, compact = false }: Props) {
  const actionClass = "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold leading-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#22c6d2]";
  return (
    <aside aria-label="Contact Magic Mike" data-public-mike-contact
      className={`min-w-0 text-[#f4ead4] ${compact ? "flex flex-wrap items-center gap-x-4 gap-y-2" : "space-y-3 rounded-2xl border border-[#cda24a40] bg-[#101011] p-4"}`}>
      {!compact ? <p className="text-sm leading-6">Prefer to talk? <strong>{siteConfig.agentName}</strong> · {siteConfig.parentBrandName}</p> : null}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <a data-mike-call href={`tel:${siteConfig.agentPhone}`} aria-label={`Call Magic Mike at ${siteConfig.agentPhoneDisplay}`}
          onClick={() => trackEvent("phone_click", readAttribution(), { surface })}
          className={`${actionClass} border border-[#e2c06f66] bg-[#e2c06f] text-[#14110b] hover:bg-[#f4d88d]`}>
          <Phone aria-hidden="true" size={16} className="shrink-0" />
          <span>Call Magic Mike<span className="block text-xs font-normal tabular-nums">{siteConfig.agentPhoneDisplay}</span></span>
        </a>
        <a data-mike-text href={`sms:${siteConfig.agentPhone}`} aria-label="Text Magic Mike — opens your messaging app"
          onClick={() => trackEvent("sms_composer_opened", readAttribution(), { surface })}
          className={`${actionClass} border border-[#cda24a66] bg-[#101011] text-[#f4ead4] hover:border-[#e2c06f]`}>
          <MessageSquare aria-hidden="true" size={16} className="shrink-0" />Text
        </a>
      </div>
      {!compact ? <p className="text-xs leading-5 text-[#d9ceb8]">Call or Text opens your own app; this page does not submit an inquiry or send a text. Contact-intent analytics may be recorded. On a computer, use the number above on your phone. Text receipt has not been verified.</p> : null}
    </aside>
  );
}
