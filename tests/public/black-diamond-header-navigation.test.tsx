import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ImgHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({
    priority: _priority,
    fill: _fill,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean; fill?: boolean }) => (
    // The image itself is outside this navigation behavior contract.
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} />
  ),
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/buy" }));

import { BlackDiamondHeader } from "../../app/components/black-diamond/BlackDiamondHeader";

afterEach(cleanup);

describe("Black Diamond responsive navigation", () => {
  it("exposes the complete intent navigation on mobile without removing the Ask CTA", () => {
    render(<BlackDiamondHeader />);

    const toggle = screen.getByRole("button", { name: "Open site navigation" });
    const homeLink = screen.getByRole("link", { name: "Ask Magic Mike home" });
    const askLink = screen.getByRole("link", { name: "Ask Mike" });
    expect(toggle).toHaveAttribute("aria-controls", "amm-mobile-navigation");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveClass("shrink-0");
    expect(homeLink).toHaveClass("shrink-0");
    expect(within(homeLink).getByRole("img", { name: "Our Town Properties" })).toHaveClass("w-24");
    expect(askLink).toHaveAttribute("href", "/ask");
    expect(askLink).toHaveClass("whitespace-nowrap");
    expect(screen.queryByRole("navigation", { name: "Mobile primary navigation" })).not.toBeInTheDocument();

    fireEvent.click(toggle);

    const mobileNavigation = screen.getByRole("navigation", { name: "Mobile primary navigation" });
    expect(screen.getByRole("button", { name: "Close site navigation" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(within(mobileNavigation).getByRole("link", { name: /Home Value/ })).toHaveAttribute(
      "href",
      "/home-value",
    );
    expect(within(mobileNavigation).getByRole("link", { name: /Sell/ })).toHaveAttribute("href", "/sell");
    const currentBuyerPath = within(mobileNavigation).getByRole("link", { name: /Buy/ });
    expect(currentBuyerPath).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(currentBuyerPath).getByText("Current")).toHaveClass(
      "hidden",
      "min-[360px]:inline",
    );
    expect(within(mobileNavigation).getByRole("link", { name: /Plan/ })).toHaveAttribute("href", "/plan");
    expect(within(mobileNavigation).getByRole("link", { name: /^Ask/ })).toHaveAttribute("href", "/ask");
    expect(within(mobileNavigation).getByRole("link", { name: /^Ask/ })).toHaveClass("col-span-2");
  });

  it("closes on Escape and returns focus to the menu button", () => {
    render(<BlackDiamondHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Open site navigation" }));
    const mobileNavigation = screen.getByRole("navigation", { name: "Mobile primary navigation" });
    fireEvent.keyDown(mobileNavigation, { key: "Escape" });

    const toggle = screen.getByRole("button", { name: "Open site navigation" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
    expect(screen.queryByRole("navigation", { name: "Mobile primary navigation" })).not.toBeInTheDocument();
  });

  it("does not redirect focus when Escape is pressed while the menu is closed", () => {
    render(<BlackDiamondHeader />);

    const askLink = screen.getByRole("link", { name: "Ask Mike" });
    askLink.focus();
    fireEvent.keyDown(askLink, { key: "Escape" });

    expect(askLink).toHaveFocus();
    expect(screen.getByRole("button", { name: "Open site navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("closes when the user points outside the navigation", () => {
    render(<BlackDiamondHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Open site navigation" }));
    expect(screen.getByRole("navigation", { name: "Mobile primary navigation" })).toBeVisible();
    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("navigation", { name: "Mobile primary navigation" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open site navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("marks the active destination in both navigation modes and records Ask CTA intent", () => {
    const onAsk = vi.fn();
    render(<BlackDiamondHeader onAsk={onAsk} />);

    const desktopNavigation = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(within(desktopNavigation).getByRole("link", { name: "Buy" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    const askLink = screen.getByRole("link", { name: "Ask Mike" });
    askLink.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(askLink);
    expect(onAsk).toHaveBeenCalledTimes(1);
  });

  it("declares the global smooth-scroll behavior for stable Next.js route transitions", () => {
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    expect(layout).toContain('data-scroll-behavior="smooth"');
  });
});
