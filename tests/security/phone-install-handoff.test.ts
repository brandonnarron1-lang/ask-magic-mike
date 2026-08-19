import { describe, expect, it } from "vitest";
import robots from "../../app/robots";

describe("tokenized phone-install search boundary", () => {
  it("keeps all phone-alert setup and token paths out of search indexing", () => {
    const serialized = JSON.stringify(robots().rules);
    expect(serialized).toContain("/phone-alerts/");
  });
});
