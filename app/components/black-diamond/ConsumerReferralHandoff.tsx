"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { trackEvent } from "../../lib/analytics";
import { readAttribution } from "../../lib/attribution";
import {
  buildPublicReferralPacket,
  type PublicReferralSurface,
} from "../../lib/publicReferral";

type ReferralStatus =
  | "idle"
  | "share_opened"
  | "share_unavailable"
  | "copied"
  | "manual_copy";

const STATUS_COPY: Record<Exclude<ReferralStatus, "idle">, string> = {
  share_opened: "Share options opened. You choose the person and app.",
  share_unavailable: "Native sharing is unavailable here. Use Copy referral link instead.",
  copied: "Referral link copied.",
  manual_copy: "Automatic copy is unavailable. The full link is selected for you to copy.",
};

export function ConsumerReferralHandoff({
  surface,
}: {
  surface: PublicReferralSurface;
}) {
  const packet = buildPublicReferralPacket(surface);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<ReferralStatus>("idle");

  function recordHandoff(
    event: "referral_share_handoff" | "referral_link_copied",
    method: "native" | "clipboard",
  ) {
    trackEvent(event, readAttribution(), {
      surface,
      share_method: method,
    });
  }

  async function copyReferralLink() {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(packet.url);
        recordHandoff("referral_link_copied", "clipboard");
        setStatus("copied");
        return;
      } catch {
        // Some browsers expose Clipboard but deny it by policy. Continue to
        // the visible, user-controlled manual-copy fallback.
      }
    }

    linkInputRef.current?.focus();
    linkInputRef.current?.select();
    setStatus("manual_copy");
  }

  async function shareReferralLink() {
    if (typeof navigator.share !== "function") {
      await copyReferralLink();
      return;
    }

    try {
      await navigator.share(packet);
      recordHandoff("referral_share_handoff", "native");
      setStatus("share_opened");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setStatus("share_unavailable");
    }
  }

  return (
    <section className="border-t border-[#cda24a2e] bg-[#050505] px-5 py-16 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.02fr_.98fr] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e2c06f]">
            Local help, worth sharing
          </p>
          <h2 className="mt-4 max-w-3xl font-serif text-4xl leading-tight text-[#f4ead4] sm:text-5xl">
            Know someone planning a move in Wilson or Eastern North Carolina?
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#d9ceb8] sm:text-lg">
            Send them a direct path to ask Mike about buying, selling, renting,
            or timing. The link opens Ask Magic Mike and keeps their request
            private until they choose to submit it.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#8f8778]">
            Generic link only. Your form answers, saved plan, contact details,
            and browsing history are not included.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#cda24a55] bg-[#111113] shadow-[0_24px_80px_rgba(0,0,0,.38)]">
          <Image
            src="/brand/black-diamond/og-card-1200x630.jpg"
            alt="Ask Magic Mike and Our Town Properties referral preview"
            width={1200}
            height={630}
            sizes="(min-width: 1024px) 46vw, 100vw"
            className="h-auto w-full border-b border-[#cda24a33]"
          />
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={shareReferralLink}
                className="amm-primary-button min-h-12 flex-1 px-5 py-3"
              >
                Share Ask Magic Mike
              </button>
              <button
                type="button"
                onClick={copyReferralLink}
                className="amm-secondary-button min-h-12 flex-1 px-5 py-3"
              >
                Copy referral link
              </button>
            </div>
            <label htmlFor="amm-public-referral-link" className="sr-only">
              Ask Magic Mike referral link
            </label>
            <input
              ref={linkInputRef}
              id="amm-public-referral-link"
              value={packet.url}
              readOnly
              spellCheck={false}
              className="mt-4 w-full rounded-md border border-[#cda24a2e] bg-black/35 px-3 py-2 font-mono text-xs text-[#b8ad98] outline-none focus:border-[#e2c06f] focus:ring-2 focus:ring-[#e2c06f55]"
            />
            <p
              className="mt-3 min-h-6 text-sm leading-6 text-[#d9ceb8]"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {status === "idle"
                ? "Nothing is sent until you choose a person or copy the link."
                : STATUS_COPY[status]}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
