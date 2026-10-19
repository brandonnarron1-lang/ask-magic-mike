import { randomUUID } from "node:crypto";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnswerFeedback } from "../../app/components/black-diamond/AnswerFeedback";
import { IntelligenceFeedbackQueue } from "../../src/components/admin/intelligence-feedback-queue";

const answerId = randomUUID();
const receipt = { id: randomUUID(), kind: "report", category: "other", status: "open", revision: 1,
  createdAt: "2026-10-18T12:00:00Z", expiresAt: "2026-11-17T12:00:00Z" };
const response = (body: unknown, ok = true, status = ok ? 200 : 503) => ({ ok, status, json: async () => body });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("answer feedback controls", () => {
  it("restores acknowledgment on mount with GET only and prevents duplicate reports", async () => {
    const fetch = vi.fn().mockResolvedValue(response({ ok: true, feedback: [receipt] }));
    vi.stubGlobal("fetch", fetch);
    render(<AnswerFeedback answerId={answerId} revision={2} />);
    expect(await screen.findByText(/Recorded: report/)).toHaveTextContent("review revision 1");
    expect(screen.getByRole("button", { name: "Report a problem" })).toBeDisabled();
    expect(fetch).toHaveBeenCalledTimes(1); expect(fetch.mock.calls[0][0]).toContain("revision=2");
    expect(fetch.mock.calls[0][1].method).toBeUndefined();
  });
  it("preserves failed comment drafts, focuses errors and reuses retry UUID", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ ok: true, feedback: [] }))
      .mockRejectedValueOnce(Error("lost acknowledgment"))
      .mockResolvedValueOnce(response({ ok: true, feedback: receipt }));
    vi.stubGlobal("fetch", fetch);
    render(<AnswerFeedback answerId={answerId} revision={2} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Report a problem" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Report a problem" }));
    expect(screen.getByText(/not by an automatic 30-day purge/)).toHaveTextContent("Deleting your account removes account-linked feedback.");
    fireEvent.change(screen.getByLabelText(/Optional comment/), { target: { value: "SYNTHETIC retained draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit report" }));
    const alert = await screen.findByRole("alert"); expect(alert).toHaveFocus();
    expect(screen.getByLabelText(/Optional comment/)).toHaveValue("SYNTHETIC retained draft");
    fireEvent.click(screen.getByRole("button", { name: "Submit report" }));
    await screen.findByText(/Recorded: report/);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual(JSON.parse(fetch.mock.calls[2][1].body));
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ answerId, revision: 2, kind: "report", comment: "SYNTHETIC retained draft" });
  });
  it("does not send a Helpful rating until deliberate activation", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ ok: true, feedback: [] }))
      .mockResolvedValueOnce(response({ ok: true, feedback: { ...receipt, kind: "helpful", category: null } }));
    vi.stubGlobal("fetch", fetch);
    render(<AnswerFeedback answerId={answerId} revision={1} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /^Helpful$/ })).not.toBeDisabled());
    expect(fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /^Helpful$/ }));
    await screen.findByText("Recorded: helpful.");
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ kind: "helpful", category: null, comment: "" });
  });
});
describe("private staff feedback queue", () => {
  const item = { ...receipt, answerRevision: 3, comment: "<img src=x onerror=alert(1)> UNTRUSTED SYNTHETIC", sourceValid: false, regressionDraftId: null };
  it("performs GET only on mount, renders comments as text and displays source validity separately", async () => {
    const fetch = vi.fn().mockResolvedValue(response({ ok: true, feedback: [item] }));
    vi.stubGlobal("fetch", fetch);
    const { container } = render(<IntelligenceFeedbackQueue />);
    await screen.findByText(/UNTRUSTED SYNTHETIC/);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(/Current source validity: unavailable or revoked/)).toBeVisible();
    expect(screen.getByText(/Saved review revision 1 · answer revision 3/)).toBeVisible();
    expect(fetch).toHaveBeenCalledTimes(1); expect(fetch.mock.calls[0][1].method).toBeUndefined();
  });
  it("saves/reopens the exact expected revision and never elects a regression implicitly", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ ok: true, feedback: [item] }))
      .mockResolvedValueOnce(response({ ok: true, feedback: { ...receipt, status: "resolved", revision: 2 }, regressionDraftId: null }))
      .mockResolvedValueOnce(response({ ok: true, feedback: { ...receipt, status: "open", revision: 3 }, regressionDraftId: null }));
    vi.stubGlobal("fetch", fetch);
    render(<IntelligenceFeedbackQueue />);
    fireEvent.click(await screen.findByRole("button", { name: "Resolve report" }));
    fireEvent.click(await screen.findByRole("button", { name: "Reopen report" }));
    await waitFor(() => expect(screen.getByText(/Saved review revision 3/)).toBeVisible());
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ feedbackId: receipt.id, expectedRevision: 1, action: "resolve" });
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toMatchObject({ expectedRevision: 2, action: "reopen" });
    expect(fetch.mock.calls.slice(1).every(call => !call[1].body.includes("regression_draft"))).toBe(true);
  });
  it("retains classification and focuses actionable stale-version failures", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ ok: true, feedback: [item] }))
      .mockResolvedValueOnce(response({ ok: false }, false, 409));
    vi.stubGlobal("fetch", fetch);
    render(<IntelligenceFeedbackQueue />);
    const select = await screen.findByLabelText("Classification");
    fireEvent.change(select, { target: { value: "stale_information" } });
    fireEvent.click(screen.getByRole("button", { name: "Save classification" }));
    expect(await screen.findByRole("alert")).toHaveFocus(); expect(select).toHaveValue("stale_information");
    expect(within(screen.getByRole("article")).getByRole("button", { name: "Create synthetic regression draft" })).not.toBeDisabled();
  });
});
