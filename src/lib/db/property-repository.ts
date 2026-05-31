import { isDev } from "./types";

export interface UpsertPropertyInput {
  leadId?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  addressRaw?: string | null;
  county?: string | null;
}

export interface DbProperty {
  id: string;
  leadId: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  addressRaw: string | null;
  createdAt: string;
}

export async function upsertProperty(input: UpsertPropertyInput): Promise<DbProperty | null> {
  if (isDev()) return null;
  if (!input.addressLine1 && !input.addressRaw) return null;

  // properties.address_line1 is NOT NULL — use addressRaw as fallback
  const addressLine1 = input.addressLine1 ?? input.addressRaw ?? "";
  const city  = input.city ?? "Wilson";
  const state = input.state ?? "NC";
  const zip   = input.zip ?? "";

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const client = createAdminClient();

  const { data, error } = await client
    .from("properties")
    .insert({
      lead_id:       input.leadId ?? null,
      address_line1: addressLine1,
      address_line2: input.addressLine2 ?? null,
      city,
      state,
      zip,
      county:        input.county ?? (state === "NC" ? "Wilson County" : null),
    })
    .select("id, lead_id, address_line1, city, state, zip, created_at")
    .single();

  if (error) {
    console.error("[property-repository] upsertProperty error:", error.message);
    return null;
  }

  return {
    id:           data.id as string,
    leadId:       (data.lead_id as string | null) ?? null,
    addressLine1: (data.address_line1 as string) ?? null,
    city:         (data.city as string) ?? null,
    state:        (data.state as string) ?? null,
    zip:          (data.zip as string) ?? null,
    addressRaw:   input.addressRaw ?? null,
    createdAt:    data.created_at as string,
  };
}
