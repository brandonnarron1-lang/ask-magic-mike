"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { retryNotificationByType } from "../../lib/leadAlertService";
import { requireLeadCenterPermission } from "../../../src/lib/admin/rbac-session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
