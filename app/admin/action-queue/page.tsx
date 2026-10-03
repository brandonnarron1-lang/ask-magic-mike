import { redirect } from "next/navigation";

export default function LegacyActionQueueRedirect() {
  redirect("/admin/today");
}
