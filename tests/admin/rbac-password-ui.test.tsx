import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PasswordHelpForm } from "../../app/lead-center-password-help/PasswordHelpForm";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Lead Center password UI", () => {
  it("requests an origin-bound reset and returns a non-enumerating response", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ ok: false }), { status: 500 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<PasswordHelpForm enabled />);

    fireEvent.change(screen.getByLabelText("Approved account email"), {
      target: { value: "operator@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send secure link" }));

    expect(await screen.findByText(/If that approved account exists/)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/lead-center-auth/request-password-reset",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toEqual({
      email: "operator@example.test",
      redirectTo: `${window.location.origin}/lead-center-set-password`,
    });
  });

  it("does not issue a request while per-user access is disabled", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    render(<PasswordHelpForm enabled={false} />);

    expect(screen.getByRole("button", { name: "Send secure link" })).toBeDisabled();
    expect(screen.getByText("Per-user access is not active yet.")).toBeVisible();
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
  });
});
