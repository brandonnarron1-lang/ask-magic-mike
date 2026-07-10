"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { retryNotification } from "../../lib/leadNotificationService";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function retryLeadNotificationAction(formData: FormData) {
  const notificationId = String(formData.get("notification_id") ?? "");
  const confirm = formData.get("confirm") === "yes";

  if (!UUID.test(notificationId)) {
    redirect("/admin/notifications?notification_action=invalid_notification_id");
  }
  if (!confirm) {
    redirect("/admin/notifications?notification_action=confirmation_required");
  }

  const result = await retryNotification(notificationId);
  revalidatePath("/admin/notifications");

  if (!result.ok) {
    redirect("/admin/notifications?notification_action=" + result.error);
  }

  if (result.warning) {
    redirect("/admin/notifications?notification_action=retry_" + result.warning);
  }

  redirect("/admin/notifications?notification_action=retry_processed");
}
