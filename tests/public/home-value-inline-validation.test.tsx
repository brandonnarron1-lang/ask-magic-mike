import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HomeValueFunnel } from "../../app/components/black-diamond/HomeValueFunnel";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("home-value inline validation", () => {
  it("keeps required-field errors visible, associated, and recoverable", async () => {
    const user = userEvent.setup();
    render(<HomeValueFunnel />);

    const address = screen.getByLabelText("Property address");
    expect(address).toBeRequired();
    expect(screen.getByText("Required")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter the full property address so Mike can review the right home.",
    );
    expect(address).toHaveAttribute("aria-invalid", "true");
    expect(address).toHaveFocus();

    await user.type(address, "INTERNAL QA DO NOT CONTACT");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const name = screen.getByLabelText("Your name");
    const email = screen.getByLabelText("Email for your valuation follow-up");
    await user.click(screen.getByRole("button", { name: "Request Valuation" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter your name so Mike knows who requested the review.",
    );
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-invalid", "false");
    expect(name).toHaveAttribute("aria-describedby", "home-value-form-error");
    expect(email).not.toHaveAttribute("aria-describedby");
    expect(name).toHaveFocus();

    await user.type(name, "INTERNAL QA DO NOT CONTACT");
    await user.click(screen.getByRole("button", { name: "Request Valuation" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid email for your valuation follow-up.",
    );
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-describedby", "home-value-form-error");
    expect(name).not.toHaveAttribute("aria-describedby");
    expect(email).toHaveFocus();

    await user.type(email, "internal-qa@example");
    await user.click(screen.getByRole("button", { name: "Request Valuation" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid email for your valuation follow-up.",
    );
    expect(email).toHaveFocus();

    await user.clear(email);
    await user.type(email, "internal-qa@example.com");
    const phone = screen.getByLabelText("Phone (optional)");
    expect(phone).not.toBeRequired();
    await user.type(phone, "252");
    await user.click(screen.getByRole("button", { name: "Request Valuation" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a phone number with area code.",
    );
    expect(phone).toHaveAttribute("aria-invalid", "true");
    expect(phone).toHaveFocus();

    await user.clear(phone);
    await user.type(phone, "1234567890123456");
    await user.click(screen.getByRole("button", { name: "Request Valuation" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a phone number with area code.",
    );
    expect(phone).toHaveFocus();
  });

  it("stores the request from the first valid contact step without requiring phone", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: URL | RequestInfo, _init?: RequestInit) => {
      if (String(input) === "/api/leads") {
        return new Response(JSON.stringify({
          message: "Stored for broker review.",
          lead_id: "qa-email-only-lead",
          session_id: "qa-email-only-session",
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ accepted: true }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<HomeValueFunnel />);
    await user.type(screen.getByLabelText("Property address"), "100 Internal QA Lane, Wilson NC");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Step 2 of 3")).toBeVisible();
    await user.type(screen.getByLabelText("Your name"), "INTERNAL QA DO NOT CONTACT");
    await user.type(screen.getByLabelText("Email for your valuation follow-up"), "email-only@example.test");
    expect(screen.getByLabelText("Phone (optional)")).toHaveValue("");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Request Valuation" }));

    expect(await screen.findByText("Your request is in.")).toBeVisible();
    expect(screen.getByText("Step 3 of 3")).toBeVisible();
    const leadCall = fetchMock.mock.calls.find(([input]) => String(input) === "/api/leads");
    expect(leadCall).toBeDefined();
    const body = JSON.parse(String(leadCall?.[1]?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      funnel_type: "home_value",
      email: "email-only@example.test",
      phone: "",
      consent: true,
      consent_email: true,
      consent_call: false,
    });
    expect(typeof body.idempotency_key).toBe("string");
  });

  it("keeps a failed durable write on the contact step and emits only safe failure telemetry", async () => {
    const user = userEvent.setup();
    const events: string[] = [];
    const listener = (event: Event) => {
      events.push(String((event as CustomEvent<{ event?: string }>).detail?.event));
    };
    window.addEventListener("askmagicmike:event", listener);
    vi.stubGlobal("fetch", vi.fn(async (input: URL | RequestInfo) => {
      if (String(input) === "/api/leads") {
        return new Response(JSON.stringify({ error: "intercepted_failure" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ accepted: true }), { status: 202 });
    }));

    render(<HomeValueFunnel />);
    await user.type(screen.getByLabelText("Property address"), "101 Internal QA Lane, Wilson NC");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByLabelText("Your name"), "INTERNAL QA DO NOT CONTACT");
    await user.type(screen.getByLabelText("Email for your valuation follow-up"), "failure@example.test");
    await user.click(screen.getByRole("button", { name: "Request Valuation" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("intercepted_failure");
    expect(screen.getByText("Step 2 of 3")).toBeVisible();
    expect(events).toContain("lead_submit_failed");
    expect(events).not.toContain("lead_created");
    window.removeEventListener("askmagicmike:event", listener);
  });
});
