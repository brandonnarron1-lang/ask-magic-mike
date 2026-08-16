import { hasLeadCenterPermission, type LeadCenterRole } from "@/lib/admin/rbac-policy";

export type CopilotToolDefinition = {
  id: string;
  kind: "read" | "controlled_action";
  description: string;
  permission: "lead:view_assigned" | "lead:update_assigned" | "lead:assign" | "notification:manage" | "report:view";
  humanApprovalRequired: boolean;
  productionSendAllowed: false;
  executionPath: string;
};

export const COPILOT_TOOL_REGISTER: CopilotToolDefinition[] = [
  { id: "get_lead", kind: "read", description: "Read an authorized lead's deterministic fields.", permission: "lead:view_assigned", humanApprovalRequired: false, productionSendAllowed: false, executionPath: "/api/admin/copilot" },
  { id: "search_authorized_leads", kind: "read", description: "Search only leads visible to the signed-in operator.", permission: "lead:view_assigned", humanApprovalRequired: false, productionSendAllowed: false, executionPath: "/admin/leads" },
  { id: "get_timeline", kind: "read", description: "Read the authorized lead timeline.", permission: "lead:view_assigned", humanApprovalRequired: false, productionSendAllowed: false, executionPath: "/admin/leads/{leadId}" },
  { id: "get_consent", kind: "read", description: "Read recorded consent evidence without inferring permission.", permission: "lead:view_assigned", humanApprovalRequired: false, productionSendAllowed: false, executionPath: "/api/admin/copilot" },
  { id: "get_communication_permission", kind: "read", description: "Evaluate purpose-specific communication permission.", permission: "lead:view_assigned", humanApprovalRequired: false, productionSendAllowed: false, executionPath: "/api/admin/leads/{leadId}/communication-permissions" },
  { id: "get_attribution", kind: "read", description: "Read first/last-touch and placement facts.", permission: "lead:view_assigned", humanApprovalRequired: false, productionSendAllowed: false, executionPath: "/api/admin/copilot" },
  { id: "get_assignment", kind: "read", description: "Read the current assignment and deterministic routing reason.", permission: "lead:view_assigned", humanApprovalRequired: false, productionSendAllowed: false, executionPath: "/api/admin/copilot" },
  { id: "get_notification_state", kind: "read", description: "Read outbox and provider lifecycle state.", permission: "lead:view_assigned", humanApprovalRequired: false, productionSendAllowed: false, executionPath: "/api/admin/copilot" },
  { id: "get_provider_events", kind: "read", description: "Read normalized provider events linked to the authorized lead.", permission: "lead:view_assigned", humanApprovalRequired: false, productionSendAllowed: false, executionPath: "/api/admin/copilot" },
  { id: "get_ai_summary", kind: "read", description: "Read the latest advisory AI result and usage record.", permission: "lead:view_assigned", humanApprovalRequired: false, productionSendAllowed: false, executionPath: "/api/admin/copilot" },
  { id: "get_system_health", kind: "read", description: "Read redacted system-health summaries.", permission: "report:view", humanApprovalRequired: false, productionSendAllowed: false, executionPath: "/api/admin/health" },
  { id: "get_form_status", kind: "read", description: "Read the approved WordPress form-readiness matrix without activating a form.", permission: "report:view", humanApprovalRequired: false, productionSendAllowed: false, executionPath: "/integrations/ourtownproperties" },
  { id: "get_daily_metrics", kind: "read", description: "Read test-excluded daily operating metrics.", permission: "report:view", humanApprovalRequired: false, productionSendAllowed: false, executionPath: "/admin/reporting" },
  { id: "generate_email_preview", kind: "controlled_action", description: "Render but never send a version-pinned email preview.", permission: "notification:manage", humanApprovalRequired: true, productionSendAllowed: false, executionPath: "/api/admin/message-templates" },
  { id: "generate_sms_preview", kind: "controlled_action", description: "Render but never send an SMS preview.", permission: "notification:manage", humanApprovalRequired: true, productionSendAllowed: false, executionPath: "/api/admin/message-templates" },
  { id: "pause_test_sequence", kind: "controlled_action", description: "Pause a suppressed test sequence with audit logging.", permission: "notification:manage", humanApprovalRequired: true, productionSendAllowed: false, executionPath: "/api/admin/leads/{leadId}/sequences" },
  { id: "cancel_test_sequence", kind: "controlled_action", description: "Cancel a suppressed test sequence with audit logging.", permission: "notification:manage", humanApprovalRequired: true, productionSendAllowed: false, executionPath: "/api/admin/leads/{leadId}/sequences" },
  { id: "create_internal_note", kind: "controlled_action", description: "Create an internal note through the audited Lead Center workflow.", permission: "lead:update_assigned", humanApprovalRequired: true, productionSendAllowed: false, executionPath: "/admin/leads/{leadId}" },
  { id: "request_human_review", kind: "controlled_action", description: "Create an internal review request; no consumer contact.", permission: "lead:update_assigned", humanApprovalRequired: true, productionSendAllowed: false, executionPath: "/admin/leads/{leadId}" },
  { id: "change_status", kind: "controlled_action", description: "Change lead status only after explicit operator confirmation and audit logging.", permission: "lead:update_assigned", humanApprovalRequired: true, productionSendAllowed: false, executionPath: "/admin/leads/{leadId}" },
  { id: "assign_lead", kind: "controlled_action", description: "Assign a lead only through the approved routing workflow and explicit operator confirmation.", permission: "lead:assign", humanApprovalRequired: true, productionSendAllowed: false, executionPath: "/admin/allocation" },
];

export function copilotToolsForRole(role: LeadCenterRole) {
  return COPILOT_TOOL_REGISTER.filter((tool) => hasLeadCenterPermission(role, tool.permission));
}
