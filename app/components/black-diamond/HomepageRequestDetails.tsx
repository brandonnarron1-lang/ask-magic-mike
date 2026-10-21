"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PUBLIC_INTAKE_PENDING_EVENT, readPendingHomeValueRequest } from "../../lib/homeValuePendingRequest";

/** Retain mounted legacy forms and exact in-flight state, without competing
 * with the offer links. A reference opens recovery; it never creates a send. */
export function HomepageRequestDetails({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const reveal = () => {
      if (window.location.hash === `#${id}` || readPendingHomeValueRequest()) setOpen(true);
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    window.addEventListener(PUBLIC_INTAKE_PENDING_EVENT, reveal);
    return () => {
      window.removeEventListener("hashchange", reveal);
      window.removeEventListener(PUBLIC_INTAKE_PENDING_EVENT, reveal);
    };
  }, [id]);
  return <details id={id} open={open} className="min-w-0 scroll-mt-8 rounded-lg border border-[#cda24a44] bg-[#101214] p-5"
    onToggle={event => {
      if (readPendingHomeValueRequest() && !event.currentTarget.open) {
        event.currentTarget.open = true;
        return;
      }
      setOpen(event.currentTarget.open);
    }}>
    <summary className="min-h-11 cursor-pointer py-2 font-semibold text-[#f4ead4] focus-visible:outline-2 focus-visible:outline-cyan-300">{title}</summary>
    <div className="mt-4 min-w-0">{children}</div>
  </details>;
}
