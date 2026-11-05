export const SELLER_REQUEST_OPTIONS = {
  "home-value": "Home Value review",
  "as-is": "Explore an as-is sale",
  "cash-review": "Request a cash/direct-purchase review",
  compare: "Compare listing with an as-is option",
  guidance: "General selling guidance",
} as const;
export type SellerRequest = { version: 1; option: keyof typeof SELLER_REQUEST_OPTIONS;
  relationship: "owner" | "co-owner" | "authorized-helper" | "unknown";
  representation: "represented" | "not-represented" | "unknown";
  occupancy: "owner-occupied" | "tenant-occupied" | "vacant" | "unknown" };
export function normalizeSellerRequest(input: unknown): SellerRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_seller_request");
  const v = input as Record<string, unknown>;
  if (v.version !== 1 || !Object.hasOwn(SELLER_REQUEST_OPTIONS, String(v.option)) ||
    !["owner", "co-owner", "authorized-helper", "unknown"].includes(String(v.relationship)) ||
    !["represented", "not-represented", "unknown"].includes(String(v.representation)) ||
    !["owner-occupied", "tenant-occupied", "vacant", "unknown"].includes(String(v.occupancy)) ||
    Object.keys(v).sort().join() !== ["version","option","relationship","representation","occupancy"].sort().join()) throw new Error("invalid_seller_request");
  return { version: 1, option: v.option, relationship: v.relationship, representation: v.representation, occupancy: v.occupancy } as SellerRequest;
}
