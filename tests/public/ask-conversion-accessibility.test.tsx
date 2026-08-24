import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    // The image itself is outside this test's accessibility contract.
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} />
  ),
}));

vi.mock("../../app/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/ask" }));

import { AskMikeChatPanel } from "../../app/components/black-diamond/AskMikeChatPanel";
import { BlackDiamondHeader } from "../../app/components/black-diamond/BlackDiamondHeader";

const root = process.cwd();

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

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("Ask Mike conversion clarity and keyboard access", () => {
  it("makes the skip link the first public-header control and points it at one focus target", () => {
    render(
      <>
        <BlackDiamondHeader />
        <section id="page-content" tabIndex={-1}>Primary content</section>
      </>,
    );

    const skip = screen.getByRole("link", { name: "Skip to main content" });
    const content = screen.getByText("Primary content");
    expect(skip).toHaveAttribute("href", "#page-content");
    expect(skip).toHaveClass("sr-only", "focus:not-sr-only");
    expect(document.querySelector("header a, header button, header input")).toBe(skip);
    vi.useFakeTimers();
    fireEvent.click(skip);
    expect(content).toHaveFocus();
    skip.focus();
    act(() => vi.runAllTimers());
    expect(content).toHaveFocus();
    vi.useRealTimers();
  });

  it("gives the chat question a visible required label and the same limit as the API", () => {
    render(<AskMikeChatPanel />);

    expect(screen.getByRole("heading", {
      level: 2,
      name: "Start with the real estate question on your mind.",
    })).toBeVisible();

    const question = screen.getByLabelText(/Your real estate question/);
    expect(question).toBeRequired();
    expect(question).toHaveAttribute("name", "question");
    expect(question).toHaveAttribute("type", "text");
    expect(question).toHaveAttribute("maxlength", "2000");
    expect(question).toHaveAttribute("autocomplete", "off");
    expect(question).toHaveAttribute("enterkeyhint", "send");
    expect(question).toHaveAttribute("aria-describedby", "ask-mike-question-help");
    expect(screen.getByText(/For pricing, listing strategy/)).toHaveAttribute(
      "id",
      "ask-mike-question-help",
    );
    expect(screen.getByRole("button", { name: "Send Question" })).toHaveAttribute(
      "type",
      "submit",
    );

    const chatRoute = read("app/api/chat/route.ts");
    expect(chatRoute).toContain("message.length > 2_000");
    expect(chatRoute).toContain("Message must be 2,000 characters or fewer.");
  });

  it("keeps every shared-header surface wired to one keyboard-focus destination", () => {
    const sharedHeaderSurfaces = [
      "app/ask/page.tsx",
      "app/buy/page.tsx",
      "app/components/black-diamond/HeroSection.tsx",
      "app/components/black-diamond/PublicInfoPage.tsx",
      "app/home-value/page.tsx",
      "app/integrations/ourtownproperties/page.tsx",
      "app/not-found.tsx",
      "app/open-house/[propertyOrId]/page.tsx",
      "app/plan/page.tsx",
      "app/rent/page.tsx",
      "app/sell/page.tsx",
      "app/social-preview/page.tsx",
    ];

    for (const path of sharedHeaderSurfaces) {
      const source = read(path);
      expect(source, path).toContain('id="page-content"');
      expect(source, path).toContain("tabIndex={-1}");
    }

    expect(read("app/ask/page.tsx")).toContain(
      "Ask Mike. Get a practical local next step.",
    );
    expect(read("app/ask/page.tsx")).not.toContain("advisor interface");
    expect(read("app/components/black-diamond/AskMikeChatPanel.tsx")).not.toContain(
      "local-advisor interface",
    );
  });
});
