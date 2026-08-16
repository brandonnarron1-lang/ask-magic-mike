import { hasLeadCenterPermission, type LeadCenterRole } from "@/lib/admin/rbac-policy";

export type CopilotToolDefinition = {
  id: string;
  kind: "read" | "controlled_action";
  description: string;
  permission: "lead:view_assigned" | "lead:update_assigned" | "lead:assign" | "notification:manage" | "report:view";
  humanApprovalRequired: boolean;
  productionSendAllowed: false;
};

export const COPILOT_TOOL_REGISTER: CopilotToolDefinition[] = [
  { id: "get_lead", kind: "read", description: "Read an authorized lead's deterministic fields.", permission: "lead:view_assigned", humanApprovalRequired: false, productionSendAllowed: false },
  { id: "get_timeline", kind: "read", description: "Read the authorized lead timeline.", permission: "lead:view_assigned", humanApprovalRequired: false, productionSendAllowed: false },
  { id: "get_consent", kind: "read", description: "Read recorded consent evidence without inferring permission.", permission: "lead:view_assigned", humanApprovalRequired: false, productionSendAllowed: false },
  { id: "get_communication_permission", kind: "read", description: "Evaluate purpose-specific communication permission.", permission: "lead:view_assigned", humanApprovalRequired: false, productionSendAllowed: false },
  { id: "get_attribution", kind: "read", description: "Read first/last-touch and placement facts.", permission: "lead:view_assigned", humanApprovalRequired: false, productionSendAllowed: false },
  { id: "get_notification_state", kind: "read", description: "Read outbox and provider lifecycle state.", permission: "lead:view_assigned", humanApprovalRequired: false, productionSendAllowed: false },
  { id: "get_system_health", kind: "read", description: "Read redacted system-health summaries.", permission: "report:view", humanApprovalRequired: false, productionSendAllowed: false },
  { id: "generate_email_preview", kind: "controlled_action", description: "Render but never send a version-pinned email preview.", permission: "notification:manage", humanApprovalRequired: true, productionSendAllowed: false },
  { id: "generate_sms_preview", kind: "controlled_action", description: "Render but never send an SMS preview.", permission: "notification:manage", humanApprovalRequired: true, productionSendAllowed: false },
  { id: "pause_test_sequence", kind: "controlled_action", description: "Pause a suppressed test sequence with audit logging.", permission: "notification:manage", humanApprovalRequired: true, productionSendAllowed: false },
  { id: "cancel_test_sequence", kind: "controlled_action", description: "Cancel a suppressed test sequence with audit logging.", permission: "notification:manage", humanApprovalRequired: true, productionSendAllowed: false },
  { id: "request_human_review", kind: "controlled_action", description: "Create an internal review request; no consumer contact.", permission: "lead:update_assigned", humanApprovalRequired: true, productionSendAllowed: false },
];

export function copilotToolsForRole(role: LeadCenterRole) {
  return COPILOT_TOOL_REGISTER.filter((tool) => hasLeadCenterPermission(role, tool.permission));
}

