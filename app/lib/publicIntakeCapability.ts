"use client";

import { useEffect, useState } from "react";

export type PublicIntakeMode = "read_only" | "live" | "synthetic_qa";
export type PublicIntakeCapability = "checking" | PublicIntakeMode;

/** Only the categorical capability is consumed; health details stay opaque. */
export function readPublicIntakeCapability(value: unknown): PublicIntakeMode {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "read_only";
  const health = value as Record<string, unknown>;
  if (health.ok !== true || health.service !== "ask-magic-mike") return "read_only";
  return health.public_intake === "live" || health.public_intake === "synthetic_qa"
    ? health.public_intake
    : "read_only";
}

/** Advisory UX only: neither a successful health check nor this hook authorizes a POST. */
export function usePublicIntakeCapability(): PublicIntakeCapability {
  const [mode, setMode] = useState<PublicIntakeCapability>("checking");

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
        if (!disposed && version === requestVersion) setMode("read_only");
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
          ? readPublicIntakeCapability(await response.json())
          : "read_only";
        if (!disposed && !controller.signal.aborted && version === requestVersion) setMode(capability);
      } catch {
        if (!disposed && !controller.signal.aborted && version === requestVersion) setMode("read_only");
      } finally {
        window.clearTimeout(timeout);
        if (active?.controller === controller) active = null;
      }
    }

    function pageShow() {
      void check();
    }
    void check();
    window.addEventListener("pageshow", pageShow);
    return () => {
      disposed = true;
      cancelRequest();
      window.removeEventListener("pageshow", pageShow);
    };
  }, []);

  return mode;
}
