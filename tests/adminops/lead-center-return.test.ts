import { expect, it } from "vitest";
import { safeLeadCenterReturn } from "../../app/lib/leadCenterReturn";

it.each([null, "https://example.test", "//example.test/admin", "/administrator", "/admin/../../outside", "/admin\\..\\outside", "/admin\n/lead"])("rejects unsafe return %s", value => {
  expect(safeLeadCenterReturn(value)).toBe("/admin");
});
it("preserves the intended lead, query and message-review bookmark", () => {
  expect(safeLeadCenterReturn("/admin/leads/00000000-0000-4000-8000-000000000001?view=review#message-review")).toBe("/admin/leads/00000000-0000-4000-8000-000000000001?view=review#message-review");
});
it("restores only a supported browser-inherited fragment on a lead return", () => {
  const lead = "/admin/leads/00000000-0000-4000-8000-000000000001";
  expect(safeLeadCenterReturn(lead, "#message-review")).toBe(`${lead}#message-review`);
  expect(safeLeadCenterReturn(lead, "#unknown")).toBe(lead);
  expect(safeLeadCenterReturn("//example.test/admin", "#message-review")).toBe("/admin");
  expect(safeLeadCenterReturn("/admin/today", "#message-review")).toBe("/admin/today");
  expect(safeLeadCenterReturn(`${lead}#activity`, "#message-review")).toBe(`${lead}#activity`);
});
