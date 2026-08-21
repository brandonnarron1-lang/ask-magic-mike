"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordOwnedDemandPublicationProof } from "../../lib/persistence/neonOwnedDemandPublicationProofs";
import { requireLeadCenterPermission } from "../../../src/lib/admin/rbac-session";

export async function recordOwnedDemandPublicationProofAction(formData: FormData) {
  const principal = await requireLeadCenterPermission("growth:manage");
  if (!principal) {
    redirect("/lead-center-login?error=rbac_required");
  }
  if (formData.get("confirm") !== "yes") {
    redirect("/admin/distribution?publication_action=confirmation_required#publication-ledger");
  }

  const result = await recordOwnedDemandPublicationProof({
    channelKey: String(formData.get("channel_key") ?? ""),
    placementKey: String(formData.get("placement_key") ?? ""),
    platformState: String(formData.get("platform_state") ?? ""),
    proofType: String(formData.get("proof_type") ?? ""),
    evidenceUrl: String(formData.get("evidence_url") ?? "") || null,
    evidenceReference: String(formData.get("evidence_reference") ?? "") || null,
    finalCopy: String(formData.get("final_copy") ?? ""),
    creativeAssetKey: String(formData.get("creative_asset_key") ?? "") || null,
    approvalReference: String(formData.get("approval_reference") ?? ""),
    actor: `lead_center:${principal.userId}`,
    isTest: false,
  });

  revalidatePath("/admin/distribution");
  revalidatePath("/admin/growth");
  redirect(
    "/admin/distribution?publication_action=" +
      (result.ok
        ? result.idempotentReplay ? "already_recorded" : "proof_recorded"
        : encodeURIComponent(result.error)) +
      "#publication-ledger",
  );
}
