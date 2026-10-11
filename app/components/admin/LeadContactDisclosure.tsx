"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const ContactDisclosure = createContext<(() => void) | undefined>(undefined);
export const useInvalidateContactDisclosure = () => useContext(ContactDisclosure);

/** Receives server-rendered children, never an unfiltered lead DTO. A denied
 * fresh permission read removes the contact UI until a new authorized page. */
export function LeadContactDisclosure({ leadId, children }: { leadId: string; children: ReactNode }) {
  const parent = useContext(ContactDisclosure);
  const [denied, setDenied] = useState(false);
  const invalidate = useCallback(() => setDenied(true), []);
  if (parent) return <>{children}</>;
  if (denied) return <section aria-label="Lead access unavailable" role="status" className="rounded-xl border border-[#7f1d1d] p-4 text-sm text-[#ffd7d7]">
    Access changed or your session expired. Saved contact details are no longer displayed.
    <a className="mt-2 block min-h-11 py-3 text-[#e2c06f] underline" href={`/lead-center-login?returnTo=${encodeURIComponent(`/admin/leads/${leadId}`)}`}>Sign in to review access</a>
  </section>;
  return <ContactDisclosure.Provider value={invalidate}>{children}</ContactDisclosure.Provider>;
}
