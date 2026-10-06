import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConversionMutationForm, type ConversionMutationResult } from "../../app/components/admin/ConversionMutationForm";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

function fields(version = "version-1") {
  return <>
    <input type="hidden" name="lead_id" value="lead-1" />
    <input type="hidden" name="record_version" value={version} />
    <label>Safe note<input name="note" defaultValue="" /></label>
    <label>Due<input name="due_at" type="datetime-local" /></label>
    <label>Timezone<input name="timezone" defaultValue="America/New_York" /></label>
  </>;
}

function form(action: (data: FormData, mode: "inline") => Promise<ConversionMutationResult>, version = "version-1", confirmationLabel?: string) {
  return <ConversionMutationForm action={action} submitLabel="Save next task" successMessage="Next task saved. No contact sent." confirmationLabel={confirmationLabel}>{fields(version)}</ConversionMutationForm>;
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("bounded inline conversion form", () => {
  it("keeps notes and dates on a rejected save without redirecting or claiming success", async () => {
    const action = vi.fn().mockResolvedValue({ ok: false, error: "invalid_followup_due_at" });
    render(form(action));
    fireEvent.change(screen.getByLabelText("Safe note"), { target: { value: "Agreed callback" } });
    fireEvent.change(screen.getByLabelText("Due"), { target: { value: "2026-10-06T15:30" } });
    await userEvent.click(screen.getByRole("button", { name: "Save next task" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Not saved");
    expect(screen.getByLabelText("Safe note")).toHaveValue("Agreed callback");
    expect(screen.getByLabelText("Due")).toHaveValue("2026-10-06T15:30");
    expect(refresh).not.toHaveBeenCalled();
    expect(action.mock.calls[0][0].get("due_at")).toBe("2026-10-06T15:30");
    expect(action.mock.calls[0][0].get("timezone")).toBe("America/New_York");
    expect(action.mock.calls[0][0].get("response_mode")).toBe("inline");
    expect(action.mock.calls[0][1]).toBe("inline");
  });

  it("locks duplicate clicks synchronously and exposes a live saving state", async () => {
    let resolve!: (value: ConversionMutationResult) => void;
    const action = vi.fn(() => new Promise<ConversionMutationResult>((done) => { resolve = done; }));
    const { container } = render(form(action));
    const element = container.querySelector("form")!;
    fireEvent.submit(element);
    fireEvent.submit(element);
    expect(action).toHaveBeenCalledTimes(1);
    expect(element).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Saving");
    expect(screen.getByLabelText("Safe note")).toBeDisabled();
    await act(async () => resolve({ ok: true }));
    expect(screen.getByRole("status")).toHaveTextContent("Next task saved. No contact sent.");
    expect(screen.getByRole("form", { name: "Save next task" })).toBe(element);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("replays the identical captured payload and token after an unknown response", async () => {
    const action = vi.fn().mockRejectedValueOnce(new Error("connection lost")).mockResolvedValueOnce({ ok: true });
    render(form(action));
    fireEvent.change(screen.getByLabelText("Safe note"), { target: { value: "Keep this" } });
    await userEvent.click(screen.getByRole("button", { name: "Save next task" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Save outcome not confirmed");
    expect(screen.getByLabelText("Safe note")).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Retry same request" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
    expect(action.mock.calls[1][0]).toBe(action.mock.calls[0][0]);
    expect(action.mock.calls[0][0].get("idempotency_key")).toMatch(/^[0-9a-f-]{36}$/);
    expect(action.mock.calls[1][0].get("note")).toBe("Keep this");
    expect(screen.getByRole("button", { name: "Saved" })).toBeDisabled();
  });

  it("treats a transaction 503 as uncertain and retries only the same key and payload", async () => {
    const action = vi.fn().mockResolvedValueOnce({ ok: false, error: "conversion_transaction_unavailable" }).mockResolvedValueOnce({ ok: true, warning: "conversion_action_already_saved" });
    render(form(action));
    fireEvent.change(screen.getByLabelText("Safe note"), { target: { value: "Do not duplicate this" } });
    await userEvent.click(screen.getByRole("button", { name: "Save next task" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("outcome not confirmed");
    expect(screen.getByLabelText("Safe note")).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Retry same request" }));
    expect(action.mock.calls[1][0]).toBe(action.mock.calls[0][0]);
    expect(await screen.findByRole("status")).toHaveTextContent("No duplicate appointment, task, or interaction was created");
  });

  it("keeps a request token for an unchanged retry but rotates it after a correction", async () => {
    const action = vi.fn().mockResolvedValue({ ok: false, error: "invalid_followup_due_at" });
    render(form(action));
    await userEvent.click(screen.getByRole("button", { name: "Save next task" }));
    await screen.findByRole("alert");
    const first = action.mock.calls[0][0].get("idempotency_key");
    await userEvent.click(screen.getByRole("button", { name: "Save next task" }));
    expect(action.mock.calls[1][0].get("idempotency_key")).toBe(first);
    fireEvent.change(screen.getByLabelText("Due"), { target: { value: "2026-10-07T10:30" } });
    await userEvent.click(screen.getByRole("button", { name: "Save next task" }));
    expect(action.mock.calls[2][0].get("idempotency_key")).not.toBe(first);
  });

  it("preserves draft through a conflict refresh and requires confirmation of the new record", async () => {
    const action = vi.fn().mockResolvedValueOnce({ ok: false, error: "stale_appointment_version" }).mockResolvedValueOnce({ ok: true });
    const { rerender } = render(form(action, "version-1", "Confirm actual appointment"));
    fireEvent.change(screen.getByLabelText("Safe note"), { target: { value: "Unsaved cancellation reason" } });
    await userEvent.click(screen.getByRole("checkbox", { name: "Confirm actual appointment" }));
    await userEvent.click(screen.getByRole("button", { name: "Save next task" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("changed in another session");
    expect(screen.getByRole("button", { name: "Save next task" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Review latest record (keep draft)" }));
    expect(refresh).toHaveBeenCalledOnce();
    rerender(form(action, "version-2", "Confirm actual appointment"));
    expect(screen.getByLabelText("Safe note")).toHaveValue("Unsaved cancellation reason");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Save next task" }));
    expect(action.mock.calls[1][0].get("record_version")).toBe("version-2");
    expect(action.mock.calls[1][0].get("idempotency_key")).not.toBe(action.mock.calls[0][0].get("idempotency_key"));
  });

  it("supports keyboard-only explicit confirmation and blocks unconfirmed submission", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({ ok: true });
    render(<ConversionMutationForm action={action} submitLabel="Record response" successMessage="Evidence saved" confirmationLabel="Actual conversation occurred"><input name="lead_id" type="hidden" value="lead-1" /></ConversionMutationForm>);
    await user.click(screen.getByRole("button", { name: "Record response" }));
    expect(action).not.toHaveBeenCalled();
    screen.getByRole("checkbox").focus();
    await user.keyboard(" ");
    await user.tab();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(action.mock.calls[0][0].get("confirm")).toBe("yes");
  });

  it("does not reset failed inputs when server children are refreshed", async () => {
    const action = vi.fn().mockResolvedValue({ ok: false, error: "invalid_timezone" });
    const { rerender } = render(form(action));
    fireEvent.change(screen.getByLabelText("Safe note"), { target: { value: "Draft survives" } });
    await userEvent.click(screen.getByRole("button", { name: "Save next task" }));
    await screen.findByRole("alert");
    rerender(form(action, "version-2"));
    expect(screen.getByLabelText("Safe note")).toHaveValue("Draft survives");
    expect(screen.getByRole("alert")).toHaveTextContent("Not saved");
  });

  it("requires an explicit new action before creating another follow-up", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true });
    render(<ConversionMutationForm action={action} submitLabel="Save next task" successMessage="Saved" newActionLabel="Start separate task">{fields()}</ConversionMutationForm>);
    await userEvent.click(screen.getByRole("button", { name: "Save next task" }));
    await screen.findByRole("button", { name: "Start separate task" });
    const firstToken = action.mock.calls[0][0].get("idempotency_key");
    await userEvent.click(screen.getByRole("button", { name: "Start separate task" }));
    await userEvent.click(screen.getByRole("button", { name: "Save next task" }));
    expect(action.mock.calls[1][0].get("idempotency_key")).not.toBe(firstToken);
  });
});
