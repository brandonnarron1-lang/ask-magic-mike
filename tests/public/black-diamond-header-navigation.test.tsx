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
  it("prioritizes four consumer outcomes and separates professional sign-in", () => {
    render(<BlackDiamondHeader />);

    const toggle = screen.getByRole("button", { name: "Open site navigation" });
    const homeLink = screen.getByRole("link", { name: "Ask Magic Mike home" });
    const staffLink = screen.getByRole("link", { name: "Agent & Broker Sign In" });
    expect(toggle).toHaveAttribute("aria-controls", "amm-mobile-navigation");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveClass("shrink-0");
    expect(homeLink).toHaveClass("shrink-0");
    expect(within(homeLink).getByRole("img", { name: "Our Town Properties" })).toHaveClass("w-24");
    expect(staffLink).toHaveAttribute("href", "/lead-center-login?returnTo=%2Fadmin%2Ftoday");
    expect(staffLink).toHaveClass("min-h-11");
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
    expect(within(mobileNavigation).getByRole("link", { name: /Selling Options/ })).toHaveAttribute("href", "/sell?seller_option=compare");
    expect(within(mobileNavigation).getByRole("link", { name: "Browse Homes" })).toHaveAttribute("href", "https://www.ourtownproperties.com/property-search/");
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
    expect(within(mobileNavigation).getByRole("link", { name: "My Workspace" })).toHaveAttribute("href", "/my");
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

    const staffLink = screen.getByRole("link", { name: "Agent & Broker Sign In" });
    staffLink.focus();
    fireEvent.keyDown(staffLink, { key: "Escape" });

    expect(staffLink).toHaveFocus();
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
    expect(within(desktopNavigation).getByRole("link", { name: "Buying Help" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    fireEvent.click(screen.getByRole("button", { name: "Open site navigation" }));
    const askLink = within(screen.getByRole("navigation", {name:"Mobile primary navigation"})).getByRole("link", { name: "Ask Mike" });
    askLink.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(askLink);
    expect(onAsk).toHaveBeenCalledTimes(1);
  });

  it("declares the global smooth-scroll behavior for stable Next.js route transitions", () => {
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    expect(layout).toContain('data-scroll-behavior="smooth"');
  });
});
