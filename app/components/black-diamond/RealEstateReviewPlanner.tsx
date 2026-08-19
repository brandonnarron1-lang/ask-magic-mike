"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "../../lib/analytics";
import { readAttribution } from "../../lib/attribution";
import {
  FOCUS_OPTIONS,
  GOAL_OPTIONS,
  HORIZON_OPTIONS,
  REVIEW_PLAN_STORAGE_KEY,
  buildReviewPlan,
  createReviewPlanState,
  parseStoredReviewPlan,
  reviewPlanFreshness,
  type ReviewFocus,
  type ReviewGoal,
  type ReviewHorizon,
  type ReviewPlanPhase,
  type ReviewPlanState,
} from "../../lib/reviewPlanner";

const PHASES: Array<{ key: ReviewPlanPhase; label: string; description: string }> = [
  { key: "now", label: "Now", description: "Start with reversible, evidence-first steps." },
  { key: "prepare", label: "Prepare", description: "Organize the facts and questions that matter." },
  { key: "decide", label: "Decide", description: "Use verified context before committing." },
];

function ChoiceButton({
  selected,
  label,
  description,
  onClick,
}: {
  selected: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-28 rounded-lg border p-4 text-left transition ${
        selected
          ? "border-[#e2c06f] bg-[#cda24a1f] shadow-[0_0_0_1px_rgba(226,192,111,.18)]"
          : "border-[#cda24a33] bg-black/25 hover:border-[#e2c06f88]"
      }`}
    >
      <span className="block font-semibold text-[#f4ead4]">{label}</span>
      <span className="mt-2 block text-sm leading-6 text-[#d9ceb8]">{description}</span>
    </button>
  );
}

export function RealEstateReviewPlanner() {
  const [goal, setGoal] = useState<ReviewGoal>("seller");
  const [horizon, setHorizon] = useState<ReviewHorizon>("90_days");
  const [focus, setFocus] = useState<ReviewFocus>("clarity");
  const [planState, setPlanState] = useState<ReviewPlanState | null>(null);
  const [storageStatus, setStorageStatus] = useState<"checking" | "device" | "memory">("checking");
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const stored = parseStoredReviewPlan(window.localStorage.getItem(REVIEW_PLAN_STORAGE_KEY));
      if (stored) {
        setPlanState(stored);
        setGoal(stored.goal);
        setHorizon(stored.horizon);
        setFocus(stored.focus);
        setRestored(true);
      }
      setStorageStatus("device");
    } catch {
      setStorageStatus("memory");
    }
  }, []);

  const definition = useMemo(
    () => (planState ? buildReviewPlan(planState.goal, planState.horizon, planState.focus) : null),
    [planState],
  );
  const completedCount = planState?.completedTaskIds.length ?? 0;
  const progress = definition ? Math.round((completedCount / definition.tasks.length) * 100) : 0;
  const freshness = planState ? reviewPlanFreshness(planState) : null;

  function persist(next: ReviewPlanState) {
    setPlanState(next);
    try {
      window.localStorage.setItem(REVIEW_PLAN_STORAGE_KEY, JSON.stringify(next));
      setStorageStatus("device");
    } catch {
      setStorageStatus("memory");
    }
  }

  function startPlan() {
    const next = createReviewPlanState(goal, horizon, focus);
    persist(next);
    setRestored(false);
    const attribution = readAttribution();
    trackEvent("review_plan_started", attribution, { goal, horizon, focus });
    trackEvent("review_plan_saved", attribution, { goal, horizon, focus, completed_count: 0 });
  }

  function toggleTask(taskId: string) {
    if (!planState) return;
    setRestored(false);
    const wasCompleted = planState.completedTaskIds.includes(taskId);
    const completedTaskIds = wasCompleted
      ? planState.completedTaskIds.filter((id) => id !== taskId)
      : [...planState.completedTaskIds, taskId];
    const next = { ...planState, completedTaskIds, updatedAt: new Date().toISOString() };
    persist(next);
    const attribution = readAttribution();
    trackEvent("review_plan_saved", attribution, {
      goal: next.goal,
      horizon: next.horizon,
      focus: next.focus,
      completed_count: completedTaskIds.length,
    });
    if (!wasCompleted) {
      trackEvent("review_plan_task_completed", attribution, {
        goal: next.goal,
        horizon: next.horizon,
        focus: next.focus,
        task_id: taskId,
      });
    }
  }

  function resetPlan() {
    setPlanState(null);
    setRestored(false);
    try {
      window.localStorage.removeItem(REVIEW_PLAN_STORAGE_KEY);
    } catch {
      setStorageStatus("memory");
    }
  }

  function trackHandoff() {
    if (!planState) return;
    trackEvent("review_plan_handoff_clicked", readAttribution(), {
      goal: planState.goal,
      horizon: planState.horizon,
      focus: planState.focus,
      completed_count: completedCount,
    });
  }

  if (!planState || !definition) {
    return (
      <section aria-labelledby="review-planner-heading" className="amm-glass-card rounded-xl p-5 sm:p-7 lg:p-9">
        <div className="flex flex-col gap-4 border-b border-[#cda24a2e] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="amm-eyebrow">Private planning workspace</p>
            <h2 id="review-planner-heading" className="mt-3 font-serif text-3xl text-[#f4ead4] sm:text-4xl">
              Build your real-estate review plan.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[#d9ceb8]">
            No name, address, email, phone, or free text. No contact or property details are sent. Non-contact planner events may record controlled selections, progress, campaign attribution, and device context.
          </p>
        </div>

        <fieldset className="mt-8">
          <legend className="text-lg font-semibold text-[#f4ead4]">1. What are you planning?</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {GOAL_OPTIONS.map((option) => (
              <ChoiceButton key={option.key} selected={goal === option.key} label={`${option.marker} · ${option.label}`} description={option.description} onClick={() => setGoal(option.key)} />
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-9">
          <legend className="text-lg font-semibold text-[#f4ead4]">2. What is your current horizon?</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {HORIZON_OPTIONS.map((option) => (
              <ChoiceButton key={option.key} selected={horizon === option.key} label={option.label} description={option.description} onClick={() => setHorizon(option.key)} />
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-9">
          <legend className="text-lg font-semibold text-[#f4ead4]">3. Where should the plan focus?</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FOCUS_OPTIONS.map((option) => (
              <ChoiceButton key={option.key} selected={focus === option.key} label={option.label} description={option.description} onClick={() => setFocus(option.key)} />
            ))}
          </div>
        </fieldset>

        <div className="mt-9 flex flex-col gap-3 border-t border-[#cda24a2e] pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-[#d9ceb8]">This is an organizer, not a valuation, offer, property search, inspection, survey, lending decision, or legal advice.</p>
          <button type="button" onClick={startPlan} className="amm-primary-button shrink-0 px-7">Create my plan</button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="active-review-plan-heading" className="amm-glass-card rounded-xl p-5 sm:p-7 lg:p-9">
      <div aria-live="polite" className="sr-only">
        {restored ? "Your saved review plan was restored from this device." : `Plan progress is ${progress} percent.`}
      </div>
      <div className="grid gap-7 border-b border-[#cda24a2e] pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="amm-eyebrow">{restored ? "Continue your saved plan" : definition.label}</p>
          <h2 id="active-review-plan-heading" className="mt-3 max-w-3xl font-serif text-4xl leading-tight text-[#f4ead4] sm:text-5xl">
            {definition.headline}
          </h2>
          <p className="mt-4 max-w-3xl leading-7 text-[#d9ceb8]">{definition.summary}</p>
        </div>
        <div className="min-w-52 rounded-lg border border-[#cda24a40] bg-black/30 p-5">
          <div className="flex items-end justify-between gap-5">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#e2c06f]">Progress</span>
            <span className="font-mono text-2xl text-[#f4ead4]">{progress}%</span>
          </div>
          <div role="progressbar" aria-label="Review plan progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#cda24a] to-[#22c6d2] transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-xs leading-5 text-[#d9ceb8]">{completedCount} of {definition.tasks.length} steps complete</p>
        </div>
      </div>

      <div className="mt-6 grid items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] sm:flex sm:flex-wrap">
        <span className="w-fit rounded-full border border-[#cda24a40] px-3 py-2 text-[#e2c06f]">
          {storageStatus === "device" ? "Saved on this device" : storageStatus === "memory" ? "Available in this tab only" : "Checking device storage"}
        </span>
        <span className={`w-fit rounded-full border px-3 py-2 ${freshness?.stale ? "border-[#22c6d266] text-[#22c6d2]" : "border-white/10 text-[#d9ceb8]"}`}>
          {freshness?.stale ? `Refresh recommended · ${freshness.ageDays} days old` : "Current review"}
        </span>
        <span className="w-fit rounded-full border border-white/10 px-3 py-2 text-[#d9ceb8]">No contact data sent</span>
      </div>

      <div className="mt-9 space-y-10">
        {PHASES.map((phase) => {
          const tasks = definition.tasks.filter((task) => task.phase === phase.key);
          return (
            <section key={phase.key} aria-labelledby={`review-phase-${phase.key}`}>
              <div className="grid gap-2 sm:grid-cols-[9rem_1fr] sm:items-end">
                <h3 id={`review-phase-${phase.key}`} className="font-serif text-3xl text-[#f4ead4]">{phase.label}</h3>
                <p className="text-sm text-[#d9ceb8]">{phase.description}</p>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {tasks.map((task) => {
                  const completed = planState.completedTaskIds.includes(task.id);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      aria-pressed={completed}
                      onClick={() => toggleTask(task.id)}
                      className={`group rounded-lg border p-5 text-left transition ${completed ? "border-[#22c6d280] bg-[#22c6d20b]" : "border-[#cda24a33] bg-black/25 hover:border-[#e2c06f88]"}`}
                    >
                      <span className="flex items-start gap-4">
                        <span aria-hidden="true" className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-sm ${completed ? "border-[#22c6d2] bg-[#22c6d2] text-[#050505]" : "border-[#e2c06f80] text-[#e2c06f]"}`}>
                          {completed ? "✓" : "·"}
                        </span>
                        <span>
                          <span className={`block font-semibold ${completed ? "text-[#d9ceb8] line-through decoration-[#22c6d2]" : "text-[#f4ead4]"}`}>{task.title}</span>
                          <span className="mt-2 block text-sm leading-6 text-[#d9ceb8]">{task.description}</span>
                          <span className="mt-3 block border-l border-[#cda24a66] pl-3 text-xs leading-5 text-[#b9ad96]">Why this matters: {task.why}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-10 grid gap-5 rounded-lg border border-[#cda24a40] bg-black/35 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="amm-eyebrow">When you want human review</p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d9ceb8]">
            Your planner state is not prefilled into the next page. The next page is the existing secure intake, where you choose what to submit.
          </p>
        </div>
        <Link href={definition.handoffHref} onClick={trackHandoff} className="amm-primary-button px-6">{definition.handoffLabel}</Link>
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        <button type="button" onClick={() => window.print()} className="amm-secondary-button px-5">Print this plan</button>
        <button type="button" onClick={resetPlan} className="amm-secondary-button px-5">Start a different plan</button>
      </div>
    </section>
  );
}
