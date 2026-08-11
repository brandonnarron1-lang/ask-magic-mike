import { LEAD_CONSENT_LANGUAGE_TEXT, LEAD_CONSENT_LANGUAGE_VERSION } from "../../lib/leadConsent";

export function LeadConsentField({ checked, onChange }: { checked?: boolean; onChange?: (checked: boolean) => void }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/25 p-3 sm:col-span-2">
      <label className="flex items-start gap-3 text-sm leading-6 text-[#d9ceb8]">
        <input
          type="checkbox"
          name="consent"
          value="yes"
          checked={checked}
          onChange={onChange ? (event) => onChange(event.target.checked) : undefined}
          className="mt-1 h-4 w-4 accent-[#cda24a]"
        />
        <span>
          {LEAD_CONSENT_LANGUAGE_TEXT}
          <span className="mt-1 block text-[11px] uppercase tracking-[0.12em] text-[#8f8778]">
            Consent language version: {LEAD_CONSENT_LANGUAGE_VERSION}
          </span>
        </span>
      </label>
    </div>
  );
}
