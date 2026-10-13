import type { PublicIntakeCapability } from "../../lib/publicIntakeCapability";

export const LIVE_HOME_VALUE_URL = "https://www.askmagicmike.com/home-value";

export function IntakeModeNotice({ mode, className = "" }: {
  mode: PublicIntakeCapability;
  className?: string;
}) {
  if (mode === "live") return <p data-intake-mode="live" className={`text-sm font-semibold text-[#e2c06f] ${className}`}>Live Home Value intake</p>;

  return (
    <div role="status" aria-live="polite" aria-atomic="true" data-intake-mode={mode}
      className={`rounded-xl border border-[#e2c06f]/40 bg-[#e2c06f]/10 px-4 py-3 text-sm leading-6 text-[#f4ead4] ${className}`}>
      <p className="font-semibold">
        {mode === "checking" ? "Checking this form’s availability…"
          : mode === "synthetic_qa" ? "Synthetic QA only — not a live intake."
            : "Read-only demo — requests cannot be saved here."}
      </p>
      <p className="text-[#d9ceb8]">
        {mode === "checking" ? "Please wait before sharing personal details."
          : mode === "synthetic_qa"
            ? "Use only clearly labeled fictional test details, not personal information. Requests here are isolated tests; outbound contact is disabled."
            : "You can explore the form as a demo, but do not enter personal contact details. Use the live form to request Mike’s review."}
      </p>
      {mode !== "checking" && (
        <a href={LIVE_HOME_VALUE_URL} referrerPolicy="no-referrer" rel="noreferrer"
          className="mt-2 inline-flex min-h-11 items-center font-semibold text-[#e2c06f] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e2c06f]">
          Open the live Home Value form
        </a>
      )}
    </div>
  );
}
