"use client";

import { useEffect } from "react";

const sections = new Set([
  "follow-up", "appointment-review", "activity", "property-evidence-review",
  "message-review", "next-action-review", "contact-review",
]);

/** Reveal only existing lead panels. This changes presentation, never records. */
export function revealLeadSection(id: string) {
  if (!sections.has(id)) return;
  const target = document.getElementById(id);
  if (!target) return;
  for (let ancestor = target.parentElement; ancestor; ancestor = ancestor.parentElement) {
    if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
  }
  const panel = target instanceof HTMLDetailsElement
    ? target : target.querySelector<HTMLDetailsElement>(":scope > details");
  if (panel) panel.open = true;
  const focusTarget = panel?.querySelector<HTMLElement>(":scope > summary") || target;
  if (focusTarget.tagName !== "SUMMARY") focusTarget.tabIndex = -1;
  focusTarget.focus({ preventScroll: true });
  focusTarget.scrollIntoView({ block: "start" });
}

export function LeadSectionNavigation({ leadId, isTest }: { leadId: string; isTest: boolean }) {
  useEffect(() => {
    const revealHash = () => revealLeadSection(window.location.hash.slice(1));
    revealHash();
    window.addEventListener("hashchange", revealHash);
    return () => window.removeEventListener("hashchange", revealHash);
  }, [leadId]);

  return <nav aria-label="Lead next steps" className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#e2c06f]">
    {[["follow-up", isTest ? "Review tasks" : "Log result / next task"], ["appointment-review", "Appointments"], ["activity", "History"]].map(([id, label]) =>
      <a key={id} className="py-2 underline" href={`#${id}`} onClick={event => {
        if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) revealLeadSection(id);
      }}>{label}</a>)}
  </nav>;
}
