import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { REVIEW_PLAN_STORAGE_KEY } from "../../app/lib/reviewPlanner";

const trackEventMock = vi.fn();

vi.mock("../../app/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

vi.mock("../../app/lib/attribution", () => ({
  readAttribution: () => ({ source: "review_planner_test" }),
}));

import { RealEstateReviewPlanner } from "../../app/components/black-diamond/RealEstateReviewPlanner";

describe("RealEstateReviewPlanner UI", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
        clear: () => values.clear(),
        key: (index: number) => [...values.keys()][index] ?? null,
        get length() { return values.size; },
      },
    });
    window.localStorage.clear();
    trackEventMock.mockReset();
  });

  it("creates and persists a non-PII plan without submitting a lead", async () => {
    render(<RealEstateReviewPlanner />);
    fireEvent.click(screen.getByRole("button", { name: /create my plan/i }));

    expect(await screen.findByRole("heading", { name: /prepare the decision before the property conversation/i })).toBeInTheDocument();
    const stored = JSON.parse(window.localStorage.getItem(REVIEW_PLAN_STORAGE_KEY) ?? "{}");
    expect(Object.keys(stored).sort()).toEqual([
      "completedTaskIds",
      "focus",
      "generatedAt",
      "goal",
      "horizon",
      "updatedAt",
      "version",
    ]);
    expect(JSON.stringify(stored)).not.toMatch(/name|email|phone|address|notes|message/i);
    expect(trackEventMock).toHaveBeenCalledWith("review_plan_started", expect.any(Object), {
      goal: "seller",
      horizon: "90_days",
      focus: "clarity",
    });
    const noContactStatus = screen.getByText("No contact data sent");
    expect(noContactStatus).toBeInTheDocument();
    expect(noContactStatus).toHaveClass("w-fit");
    expect(noContactStatus.parentElement).toHaveClass("grid", "sm:flex", "sm:flex-wrap");
  });

  it("restores progress, records an allowlisted task event, and can reset locally", async () => {
    render(<RealEstateReviewPlanner />);
    fireEvent.click(screen.getByRole("button", { name: /create my plan/i }));
    const task = await screen.findByRole("button", { name: /write the outcome that matters most/i });
    fireEvent.click(task);
    expect(task).toHaveAttribute("aria-pressed", "true");
    expect(trackEventMock).toHaveBeenCalledWith("review_plan_task_completed", expect.any(Object), expect.objectContaining({ task_id: "seller-outcome" }));

    fireEvent.click(screen.getByRole("button", { name: /start a different plan/i }));
    await waitFor(() => expect(window.localStorage.getItem(REVIEW_PLAN_STORAGE_KEY)).toBeNull());
    expect(screen.getByRole("button", { name: /create my plan/i })).toBeInTheDocument();
  });

  it("announces updated progress after a saved plan is restored", async () => {
    const now = new Date().toISOString();
    window.localStorage.setItem(REVIEW_PLAN_STORAGE_KEY, JSON.stringify({
      version: 1,
      goal: "seller",
      horizon: "90_days",
      focus: "clarity",
      completedTaskIds: [],
      generatedAt: now,
      updatedAt: now,
    }));

    render(<RealEstateReviewPlanner />);
    const task = await screen.findByRole("button", { name: /write the outcome that matters most/i });
    expect(screen.getByText("Your saved review plan was restored from this device.")).toBeInTheDocument();
    fireEvent.click(task);
    expect(screen.getByText("Plan progress is 14 percent.")).toBeInTheDocument();
  });

  it("shows no contact, address, narrative, subscription, or send controls", () => {
    render(<RealEstateReviewPlanner />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/email|phone|address|message|notes/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send|subscribe|alert/i })).not.toBeInTheDocument();
  });
});
