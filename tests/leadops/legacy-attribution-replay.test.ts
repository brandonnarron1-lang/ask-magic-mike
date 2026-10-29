import { expect, it } from "vitest";
import { normalizeLeadPayload } from "../../app/lib/leadPayload";
import { legacyAttributionReplayPayload } from "../../app/lib/persistence/legacyAttributionReplay";
it("reconstructs the pre-minimization root/touch ordering exactly for question text fingerprints", () => {
  const input = { page_url: " /ask?private=synthetic-only ", attribution: {
    current_path: "/ask?private=synthetic-only", initial_path: "/home-value?private=synthetic-only", source: " google ",
    page_title: "Synthetic title", placement: "Synthetic placement", click_ids: { gclid: "legacy-click" },
    first_touch: { page_title: "Earlier synthetic title", source: "email" },
  } };
  const value = legacyAttributionReplayPayload(normalizeLeadPayload(input), input);
  const originalShape = { source: "google", initial_path: "/home-value?private=synthetic-only", current_path: "/ask?private=synthetic-only", placement: "Synthetic placement", gclid: "legacy-click", page_title: "Synthetic title", placement_id: "Synthetic placement", first_touch: { source: "email", page_title: "Earlier synthetic title" }, last_touch: {} };
  expect(JSON.stringify(value.attribution)).toBe(JSON.stringify(originalShape));
  expect(value.page_url).toBe("/ask?private=synthetic-only");
  expect(JSON.stringify(normalizeLeadPayload(input))).not.toContain("private=synthetic-only");
});
