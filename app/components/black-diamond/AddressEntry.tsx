"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { formatAddress, normalizeAddressValue, type AddressComponents, type AddressResolvedSuggestion, type AddressSuggestion, type AddressValue } from "../../lib/address/addressValue";
import { TextField } from "./FormField";

type Props = { inputRef: RefObject<HTMLInputElement | null>; value: AddressValue | null; initialText: string;
  disabled: boolean; invalid?: boolean; errorId?: string; onChange: (text: string) => void; onAccept: (value: AddressValue) => void };
type State = "idle" | "loading" | "results" | "no_results" | "unavailable" | "rate_limited";
const fields: Array<[keyof AddressComponents, string, string, number, string]> = [
  ["line1", "Street address", "address_line1", 200, "address-line1"],
  ["line2", "Unit / apartment (if applicable)", "address_line2", 100, "address-line2"],
  ["locality", "City / locality", "address_city", 100, "address-level2"],
  ["region", "State / region", "address_region", 80, "address-level1"],
  ["postalCode", "ZIP / postal code", "address_postal", 24, "postal-code"],
  ["country", "Country code (e.g. US)", "address_country", 2, "country"],
];
function explicitlyEnteredUnit(text: string): string {
  // Retain an explicit unit marker verbatim, never infer one from a building.
  return text.match(/(?:\b(?:apt\.?|apartment|unit|suite|ste\.?)\s+|#\s*)[\p{L}\p{N}-]+/iu)?.[0] ?? "";
}

/** Uncontrolled native values survive provider updates and autofill without events.
 * Lookup state is separate from the lead's frozen submission key/payload. */
export function AddressEntry({ inputRef, value, initialText, disabled, invalid, errorId, onChange, onAccept }: Props) {
  const id = useId();
  const [enabled, setEnabled] = useState(false);
  const [query, setQuery] = useState(initialText);
  const [state, setState] = useState<State>("idle");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [proposal, setProposal] = useState<{ original: string; result: AddressResolvedSuggestion; components: AddressComponents } | null>(null);
  const [manual, setManual] = useState(Boolean(value?.components.line1));
  const [status, setStatus] = useState("");
  const refs = useRef<Partial<Record<keyof AddressComponents, HTMLInputElement>>>({});
  const selectionSequence = useRef(0);
  const request = useRef<AbortController | null>(null);
  const session = useRef<string | null>(null);
  const proposalRef = useRef<HTMLDivElement>(null);
  const manualFocusRequested = useRef(false);

  // Focus only after React commits the destination. A frame callback can run
  // before a concurrent commit and miss the panel or focus still-hidden fields.
  useLayoutEffect(() => {
    if (proposal) proposalRef.current?.focus();
    else if (manual && manualFocusRequested.current) {
      manualFocusRequested.current = false;
      refs.current.line1?.focus();
    }
  }, [proposal, manual]);

  useEffect(() => {
    const sequence = selectionSequence;
    const abort = new AbortController();
    const timer = window.setTimeout(() => abort.abort(), 4000);
    fetch("/api/address-suggestions", { signal: abort.signal, cache: "no-store", redirect: "error", referrerPolicy: "no-referrer" })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (!abort.signal.aborted && data?.enabled === true) {
        // A person may have typed before the capability returned. The native
        // field, not an older React snapshot, seeds the optional lookup.
        setQuery(inputRef.current?.value ?? ""); setEnabled(true);
      } })
      .catch(() => { /* Missing capability never blocks manual input. */ });
    return () => { window.clearTimeout(timer); abort.abort(); request.current?.abort(); sequence.current++; };
  }, [inputRef]);

  useEffect(() => {
    if (!enabled || disabled || query.trim().length < 5) {
      // A fresh empty array on every keystroke caused a second commit even
      // when lookup was off. Rapid native typing reproduced React #185 in the
      // built app. Clear actual results only; an already empty list is a no-op.
      setSuggestions(current => current.length ? [] : current); setOpen(false); return;
    }
    const abort = new AbortController();
    const sequence = ++selectionSequence.current;
    const timer = window.setTimeout(async () => {
      if (!session.current) session.current = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : null;
      if (!session.current) { setState("unavailable"); return; }
      request.current?.abort(); request.current = abort;
      setState("loading"); setProposal(null);
      const timeout = window.setTimeout(() => abort.abort(), 5000);
      try {
        const response = await fetch("/api/address-suggestions", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operation: "suggest", query, sessionToken: session.current }), signal: abort.signal, redirect: "error", referrerPolicy: "no-referrer" });
        const data = response.ok ? await response.json() : { state: response.status === 429 ? "rate_limited" : "unavailable" };
        if (sequence !== selectionSequence.current || inputRef.current?.value !== query) return;
        const results: AddressSuggestion[] = data.state === "results" && Array.isArray(data.suggestions) ? data.suggestions.slice(0, 5) : [];
        setSuggestions(results); setActive(-1); setOpen(results.length > 0);
        setState(results.length ? "results" : data.state === "no_results" ? "no_results" : data.state === "rate_limited" ? "rate_limited" : "unavailable");
      } catch { if (sequence === selectionSequence.current) { setState("unavailable"); setOpen(false); setSuggestions([]); } }
      finally { window.clearTimeout(timeout); }
    }, 250);
    return () => { window.clearTimeout(timer); abort.abort(); };
  }, [query, enabled, disabled, inputRef]);

  async function select(suggestion: AddressSuggestion) {
    const original = inputRef.current?.value ?? "";
    if (original !== query || !session.current) return;
    const lookupSession = session.current;
    const sequence = ++selectionSequence.current;
    request.current?.abort(); const abort = new AbortController(); request.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 5000);
    setOpen(false); setState("loading");
    try {
      const response = await fetch("/api/address-suggestions", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "resolve", query: original, sessionToken: lookupSession, candidateToken: suggestion.token }), signal: abort.signal, redirect: "error", referrerPolicy: "no-referrer" });
      const data = response.ok ? await response.json() : null;
      if (sequence !== selectionSequence.current || inputRef.current?.value !== original) return;
      if (data?.state !== "resolved" || !data.result?.components?.line1 || data.result.id !== suggestion.id) throw new Error("unavailable");
      const result = data.result as AddressResolvedSuggestion;
      const unit = refs.current.line2?.value.trim() || value?.components.line2 || explicitlyEnteredUnit(original);
      const components = { ...result.components, line2: unit || result.components.line2 };
      normalizeAddressValue({ version: 1, enteredText: original, acceptedText: formatAddress(components), components, confirmation: "manual", validation: "not_performed" });
      setProposal({ original, result, components }); setState("idle");
    } catch { if (sequence === selectionSequence.current) { setState("unavailable"); setStatus("Suggestion could not be resolved. Your entry is unchanged; use manual entry."); } }
    finally { window.clearTimeout(timeout); if (session.current === lookupSession) session.current = null; }
  }

  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); setActive(-1); return; }
    if (event.key === "Tab") { setOpen(false); return; }
    if (suggestions.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault(); setOpen(true);
      setActive(index => event.key === "ArrowDown" ? (index + 1) % suggestions.length : (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (open && event.key === "Enter") {
      event.preventDefault(); if (active >= 0) void select(suggestions[active]);
    }
  }

  function applyProposal() {
    if (!proposal || inputRef.current?.value !== proposal.original) { setProposal(null); return; }
    const acceptedText = formatAddress(proposal.components);
    if (acceptedText.length > 500) { setStatus("This suggestion is too long. Keep your entry or edit the fields manually."); return; }
    if (inputRef.current) inputRef.current.value = acceptedText;
    for (const [key] of fields) if (refs.current[key]) refs.current[key]!.value = proposal.components[key];
    setManual(true); setProposal(null); setSuggestions([]); setOpen(false);
    onChange(acceptedText);
    onAccept({ version: 1, enteredText: proposal.original, acceptedText, components: proposal.components,
      confirmation: "user_confirmed_suggestion", validation: "not_performed", reportedProvider: "google_places_new", reportedPlaceId: proposal.result.id });
    setStatus("Suggestion accepted by you. Address validation has not been performed."); inputRef.current?.focus();
  }

  return <div className="min-w-0 space-y-3">
    <TextField label="Property address" name="address" inputRef={inputRef} defaultValue={initialText} disabled={disabled} required
      maxLength={500} autoComplete="street-address" placeholder="Street, unit, city, state and ZIP"
      role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`}
      aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
      aria-describedby={[`${id}-help`, invalid ? errorId : ""].filter(Boolean).join(" ")} aria-invalid={invalid}
      onKeyDown={keyDown} onBlur={() => { setOpen(false); }}
      onChange={event => {
        selectionSequence.current++; request.current?.abort();
        // Do not enqueue redundant nil/empty updates on every native key. With
        // lookup disabled the input itself owns the query; no lookup render is
        // needed. Real selection/error states are still cleared immediately.
        if (proposal) setProposal(null); if (status) setStatus("");
        if (open) setOpen(false); if (active !== -1) setActive(-1);
        if (suggestions.length) setSuggestions([]);
        if (enabled) setQuery(event.target.value);
        onChange(event.target.value);
        // A new search is not an edit of the previously resolved property.
        // Clear stale components except the separately entered unit.
        for (const [key] of fields) if (key !== "line2" && refs.current[key]) refs.current[key]!.value = "";
      }} />
    <p id={`${id}-help`} className="text-sm leading-6 text-[#d9ceb8]">{enabled ? "Choose a suggestion to review it, or enter the address manually." : "Type the full address, including any unit. You can edit each part below."} Your entry is not postal, parcel or ownership verification.</p>
    {open ? <ul id={`${id}-list`} role="listbox" aria-label="Address suggestions" className="rounded-md border border-[#cda24a66] bg-[#11100d] p-1">
      {suggestions.map((suggestion, index) => <li role="option" aria-selected={index === active} id={`${id}-option-${index}`} key={suggestion.id}
        onPointerDown={event => event.preventDefault()} onMouseDown={event => event.preventDefault()} onClick={() => void select(suggestion)}
        className={`min-h-11 cursor-pointer rounded p-3 text-sm [overflow-wrap:anywhere] ${index === active ? "bg-[#cda24a33]" : ""}`}>
        <span className="block font-semibold text-[#f4ead4]">{suggestion.label}</span><span className="block text-[#d9ceb8]">{suggestion.secondary}</span>
      </li>)}
      <li role="presentation" className="px-3 py-2 font-sans text-sm font-normal not-italic tracking-normal text-white"><span translate="no" className="whitespace-nowrap">Google Maps</span></li>
    </ul> : null}
    <p role="status" aria-live="polite" className="text-sm text-[#d9ceb8]">{status || (state === "loading" ? "Looking up suggestions…" : state === "no_results" ? "No suggestions found. You can keep your address and continue manually." : state === "unavailable" || state === "rate_limited" ? "Address lookup is unavailable. Keep your entry or use the manual fields." : "")}</p>
    {proposal ? <div ref={proposalRef} tabIndex={-1} aria-label="Review suggested correction" className="space-y-3 rounded-md border border-[#cda24a66] p-3 text-sm">
      <p><strong>You entered:</strong> {proposal.original}</p><p><strong>Suggested:</strong> {formatAddress(proposal.components)}</p>
      <p translate="no" className="whitespace-nowrap font-sans text-sm font-normal not-italic tracking-normal text-white">Google Maps</p>
      <p>Review street, unit, city, state and ZIP. Missing values are not inferred. This is a suggestion, not address validation.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={disabled} onClick={applyProposal} className="amm-primary-button min-h-11 px-3 py-3">Use suggested address</button>
        <button type="button" disabled={disabled} onClick={() => { setProposal(null); setStatus("Your original entry is kept."); inputRef.current?.focus(); }} className="amm-secondary-button min-h-11 px-3 py-3">Keep my entry</button>
        <button type="button" disabled={disabled} onClick={() => { manualFocusRequested.current = true; setProposal(null); setManual(true); }} className="amm-secondary-button min-h-11 px-3 py-3">Edit address</button>
      </div>
    </div> : null}
    <button type="button" aria-expanded={manual} aria-controls={`${id}-manual`} disabled={disabled}
      onClick={() => setManual(current => !current)} className="min-h-11 py-3 text-sm font-semibold text-[#e2c06f] underline">{manual ? "Hide manual address fields" : "Enter / edit address manually"}</button>
    <div id={`${id}-manual`} hidden={!manual} className="grid min-w-0 gap-3 sm:grid-cols-2">
      {fields.map(([key, label, name, maximum, autoComplete]) => <TextField key={key} label={label} name={name}
        defaultValue={value?.components[key] ?? ""} disabled={disabled} maxLength={maximum} autoComplete={autoComplete}
        inputRef={element => { if (element) refs.current[key] = element; }}
        onChange={() => { selectionSequence.current++; request.current?.abort(); setProposal(null); setStatus("Edited by you. Address validation has not been performed."); }} />)}
      <p className="text-sm leading-6 text-[#d9ceb8] sm:col-span-2">Keep any unit number. If a field is unknown, leave it blank for broker review; do not guess a ZIP or street number. Add a street before other structured fields.</p>
    </div>
  </div>;
}
