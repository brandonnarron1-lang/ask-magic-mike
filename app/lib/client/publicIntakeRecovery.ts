"use client";

import { useEffect, useRef, useState } from "react";
import { tryCreateBrowserSubmissionId } from "../browserSubmissionId";
import { clearPendingHomeValueRequest, readPendingHomeValueRequest, rememberPendingHomeValueRequest } from "../homeValuePendingRequest";
import { publicLeadOutcomeFromResponse, publicLeadTransportOutcome, type PublicLeadOutcome } from "../publicLeadReceipt";

type FrozenRequest = { key: string; body: string };
type RequestState = { status: "editing" | "submitting" } | PublicLeadOutcome;

/** Shares the existing tab-level, reference-only guard with Home Value. An
 * unresolved request in either funnel must not silently become a fresh lead.
 * Payload/PII/consent stay only in this mounted document; no automatic retry. */
export function usePublicIntakeRecovery() {
  const [key, setKey] = useState<string | null>(null);
  const [state, setState] = useState<RequestState>({ status: "editing" });
  const [restored, setRestored] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const frozen = useRef<FrozenRequest | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const attempt = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const retryAt = state.status === "not_saved" && state.retryAfter ? Date.parse(state.retryAfter.retryAt) : null;
  const locked = restored || state.status === "submitting" || state.status === "saved" || state.status === "unconfirmed" ||
    (state.status === "not_saved" && state.retryPolicy !== "edit");

  useEffect(() => {
    mounted.current = true;
    const pending = readPendingHomeValueRequest();
    if (pending) {
      setKey(pending.key); setRestored(true); setState(publicLeadTransportOutcome());
    } else setKey(tryCreateBrowserSubmissionId());
    function cancelAttempt() {
      ++attempt.current;
      controller.current?.abort(); controller.current = null; inFlight.current = false;
    }
    function interrupt() {
      if (!inFlight.current) return;
      cancelAttempt();
      setState(publicLeadTransportOutcome());
    }
    function pageShow(event: PageTransitionEvent) { if (event.persisted) interrupt(); }
    window.addEventListener("pagehide", interrupt);
    window.addEventListener("pageshow", pageShow);
    return () => {
      mounted.current = false; cancelAttempt();
      window.removeEventListener("pagehide", interrupt); window.removeEventListener("pageshow", pageShow);
    };
  }, []);

  useEffect(() => {
    if (retryAt === null) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  async function send(request: FrozenRequest): Promise<PublicLeadOutcome | null> {
    if (inFlight.current || !mounted.current || restored || (retryAt !== null && Date.now() < retryAt)) return null;
    inFlight.current = true;
    const token = ++attempt.current;
    const activeController = new AbortController(); controller.current = activeController;
    setPersistent(rememberPendingHomeValueRequest(request.key)); setState({ status: "submitting" });
    let timeout = false;
    const timer = window.setTimeout(() => { timeout = true; activeController.abort(); }, 30_000);
    let outcome: PublicLeadOutcome;
    try {
      const response = await fetch("/api/leads", {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": request.key },
        body: request.body, signal: activeController.signal,
      });
      outcome = await publicLeadOutcomeFromResponse(response);
      if (outcome.status === "saved" && outcome.receipt.session_id !== request.key.toLowerCase()) outcome = publicLeadTransportOutcome();
    } catch { outcome = publicLeadTransportOutcome(timeout ? "timeout" : "transport_error"); }
    finally { window.clearTimeout(timer); }
    if (!mounted.current || token !== attempt.current) return null;
    inFlight.current = false; controller.current = null;
    if (outcome.status === "saved" || (outcome.status === "not_saved" && outcome.retryPolicy === "edit")) {
      clearPendingHomeValueRequest(request.key); frozen.current = null;
    }
    setState(outcome);
    return outcome;
  }

  function start(body: string) {
    if (!key || locked || inFlight.current) return Promise.resolve(null);
    const request = { key, body };
    frozen.current = request;
    return send(request);
  }
  function retry() {
    if (!frozen.current || (state.status !== "unconfirmed" && !(state.status === "not_saved" && state.retryPolicy === "same_payload"))) return Promise.resolve(null);
    return send(frozen.current);
  }
  function clearEditableFailure() {
    if (state.status === "not_saved" && state.retryPolicy === "edit") setState({ status: "editing" });
  }
  // Event-time check, never a render-time read. Also suppress duplicate step
  // telemetry before React has committed the disabled/submitting UI.
  function isBusy() { return inFlight.current; }
  return { key, state, restored, persistent, locked, start, retry, clearEditableFailure, isBusy,
    canRetry: !restored && (state.status === "unconfirmed" || (state.status === "not_saved" && state.retryPolicy === "same_payload")),
    retrySeconds: retryAt === null ? 0 : Math.max(0, Math.ceil((retryAt - now) / 1000)),
  };
}
