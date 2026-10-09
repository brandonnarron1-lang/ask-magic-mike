import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LeadSectionNavigation, revealLeadSection } from "../../app/components/admin/LeadSectionNavigation";

const scroll = vi.fn();
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
beforeEach(() => {
  window.history.replaceState(null, "", "/admin/leads/synthetic");
  HTMLElement.prototype.scrollIntoView = scroll;
  scroll.mockClear();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
afterAll(() => {
  if (originalScroll) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScroll);
  else delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollIntoView;
});
function fixture(isTest = true) {
  return render(<><LeadSectionNavigation leadId="synthetic" isTest={isTest}/>
    <div id="follow-up"><details><summary>Follow-up tasks</summary><p>Task evidence</p></details></div>
    <div id="appointment-review"><details><summary>Appointment operations</summary><p>Appointment evidence</p></details></div>
    <div id="activity"><details><summary>Unified activity history</summary><p>History evidence</p></details></div>
    <details><summary>Property evidence (optional)</summary><section id="property-evidence-review">Unverified property facts</section></details>
    <details id="message-review"><summary>Communication permissions</summary>Permission evidence</details>
    <details id="unrelated"><summary>Unrelated panel</summary>Not a lead target</details></>);
}
describe("one-click lead section navigation", () => {
  it.each([["Review tasks", "follow-up"], ["Appointments", "appointment-review"], ["History", "activity"]])("%s reveals and focuses its panel", (label, id) => {
    const { container } = fixture();
    expect(container.querySelectorAll("details[open]")).toHaveLength(0);
    fireEvent.click(screen.getByRole("link", { name: label }));
    const panel = container.querySelector(`#${id} > details`)!;
    expect(panel).toHaveAttribute("open");
    expect(panel.querySelector("summary")).toHaveFocus();
    expect(container.querySelectorAll("details[open]")).toHaveLength(1);
    expect(scroll).toHaveBeenCalledWith({ block: "start" });
    expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", `#${id}`);
  });
  it("opens direct bookmarks, nested evidence and subsequent hash navigation", () => {
    window.history.replaceState(null, "", "#activity");
    const { container } = fixture();
    expect(container.querySelector("#activity > details")).toHaveAttribute("open");
    act(() => { window.history.replaceState(null, "", "#property-evidence-review"); window.dispatchEvent(new HashChangeEvent("hashchange")); });
    expect(document.getElementById("property-evidence-review")!.parentElement).toHaveAttribute("open");
    act(() => { window.history.replaceState(null, "", "#message-review"); window.dispatchEvent(new HashChangeEvent("hashchange")); });
    expect(document.getElementById("message-review")).toHaveAttribute("open");
  });
  it("does not expand another tab's target on a modified click or unknown hash", () => {
    const { container } = fixture(false);
    fireEvent.click(screen.getByRole("link", { name: "History" }), { ctrlKey: true });
    revealLeadSection("unrelated"); revealLeadSection("missing");
    expect(container.querySelectorAll("details[open]")).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Log result / next task" })).toBeVisible();
  });
  it("removes the listener after unmount and performs no network request", () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const { unmount } = fixture(); unmount();
    const listener = vi.spyOn(document, "getElementById");
    window.history.replaceState(null, "", "#activity"); window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(listener).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
});
