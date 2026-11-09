import { loadAdminTodayQueue } from "../../lib/adminTodayView";
import { requireLeadCenterPermission } from "../../../src/lib/admin/rbac-session";
import { LeadCommandDesk } from "../../components/admin/LeadCommandDesk";
import { deskFilter, deskPage } from "../../lib/adminTodayDesk";
import { todayTaskReviewId } from "../../lib/todayTaskReview";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const notices: Record<string,string> = {
  completed: "Internal task completed. This does not record a human response.",
  snoozed: "Action snoozed for 24 hours.", dismissed: "Action dismissed with its audit reason.",
  stale_action: "This action changed. Review the refreshed record before trying again.",
  forbidden: "Your current account cannot change this action.",
  preview_data_disabled: "This environment is read-only. Nothing was changed.",
  queue_unavailable: "The complete queue could not be read. No action was changed.",
  dismissal_reason_required: "Enter a brief reason before dismissing an action.",
};
export default async function AdminTodayPage({ searchParams }: {
  searchParams?: Promise<{ view?: string; page?: string; today_action?: string; review_task?: string }>;
}) {
  const principal = await requireLeadCenterPermission("lead:view_assigned");
  const [queue,params] = await Promise.all([loadAdminTodayQueue(principal), searchParams || Promise.resolve({} as {view?:string;page?:string;today_action?:string;review_task?:string})]);
  return <LeadCommandDesk queue={queue} principal={principal} filter={deskFilter(params.view)} page={deskPage(params.page)}
    reviewTask={params.review_task === undefined ? undefined : todayTaskReviewId(params.review_task) || "invalid"}
    notice={params.today_action ? notices[params.today_action] || "Action not confirmed. Review the current record." : null}/>;
}
