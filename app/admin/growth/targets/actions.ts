"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordGrowthKpiTarget } from "../../../lib/persistence/neonGrowthKpiTargets";
import { requireLeadCenterPermission } from "../../../../src/lib/admin/rbac-session";
import { assertDatabaseMutationAllowed } from "../../../../src/lib/preview-security";
import { checkRateLimit, LIMITS } from "../../../../src/lib/security/rate-limit";

export async function recordGrowthKpiTargetAction(formData: FormData) {
  const principal = await requireLeadCenterPermission("growth:manage");
  if (!principal) redirect("/lead-center-login?error=rbac_required");
  const windowDays = Number(formData.get("window_days"));
  const safeWindow = [30, 90, 365].includes(windowDays) ? windowDays : 30;
  if (formData.get("confirm") !== "yes") {
    redirect(`/admin/growth/targets?window=${safeWindow}&target_action=confirmation_required`);
  }
  const mutation = assertDatabaseMutationAllowed(process.env);
  if (!mutation.ok) {
    redirect(`/admin/growth/targets?window=${safeWindow}&target_action=${encodeURIComponent(mutation.error)}`);
  }
  const limit = await checkRateLimit(
    `lead-center:${principal.userId}`,
    LIMITS.growthTarget.limit,
    LIMITS.growthTarget.windowMs,
    "growthTarget",
  );
  if (!limit.allowed) {
    redirect(`/admin/growth/targets?window=${safeWindow}&target_action=rate_limited`);
  }

  const rawTarget = String(formData.get("target_value") ?? "").trim();
  const result = await recordGrowthKpiTarget({
    metricKey: String(formData.get("metric_key") ?? ""),
    status: String(formData.get("status") ?? ""),
    targetValue: rawTarget || null,
    rationale: String(formData.get("rationale") ?? ""),
    approvalReference: String(formData.get("approval_reference") ?? "") || null,
    windowDays: safeWindow,
    actor: `lead_center:${principal.userId}`,
    isTest: false,
  });

  revalidatePath("/admin/growth/targets");
  revalidatePath("/admin/growth");
  const action = result.ok
    ? result.idempotentReplay ? "already_recorded" : "target_recorded"
    : result.error;
  redirect(`/admin/growth/targets?window=${safeWindow}&target_action=${encodeURIComponent(action)}`);
}
