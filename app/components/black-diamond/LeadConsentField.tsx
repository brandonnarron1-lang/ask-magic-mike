import type { Ref } from "react";
import { LEAD_CONSENT_LANGUAGE_TEXT, LEAD_CONSENT_LANGUAGE_VERSION } from "../../lib/leadConsent";

type LeadConsentFieldProps = {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  required?: boolean;
  inputRef?: Ref<HTMLInputElement>;
};

export function LeadConsentField({ checked, onChange, required = false, inputRef }: LeadConsentFieldProps) {
  return (
    <div className="rounded-md border border-white/15 bg-black/30 p-4 sm:col-span-2">
      <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-6 text-[#e4dac8]">
        <input
          ref={inputRef}
          type="checkbox"
          name="consent"
          value="yes"
          checked={checked}
          onChange={onChange ? (event) => onChange(event.target.checked) : undefined}
          required={required}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#cda24a]"
        />
        <span>
          {LEAD_CONSENT_LANGUAGE_TEXT}
          <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#b7aa94]">
            Consent language version: {LEAD_CONSENT_LANGUAGE_VERSION}{required ? " · Required" : ""}
          </span>
        </span>
      </label>
    </div>
  );
}
