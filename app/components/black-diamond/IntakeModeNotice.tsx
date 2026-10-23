import type { PublicIntakeReadiness } from "../../lib/publicIntakeCapability";

export const LIVE_HOME_VALUE_URL = "https://www.askmagicmike.com/home-value";

const summaries: Record<PublicIntakeReadiness, string> = {
  checking: "Checking availability. Please wait.",
  live: "Live Home Value intake — ready for your request.",
  unknown: "Availability not confirmed. Saving is paused.",
  read_only: "Read-only demo. Do not enter personal details.",
  synthetic_qa: "Fictional QA details only. No outbound contact.",
};

export function IntakeModeNotice({ mode, onRecheck, className = "" }: {
  mode: PublicIntakeReadiness;
  onRecheck?: () => void;
  className?: string;
}) {
  return (
    <div data-intake-mode={mode}
      className={`rounded-xl border border-[#e2c06f]/40 bg-[#e2c06f]/10 px-4 py-3 text-sm leading-6 text-[#f4ead4] ${className}`}>
      {/* All summaries occupy the same grid cell. Inactive, inert copies size
          the slot at the actual width/text size; only the current one is read
          or visible. No clipping, fixed height, or readiness-driven form jump. */}
      <div className="grid" role="status" aria-live="polite" aria-atomic="true">
        {Object.entries(summaries).map(([key, text]) => (
          <p key={key} aria-hidden={key !== mode ? true : undefined}
            className={`col-start-1 row-start-1 font-semibold ${key !== mode ? "invisible select-none" : ""}`}>{text}</p>
        ))}
      </div>
      {onRecheck ? <button type="button" onClick={onRecheck} disabled={mode === "checking"}
        className="mt-1 inline-flex min-h-11 items-center text-left font-semibold text-[#e2c06f] underline underline-offset-4 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e2c06f]">
        Check availability again
      </button> : null}
      <details className="text-[#d9ceb8]">
        <summary className="flex min-h-11 cursor-pointer items-center underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e2c06f]">About this form’s availability</summary>
        <p>
          {mode === "checking" ? "Please wait before sharing personal details."
          : mode === "unknown" ? "We could not confirm this form’s availability. This does not establish read-only mode or mean a previous request failed. Your details and any unresolved request reference remain here. Checking again only checks availability; it does not send a request."
          : mode === "synthetic_qa"
            ? "Synthetic QA only — not a live intake. Use only clearly labeled fictional test details, not personal information. Requests here are isolated tests; outbound contact is disabled."
            : mode === "read_only" ? "Read-only demo — requests cannot be saved here. You can explore the form as a demo, but do not enter personal contact details. Use the live form to request Mike’s review."
            : "Review your address and contact details before sending. Availability is advisory; only a saved request receipt confirms capture. It does not confirm an appointment, appraisal or human contact."}
        </p>
      {mode === "read_only" || mode === "synthetic_qa" ? (
        <a href={LIVE_HOME_VALUE_URL} referrerPolicy="no-referrer" rel="noreferrer"
          className="mt-2 inline-flex min-h-11 items-center font-semibold text-[#e2c06f] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e2c06f]">
          Open the live Home Value form
        </a>
      ) : null}
      </details>
    </div>
  );
}
