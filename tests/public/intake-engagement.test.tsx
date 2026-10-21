import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useIntakeEngagement } from "../../app/lib/client/useIntakeEngagement";
import { initialAttribution } from "../../app/lib/attribution";
import { trackEvent } from "../../app/lib/analytics";
vi.mock("../../app/lib/analytics", () => ({ trackEvent: vi.fn() }));
function Form() {
  const record = useIntakeEngagement(initialAttribution, "buyer", "buyer_page", "00000000-0000-4000-8000-000000000123");
  return <form onInputCapture={record} onChangeCapture={record}><input aria-label="Contact"/><input name="website" aria-label="Trap"/><input disabled aria-label="Disabled"/><button>Review</button></form>;
}
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("records the first interaction once, not field values, field names or a submission", () => {
  render(<Form/>);
  fireEvent.input(screen.getByLabelText("Trap"), { target: { value: "spam@example.test" } });
  fireEvent.input(screen.getByLabelText("Disabled")); expect(trackEvent).not.toHaveBeenCalled();
  fireEvent.input(screen.getByLabelText("Contact"), { target: { value: "private-contact@example.test" } });
  fireEvent.change(screen.getByLabelText("Contact"));
  expect(trackEvent).toHaveBeenCalledExactlyOnceWith("intake_started", initialAttribution, { funnel_name: "buyer", lead_source_surface: "buyer_page" }, { sessionId: "00000000-0000-4000-8000-000000000123" });
  expect(JSON.stringify(vi.mocked(trackEvent).mock.calls)).not.toMatch(/private-contact|spam@|Contact|Trap/);
});
