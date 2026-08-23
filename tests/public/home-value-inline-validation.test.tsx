import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

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

afterEach(() => cleanup());

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
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter your name so Mike knows who requested the review.",
    );
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-invalid", "false");
    expect(name).toHaveAttribute("aria-describedby", "home-value-form-error");
    expect(email).not.toHaveAttribute("aria-describedby");
    expect(name).toHaveFocus();

    await user.type(name, "INTERNAL QA DO NOT CONTACT");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid email for your valuation follow-up.",
    );
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-describedby", "home-value-form-error");
    expect(name).not.toHaveAttribute("aria-describedby");
    expect(email).toHaveFocus();

    await user.type(email, "internal-qa@example.com");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const phone = screen.getByLabelText("Phone");
    await user.click(screen.getByRole("button", { name: "Request Valuation" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a phone number with area code.",
    );
    expect(phone).toHaveAttribute("aria-invalid", "true");
    expect(phone).toHaveFocus();
  });
});
