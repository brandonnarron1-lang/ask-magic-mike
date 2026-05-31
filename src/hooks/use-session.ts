"use client";

import { useState, useEffect, useCallback } from "react";

const SESSION_KEY = "amm_session_id";
const SESSION_EXPIRY_KEY = "amm_session_expiry";

interface SessionState {
  sessionId: string | null;
  loading: boolean;
  error: string | null;
}

export function useSession(attribution?: {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrerType?: string;
  landingPage?: string;
}) {
  const [state, setState] = useState<SessionState>({
    sessionId: null,
    loading: true,
    error: null,
  });

  const createSession = useCallback(async () => {
    try {
      const res = await fetch("/api/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utmSource: attribution?.utmSource ?? null,
          utmMedium: attribution?.utmMedium ?? null,
          utmCampaign: attribution?.utmCampaign ?? null,
          referrerType: attribution?.referrerType ?? "direct",
          landingPage: attribution?.landingPage ?? window.location.pathname,
          userAgent: navigator.userAgent,
          deviceType: getDeviceType(),
        }),
      });

      if (!res.ok) throw new Error("Session creation failed");

      const data = (await res.json()) as {
        sessionId: string;
        expiresAt: string;
      };

      localStorage.setItem(SESSION_KEY, data.sessionId);
      localStorage.setItem(SESSION_EXPIRY_KEY, data.expiresAt);

      setState({ sessionId: data.sessionId, loading: false, error: null });
      return data.sessionId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setState({ sessionId: null, loading: false, error: msg });
      return null;
    }
  }, [attribution]);

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);

    if (stored && expiry && new Date(expiry) > new Date()) {
      setState({ sessionId: stored, loading: false, error: null });
      return;
    }

    createSession();
  }, [createSession]);

  return { ...state, createSession };
}

function getDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return "mobile";
  if (/Tablet|iPad/i.test(ua)) return "tablet";
  return "desktop";
}
