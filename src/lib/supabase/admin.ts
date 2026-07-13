import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { assertDatabaseMutationAllowed } from "@/lib/preview-security";

export function createAdminClient() {
  const mutation = assertDatabaseMutationAllowed(process.env as Record<string, string | undefined>);
  if (!mutation.ok) {
    throw new Error("Preview data-disabled mode blocks Supabase admin client access.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for admin operations."
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
