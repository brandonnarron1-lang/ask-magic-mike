import type { Ref } from "react";
import { LEAD_CONSENT_LANGUAGE_TEXT, LEAD_CONSENT_LANGUAGE_VERSION } from "../../lib/leadConsent";
import { REQUEST_RECEIPT_COPY } from "../../lib/requestReceiptContract";

type LeadConsentFieldProps = {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  required?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  receiptDefaultChecked?: boolean;
  receiptAvailable?: boolean;
};

export function LeadConsentField({ checked, onChange, required = false, inputRef, receiptDefaultChecked = false, receiptAvailable = false }: LeadConsentFieldProps) {
  return (
    <div className="amm-consent-surface rounded-md border border-white/15 bg-black/30 p-4 sm:col-span-2">
      <label className="flex flex-wrap cursor-pointer items-start gap-3 text-[.9375rem] leading-6 text-[#e4dac8]">
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
        <span className="min-w-[min(100%,200px)] flex-1">
          {LEAD_CONSENT_LANGUAGE_TEXT}
          <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#b7aa94]">
            Consent language version: {LEAD_CONSENT_LANGUAGE_VERSION}{required ? " · Required" : ""}
          </span>
        </span>
      </label>
      {receiptAvailable ? <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 border-t border-white/15 pt-4 text-sm leading-6 text-[#e4dac8]">
        <input type="checkbox" name="receipt_email_requested" value="yes" defaultChecked={receiptDefaultChecked} className="mt-1 h-5 w-5 shrink-0 accent-[#cda24a]" />
        <span>{REQUEST_RECEIPT_COPY} <span className="block text-xs text-[#b7aa94]">Optional · only if you supply an email address.</span></span>
      </label> : <p className="mt-4 border-t border-white/15 pt-4 text-sm leading-6 text-[#e4dac8]">Email receipts are currently unavailable. A saved request is confirmed on this page.</p>}
    </div>
  );
}
