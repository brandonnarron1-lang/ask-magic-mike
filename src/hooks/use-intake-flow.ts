"use client";

import { useState, useCallback } from "react";
import type { CTAChip, PrimaryIntent, TimelineMonths } from "@/types/domain.types";
import { normalizeToE164 } from "@/lib/utils/phone";

export interface IntakeFormData {
  question: string;
  address: string;
  ctaChip: CTAChip | null;
  intent: PrimaryIntent;
  timelineMonths: TimelineMonths | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  consentSms: boolean;
  consentCall: boolean;
  consentEmail: boolean;
}

export interface IntakeFlowState {
  step: number;
  data: IntakeFormData;
  sessionId: string | null;
  submitting: boolean;
  submitted: boolean;
  leadId: string | null;
  score: {
    sellerCertaintyScore: number;
    buyerCertaintyScore: number;
    compositeScore: number;
    temperature: string;
  } | null;
  error: string | null;
}

const TOTAL_STEPS = 5;

const DEFAULT_DATA: IntakeFormData = {
  question: "",
  address: "",
  ctaChip: null,
  intent: "unknown",
  timelineMonths: null,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  consentSms: false,
  consentCall: false,
  consentEmail: false,
};

export function useIntakeFlow(
  sessionId: string | null,
  initialData?: Partial<IntakeFormData>
) {
  const [state, setState] = useState<IntakeFlowState>({
    step: 1,
    data: { ...DEFAULT_DATA, ...initialData },
    sessionId,
    submitting: false,
    submitted: false,
    leadId: null,
    score: null,
    error: null,
  });

  const updateData = useCallback((updates: Partial<IntakeFormData>) => {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, ...updates },
    }));
  }, []);

  const nextStep = useCallback(async () => {
    setState((prev) => {
      const nextStepNum = Math.min(prev.step + 1, TOTAL_STEPS);

      // Partial save fire-and-forget
      if (sessionId) {
        fetch("/api/intake/step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            step: nextStepNum,
            data: prev.data,
          }),
        }).catch(() => {});
      }

      return { ...prev, step: nextStepNum };
    });
  }, [sessionId]);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: Math.max(prev.step - 1, 1),
    }));
  }, []);

  const submit = useCallback(async () => {
    if (!sessionId) return;

    setState((prev) => ({ ...prev, submitting: true, error: null }));

    try {
      const data = state.data;
      const phone = data.phone ? normalizeToE164(data.phone) : null;

      const res = await fetch("/api/intake/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          email: data.email || null,
          phone,
          addressRaw: data.address || null,
          primaryIntent: data.intent,
          questionRaw: data.question || null,
          timelineMonths: data.timelineMonths,
          consentSms: data.consentSms,
          consentCall: data.consentCall,
          consentEmail: data.consentEmail,
          ctaChipUsed: data.ctaChip,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Submission failed");
      }

      const result = await res.json();

      setState((prev) => ({
        ...prev,
        submitting: false,
        submitted: true,
        leadId: result.leadId,
        score: result.score,
        step: TOTAL_STEPS,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        submitting: false,
        error: err instanceof Error ? err.message : "Something went wrong",
      }));
    }
  }, [sessionId, state.data]);

  return {
    ...state,
    totalSteps: TOTAL_STEPS,
    progress: (state.step / TOTAL_STEPS) * 100,
    updateData,
    nextStep,
    prevStep,
    submit,
  };
}
