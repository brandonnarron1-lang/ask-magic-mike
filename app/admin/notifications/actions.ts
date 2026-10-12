"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { retryNotificationByType, sendOwnerRequestedQaReviewCopy } from "../../lib/leadAlertService";
import { requireLeadCenterPermission } from "../../../src/lib/admin/rbac-session";
import { gateOwnerQaReviewCopy, reviewCopyOutcomeCode } from "../../lib/ownerQaReviewCopy";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Privileged POST surface, not authority from a checkbox. Local-only candidate:
 * disabled server binding, fresh actual session, exact original copy only. */
export async function sendOwnerQaReviewCopyAction(formData: FormData) {
  const principal = await requireLeadCenterPermission("notification:manage");
  const gate = gateOwnerQaReviewCopy(principal, {
    sourceNotificationId: String(formData.get("source_notification_id") ?? ""),
    confirmed: formData.get("confirm_owner_review_copy") === "yes",
  });
  if (!gate.ok) redirect(`/admin/notifications?notification_action=${gate.error}`);

  let outcome = "review_copy_outcome_ambiguous";
  try {
    // No dependency injection, alternate provider, recipient override or retry.
    // The existing helper rechecks eligibility/suppression and reads the stable
    // ledger; its existing one-attempt claim guards concurrent execution.
    outcome = reviewCopyOutcomeCode(await sendOwnerRequestedQaReviewCopy(gate.sourceNotificationId));
  } catch {
    // A provider may have accepted before a local result failed. Never retry.
  }
  revalidatePath("/admin/notifications");
  redirect(`/admin/notifications?notification_action=${outcome}`);
}

export async function retryLeadNotificationAction(formData: FormData) {
  await requireLeadCenterPermission("notification:manage");
  const notificationId = String(formData.get("notification_id") ?? "");
  const confirm = formData.get("confirm") === "yes";

  if (!UUID.test(notificationId)) {
    redirect("/admin/notifications?notification_action=invalid_notification_id");
  }
  if (!confirm) {
    redirect("/admin/notifications?notification_action=confirmation_required");
  }

  const result = await retryNotificationByType(notificationId);
  revalidatePath("/admin/notifications");

  if (!result.ok) {
    redirect("/admin/notifications?notification_action=" + encodeURIComponent(result.error));
  }

  if (result.warning) {
    redirect("/admin/notifications?notification_action=retry_" + encodeURIComponent(result.warning));
  }

  redirect("/admin/notifications?notification_action=retry_processed");
}
