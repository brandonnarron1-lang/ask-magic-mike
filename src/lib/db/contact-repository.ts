import type { DbContact } from "./types";
import { isDev } from "./types";
import { stripToDigits } from "@/lib/utils/phone";

export interface UpsertContactInput {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}

export async function upsertContact(input: UpsertContactInput): Promise<DbContact | null> {
  if (isDev()) return null;

  const phoneNormalized = input.phone ? stripToDigits(input.phone) : null;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const client = createAdminClient();

  // Find existing by email first, then phone
  let existingId: string | null = null;

  if (input.email) {
    const { data } = await client
      .from("contacts")
      .select("id")
      .eq("email", input.email)
      .maybeSingle();
    existingId = data?.id ?? null;
  }

  if (!existingId && phoneNormalized) {
    const { data } = await client
      .from("contacts")
      .select("id")
      .eq("phone_normalized", phoneNormalized)
      .maybeSingle();
    existingId = data?.id ?? null;
  }

  if (existingId) {
    const { data, error } = await client
      .from("contacts")
      .update({
        first_name:       input.firstName,
        last_name:        input.lastName,
        email:            input.email,
        phone:            input.phone,
        phone_normalized: phoneNormalized,
      })
      .eq("id", existingId)
      .select("id, created_at, first_name, last_name, email, phone, phone_normalized, crm_contact_id, crm_synced_at")
      .single();

    if (error) {
      console.error("[contact-repository] update error:", error.message);
      return null;
    }
    return mapContact(data);
  }

  // Only insert if we have at least email or phone
  if (!input.email && !phoneNormalized) return null;

  const { data, error } = await client
    .from("contacts")
    .insert({
      first_name:       input.firstName,
      last_name:        input.lastName,
      email:            input.email,
      phone:            input.phone,
      phone_normalized: phoneNormalized,
    })
    .select("id, created_at, first_name, last_name, email, phone, phone_normalized, crm_contact_id, crm_synced_at")
    .single();

  if (error) {
    console.error("[contact-repository] insert error:", error.message);
    return null;
  }
  return mapContact(data);
}

export async function updateContactCRM(contactId: string, crmContactId: string): Promise<void> {
  if (isDev()) return;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  await createAdminClient()
    .from("contacts")
    .update({ crm_contact_id: crmContactId, crm_synced_at: new Date().toISOString() })
    .eq("id", contactId);
}

function mapContact(row: Record<string, unknown>): DbContact {
  return {
    id:              row.id as string,
    createdAt:       row.created_at as string,
    firstName:       (row.first_name as string | null) ?? null,
    lastName:        (row.last_name as string | null) ?? null,
    email:           (row.email as string | null) ?? null,
    phone:           (row.phone as string | null) ?? null,
    phoneNormalized: (row.phone_normalized as string | null) ?? null,
    crmContactId:    (row.crm_contact_id as string | null) ?? null,
  };
}
