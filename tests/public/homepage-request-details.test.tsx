import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HomepageRequestDetails } from "../../app/components/black-diamond/HomepageRequestDetails";
import { clearPendingHomeValueRequest, rememberPendingHomeValueRequest } from "../../app/lib/homeValuePendingRequest";

const key = "00000000-0000-4000-8000-000000000123";
afterEach(() => { clearPendingHomeValueRequest(key); history.replaceState(null,"","/"); cleanup(); });
describe("homepage forms preserve recovery without competing with offer links", () => {
  it("starts collapsed but leaves the original child mounted", () => {
    render(<HomepageRequestDetails id="home-value" title="Continue"><input aria-label="Existing native value" defaultValue="Preserve this" /></HomepageRequestDetails>);
    expect(document.querySelector("details")).not.toHaveAttribute("open");
    expect(screen.getByLabelText("Existing native value")).toHaveValue("Preserve this");
  });
  it("opens the supported old homepage fragment", async () => {
    history.replaceState(null,"","/#home-value");
    render(<HomepageRequestDetails id="home-value" title="Continue">Original form</HomepageRequestDetails>);
    await waitFor(() => expect(document.querySelector("details")).toHaveAttribute("open"));
  });
  it("does not open an unrelated fragment", () => {
    history.replaceState(null,"","/#other");
    render(<HomepageRequestDetails id="home-value" title="Continue">Original form</HomepageRequestDetails>);
    expect(document.querySelector("details")).not.toHaveAttribute("open");
  });
  it("opens on an unresolved reference and refuses to hide recovery", async () => {
    render(<HomepageRequestDetails id="home-value" title="Continue">Original form</HomepageRequestDetails>);
    rememberPendingHomeValueRequest(key);
    const details = document.querySelector("details")!;
    await waitFor(() => expect(details).toHaveAttribute("open"));
    details.open = false;
    fireEvent(details, new Event("toggle"));
    await waitFor(() => expect(details).toHaveAttribute("open"));
  });
});
