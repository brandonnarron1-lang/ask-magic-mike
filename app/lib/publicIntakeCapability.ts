"use client";

import { useCallback, useEffect, useState } from "react";

export type PublicIntakeMode = "read_only" | "live" | "synthetic_qa";
export type PublicIntakeCapability = "checking" | PublicIntakeMode;
export type PublicIntakeReadiness = PublicIntakeCapability | "unknown";

/** An unavailable/malformed check is not an attestation of read-only mode. */
export function readPublicIntakeReadiness(value: unknown): PublicIntakeMode | "unknown" {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "unknown";
  const health = value as Record<string, unknown>;
  if (health.ok !== true || health.service !== "ask-magic-mike") return "unknown";
  return health.public_intake === "live" || health.public_intake === "synthetic_qa" || health.public_intake === "read_only"
    ? health.public_intake
    : "unknown";
}

/** Only the categorical capability is consumed; health details stay opaque. */
export function readPublicIntakeCapability(value: unknown): PublicIntakeMode {
  const mode = readPublicIntakeReadiness(value);
  return mode === "unknown" ? "read_only" : mode;
}

/** Advisory UX only: neither a successful health check nor this hook authorizes a POST. */
export function usePublicIntakeReadiness() {
  const [mode, setMode] = useState<PublicIntakeReadiness>("checking");
  const [generation, setGeneration] = useState(0);
  const recheck = useCallback(() => {
    setMode("checking");
    setGeneration(current => current + 1);
  }, []);

  useEffect(() => {
    let disposed = false;
    let requestVersion = 0;
    let active: { controller: AbortController; timeout: number } | null = null;

    function cancelRequest() {
      if (!active) return;
      active.controller.abort();
      window.clearTimeout(active.timeout);
      active = null;
    }

    async function check() {
      cancelRequest();
      const version = ++requestVersion;
      const controller = new AbortController();
      setMode("checking");
      const timeout = window.setTimeout(() => {
        controller.abort();
        if (!disposed && version === requestVersion) setMode("unknown");
      }, 8_000);
      active = { controller, timeout };
      try {
        // No query, form values, storage, or referrer is sent with this GET.
        const response = await fetch("/api/health/live", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
          redirect: "error",
          referrerPolicy: "no-referrer",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim();
        const capability = response.ok && !response.redirected && contentType === "application/json"
          ? readPublicIntakeReadiness(await response.json())
          : "unknown";
        if (!disposed && !controller.signal.aborted && version === requestVersion) setMode(capability);
      } catch {
        if (!disposed && !controller.signal.aborted && version === requestVersion) setMode("unknown");
      } finally {
        window.clearTimeout(timeout);
        if (active?.controller === controller) active = null;
      }
    }

    function pageShow(event: PageTransitionEvent) {
      // A new document is already checked on mount. Its ordinary pageshow can
      // arrive during that fetch; restarting would cancel the same body read.
      // A cached document does not remount, so it must revalidate on return.
      if (event.persisted) void check();
    }
    void check();
    window.addEventListener("pageshow", pageShow);
    return () => {
      disposed = true;
      cancelRequest();
      window.removeEventListener("pageshow", pageShow);
    };
  }, [generation]);

  return { mode, recheck };
}

/** Compatibility for existing consumers: unknown remains closed, never live. */
export function usePublicIntakeCapability(): PublicIntakeCapability {
  const { mode } = usePublicIntakeReadiness();
  return mode === "unknown" ? "read_only" : mode;
}
