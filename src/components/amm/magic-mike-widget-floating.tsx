"use client";

import { useState, useCallback, useEffect } from "react";
import { MagicMikeWidgetLauncher } from "./magic-mike-widget-launcher";
import { MagicMikeWidgetController } from "./magic-mike-widget-controller";

interface MagicMikeWidgetFloatingProps {
  /** Listing id (when mounted on a listing detail page). */
  listingId?: string | null;
  /** Accessible label for the launcher button. */
  label?: string;
  /** Initial state — closed by default; set `defaultOpen` for the
   *  /widget-preview live-demo cell. */
  defaultOpen?: boolean;
}

/**
 * MagicMikeWidgetFloating
 *
 * The real production wiring of the widget.
 *
 *  - Renders the `MagicMikeWidgetLauncher` floating bottom-right.
 *  - When the user opens it, mounts the `MagicMikeWidgetController` in a
 *    fixed overlay anchored above the launcher.
 *  - `Escape` closes the overlay.
 *  - The launcher and the overlay are siblings — no portal, no
 *    z-index acrobatics required.
 */
export function MagicMikeWidgetFloating({
  listingId,
  label = "Ask Magic Mike",
  defaultOpen = false,
}: MagicMikeWidgetFloatingProps) {
  const [open, setOpen] = useState(defaultOpen);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      {open && (
        <div
          data-testid="magic-mike-widget-overlay"
          className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-50 max-h-[82vh] w-[min(420px,94vw)] overflow-auto"
        >
          <MagicMikeWidgetController
            listingId={listingId ?? null}
            onClose={close}
          />
        </div>
      )}

      <MagicMikeWidgetLauncher
        onClick={() => setOpen((v) => !v)}
        label={label}
        active={open}
      />
    </>
  );
}
