"use client";

import { useMemo, useState } from "react";
import {
  buildOpenHouseRegistrationPacket,
  normalizeOpenHouseRegistrationReference,
  openHouseRegistrationAssetHref,
} from "../../lib/growth/open-house-registration";
import { CopyDemandAsset } from "./CopyDemandAsset";

export function OpenHouseQrPacketBuilder() {
  const [value, setValue] = useState("");
  const reference = useMemo(
    () => normalizeOpenHouseRegistrationReference(value),
    [value],
  );
  const packet = useMemo(
    () => (reference ? buildOpenHouseRegistrationPacket(reference) : null),
    [reference],
  );
  const hasInput = value.trim().length > 0;

  return (
    <div id="open-house-qr-builder" className="scroll-mt-24" data-open-house-qr-packet="true">
      <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <label
            htmlFor="open-house-public-reference"
            className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#a99f90]"
          >
            Public event or listing reference
          </label>
          <input
            id="open-house-public-reference"
            value={value}
            onChange={(event) => setValue(event.currentTarget.value)}
            maxLength={96}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="open-house-reference-help open-house-reference-status"
            aria-invalid={hasInput && !packet ? true : undefined}
            placeholder="quinn-drive-september-open-house"
            className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#050505] px-4 py-3 text-sm text-[#f4ead4] outline-none placeholder:text-[#5f5a52] focus:border-[#4baab8] focus:ring-1 focus:ring-[#4baab8]"
          />
          <p id="open-house-reference-help" className="mt-2 text-xs leading-5 text-[#8f8778]">
            Use a verified public-safe reference—not an email, phone number,
            consumer name, secret, URL, or free-form note. The builder
            normalizes spaces to hyphens and never saves the value.
          </p>
          <p
            id="open-house-reference-status"
            className={`mt-3 min-h-5 text-xs ${
              hasInput && !packet ? "text-[#ffcabd]" : "text-[#79a4aa]"
            }`}
            aria-live="polite"
          >
            {hasInput && !packet
              ? "Use 4–72 public-safe letters, numbers, spaces, or hyphens."
              : packet
                ? `Canonical reference: ${packet.reference}`
                : "Enter a reference to prepare a review-only packet."}
          </p>
        </div>

        <div className="rounded-xl border border-[#4baab833] bg-[#061417] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9edbe2]">
            Deterministic result
          </p>
          {packet ? (
            <>
              <p className="mt-2 text-sm font-semibold text-[#f4ead4]">
                {packet.displayLabel}
              </p>
              <dl className="mt-3 space-y-3 text-xs leading-5">
                <div>
                  <dt className="font-bold uppercase tracking-[0.1em] text-[#6f6a61]">Public registration</dt>
                  <dd className="mt-1 break-all text-[#9edbe2]">{packet.trackedUrl}</dd>
                </div>
                <div>
                  <dt className="font-bold uppercase tracking-[0.1em] text-[#6f6a61]">QR shortlink</dt>
                  <dd className="mt-1 break-all text-[#d9ceb8]">{packet.shortUrl}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={packet.trackedUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-9 items-center rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#d9ceb8] transition hover:border-[#4baab866] hover:text-[#9edbe2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9edbe2]"
                >
                  Inspect registration route
                </a>
                <CopyDemandAsset label="Copy tracked link" value={packet.trackedUrl} />
                <CopyDemandAsset label="Copy QR shortlink" value={packet.shortUrl} />
                <a
                  href={openHouseRegistrationAssetHref(packet.reference, "qr_svg") || undefined}
                  download
                  className="inline-flex min-h-9 items-center rounded-full border border-[#4baab844] bg-[#06171b] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.11em] text-[#a9eaf0] transition hover:border-[#4baab888] hover:bg-[#0a2226] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9edbe2]"
                >
                  Download QR SVG
                </a>
                <a
                  href={openHouseRegistrationAssetHref(packet.reference, "packet_json") || undefined}
                  download
                  className="inline-flex min-h-9 items-center rounded-full border border-[#cda24a55] bg-[#171108] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.11em] text-[#f5dfa7] transition hover:bg-[#241a0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0cf79]"
                >
                  Download review packet
                </a>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[#8f8778]">
              No link, QR, lead, event, or provider action is created until a
              valid public-safe reference is present.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[#cda24a44] bg-[#171108] p-4 text-xs leading-6 text-[#c9bdab]">
        <strong className="text-[#f0cf79]">Review boundary:</strong> this tool
        prepares files only. Verify property, host, date, time, availability,
        and access facts; complete a two-device scan; then obtain the exact
        approval before publishing, printing, placing, or sending the QR.
      </div>
    </div>
  );
}
