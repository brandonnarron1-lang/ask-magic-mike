import { describe, expect, it } from "vitest";
import { COPILOT_TOOL_REGISTER, copilotToolsForRole } from "@/lib/ai/copilot-tool-register";

describe("Phase 7 copilot tool register", () => {
  it("keeps every tool advisory or human-approved and unable to send", () => {
    expect(COPILOT_TOOL_REGISTER.length).toBeGreaterThanOrEqual(20);
    expect(new Set(COPILOT_TOOL_REGISTER.map((tool) => tool.id)).size).toBe(COPILOT_TOOL_REGISTER.length);
    for (const tool of COPILOT_TOOL_REGISTER) {
      expect(tool.executionPath).toMatch(/^\//);
      expect(tool.productionSendAllowed).toBe(false);
      if (tool.kind === "controlled_action") expect(tool.humanApprovalRequired).toBe(true);
    }
  });

  it("does not expose lead or action tools to a read-only analyst", () => {
    const tools = copilotToolsForRole("read_only_analyst");
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.every((tool) => tool.permission === "report:view")).toBe(true);
    expect(tools.some((tool) => tool.kind === "controlled_action")).toBe(false);
  });

  it("limits an approved agent to assigned-lead tools", () => {
    const tools = copilotToolsForRole("approved_agent");
    expect(tools.some((tool) => tool.id === "get_lead")).toBe(true);
    expect(tools.some((tool) => tool.id === "assign_lead")).toBe(false);
    expect(tools.some((tool) => tool.id === "generate_email_preview")).toBe(false);
  });

  it("gives administrators the complete registry without automatic execution", () => {
    const tools = copilotToolsForRole("administrator");
    expect(tools).toHaveLength(COPILOT_TOOL_REGISTER.length);
    expect(tools.find((tool) => tool.id === "assign_lead")).toMatchObject({
      humanApprovalRequired: true,
      productionSendAllowed: false,
    });
  });
});
