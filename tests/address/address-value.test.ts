import { describe, expect, it } from "vitest";
import { addressFromForm, EMPTY_ADDRESS_COMPONENTS, formatAddress, normalizeAddressValue, type AddressValue } from "../../app/lib/address/addressValue";
import { normalizeLeadPayload } from "../../app/lib/leadPayload";
import { validateRawPublicLeadInput } from "../../app/lib/publicLeadIngress";
import { normalizeAdminLeadRow } from "../../app/lib/persistence/supabase/adminLeadView";
const components = { line1: "101 Synthetic Fixture Road", line2: "Unit 4", locality: "Wilson", region: "NC", postalCode: "27893", country: "US" };
const value: AddressValue = { version: 1, enteredText: "101 Synthetic Fixture Rd Unit 4", acceptedText: formatAddress(components), components, confirmation: "user_confirmed_suggestion", validation: "not_performed", reportedProvider: "google_places_new", reportedPlaceId: "synthetic_id" };
function form(raw = value.acceptedText, overrides = {}) {
  const f = document.createElement("form");
  for (const [name, val] of Object.entries({ address: raw, address_line1: components.line1, address_line2: components.line2, address_city: components.locality, address_region: components.region, address_postal: components.postalCode, address_country: components.country, ...overrides })) {
    const input = document.createElement("input"); input.name = name; input.value = val; f.append(input);
  }
  return f;
}
describe("versioned, user-asserted address meaning", () => {
  it("preserves original representation and accepted components", () => expect(normalizeAddressValue(value)).toEqual(value));
  it("downgrades a forged validation flag, never treating Places as validation", () => expect(normalizeAddressValue({ ...value, validation: "provider_validated" }).validation).toBe("not_performed"));
  it.each(["line1", "line2", "locality", "region", "postalCode", "country"] as const)("invalidates suggestion evidence after editing %s", key => {
    const names = { line1: "address_line1", line2: "address_line2", locality: "address_city", region: "address_region", postalCode: "address_postal", country: "address_country" };
    const result = addressFromForm(form(value.acceptedText, { [names[key]]: key === "country" ? "CA" : "Changed" }), value);
    expect(result.confirmation).toBe("user_edited"); expect(result.validation).toBe("not_performed");
    expect(result.reportedPlaceId).toBeUndefined(); expect(result.enteredText).toBe(value.enteredText);
  });
  it("ignores an old selection after an eventless raw input edit", () => {
    const result = addressFromForm(form("555 New Synthetic Property"), value);
    expect(result.acceptedText).toBe("555 New Synthetic Property"); expect(result.components).toEqual(EMPTY_ADDRESS_COMPONENTS);
  });
  it("allows structured-only manual entry without inventing missing fields", () => {
    const result = addressFromForm(form("", { address_city: "", address_postal: "" }));
    expect(result.enteredText).toBe(result.acceptedText); expect(result.components.postalCode).toBe(""); expect(result.validation).toBe("not_performed");
  });
  it.each([{}, { ...value, components: { ...components, extra: "blob" } }, { ...value, acceptedText: "Different address" }, { ...value, enteredText: "a" }, { ...value, enteredText: "a".repeat(501) }, { ...value, reportedPlaceId: "bad/url" }])("rejects malformed/bounded address %j", bad => expect(() => normalizeAddressValue(bad)).toThrow());
  it("checks raw/structured agreement at ingress and keeps legacy callers", () => {
    const input = { funnel_type: "home_value", lead_source_surface: "home_value_page", address: value.acceptedText, address_entry: value };
    expect(validateRawPublicLeadInput(input)).toBeNull(); expect(validateRawPublicLeadInput({ ...input, address: "Wrong property" })?.code).toBe("invalid_address_entry");
    expect(normalizeLeadPayload(input).address_entry).toEqual(value);
    expect(normalizeLeadPayload({ ...input, address_entry: undefined }).address_entry).toBeUndefined();
  });
  it("projects retained original and accepted request data, malformed metadata stays absent", () => {
    expect(normalizeAdminLeadRow({ id: "fixture", address_entry: value }).address_entry).toEqual(value);
    expect(normalizeAdminLeadRow({ id: "fixture", address_entry: { validation: "true" } }).address_entry).toBeNull();
  });
});
