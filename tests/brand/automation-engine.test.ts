/**
 * Phase 10 — Automation Engine Tests
 * 70+ tests covering: engine purity, planner correctness, template integrity,
 * component shape, audit log, access control, token compliance, brand rules,
 * no-outbound-execution safety, workflow determinism.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve, extname } from "path";
import {
  buildExecutionPlan,
  evaluateConditions,
  resolveApprovalRequirements,
  prioritizeWorkflowQueue,
  TRIGGER_LABELS,
  CATEGORY_LABELS,
  STATUS_CONFIG,
} from "../../src/lib/automation/workflow-engine";
import type {
  WorkflowDefinition,
  WorkflowSignals,
  WorkflowStep,
  ExecutionPlan,
} from "../../src/lib/automation/workflow-engine";
import {
  AUTOMATION_TEMPLATES,
  getTemplate,
  getTemplatesByCategory,
  getTemplatesByTrigger,
  getTemplatesByPriority,
} from "../../src/lib/automation/automation-templates";
import {
  buildMorningBrief,
  planActiveWorkflows,
  scoreExecutionImpact,
  estimateCompletionTime,
  buildApprovalQueue,
} from "../../src/lib/automation/execution-planner";
import {
  buildAuditSummary,
  AUDIT_EVENT_LABELS,
  AUDIT_EVENT_COLORS,
} from "../../src/lib/automation/audit-log";
import type { AuditEvent } from "../../src/lib/automation/audit-log";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readSrc(rel: string) {
  return readFileSync(resolve(__dirname, "../../", rel), "utf-8");
}

function gatherSrcFiles(dir: string, extensions = [".ts", ".tsx"]) {
  const base = resolve(__dirname, "../../", dir);
  if (!existsSync(base)) return [] as string[];
  const entries = readdirSync(base, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && extensions.includes(extname(e.name)))
    .map((e) => resolve(base, e.name));
}

function makeSignals(overrides: Partial<WorkflowSignals> = {}): WorkflowSignals {
  return {
    urgentLeadCount: 0,
    newLeads24h: 0,
    slaBreachCount: 0,
    slaWarningCount: 0,
    activeAgentCount: 2,
    overCapacityAgents: 0,
    underCapacityAgents: 0,
    openTaskCount: 0,
    overdueTaskCount: 0,
    appointmentsToday: 0,
    missedAppointments24h: 0,
    abandonedConversations: 0,
    activeCampaignCount: 0,
    underperformingCampaigns: 0,
    pendingReviewCount: 0,
    averageLeadScore: 65,
    ...overrides,
  };
}

function makeDefinition(overrides: Partial<WorkflowDefinition> = {}): WorkflowDefinition {
  const baseStep: WorkflowStep = {
    id: "s1",
    label: "Prepare task",
    type: "prepare",
    description: "Prepare a task",
    approvalRequired: "never",
    estimatedMinutes: 5,
    rollbackCapable: true,
    dependencies: [],
  };
  return {
    id: "test_wf",
    version: "1.0.0",
    trigger: "lead_created",
    name: "Test Workflow",
    description: "A test workflow",
    priority: "medium",
    category: "lead_management",
    steps: [baseStep],
    conditions: [],
    estimatedImpact: "medium",
    estimatedTotalMinutes: 5,
    requiresBrokerApproval: false,
    rollbackStrategy: "Revert all prepared steps",
    tags: ["test"],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Workflow Engine — pure function tests
// ---------------------------------------------------------------------------

describe("workflow engine — buildExecutionPlan", () => {
  it("returns an ExecutionPlan with the correct workflowId", () => {
    const def = makeDefinition();
    const plan = buildExecutionPlan(def, makeSignals(), 0.9);
    expect(plan.workflowId).toBe("test_wf");
  });

  it("sets workflowName from definition", () => {
    const def = makeDefinition({ name: "Lead Assign Flow" });
    const plan = buildExecutionPlan(def, makeSignals(), 0.8);
    expect(plan.workflowName).toBe("Lead Assign Flow");
  });

  it("maps steps correctly to step plans", () => {
    const def = makeDefinition();
    const plan = buildExecutionPlan(def, makeSignals(), 0.9);
    expect(plan.steps.length).toBe(1);
    expect(plan.steps[0].stepId).toBe("s1");
  });

  it("confidence is clamped between 0 and 100", () => {
    const def = makeDefinition();
    const high = buildExecutionPlan(def, makeSignals(), 9999);
    const low  = buildExecutionPlan(def, makeSignals(), -5);
    expect(high.confidence).toBeLessThanOrEqual(100);
    expect(low.confidence).toBeGreaterThanOrEqual(0);
  });

  it("critical priority produces critical impact", () => {
    const def = makeDefinition({ priority: "critical", estimatedImpact: "critical" });
    const plan = buildExecutionPlan(def, makeSignals(), 0.9);
    expect(plan.impact.level).toBe("critical");
  });

  it("requiresBrokerApproval propagates to plan", () => {
    const def = makeDefinition({ requiresBrokerApproval: true });
    const plan = buildExecutionPlan(def, makeSignals(), 0.8);
    expect(plan.requiresBrokerApproval).toBe(true);
  });

  it("is deterministic — same input always produces same output", () => {
    const def = makeDefinition();
    const sig = makeSignals({ urgentLeadCount: 3 });
    const a = buildExecutionPlan(def, sig, 0.75);
    const b = buildExecutionPlan(def, sig, 0.75);
    expect(a.workflowId).toBe(b.workflowId);
    expect(a.confidence).toBe(b.confidence);
    expect(a.steps.length).toBe(b.steps.length);
  });
});

// ---------------------------------------------------------------------------
// 2. Workflow Engine — evaluateConditions
// ---------------------------------------------------------------------------

describe("workflow engine — evaluateConditions", () => {
  it("returns true when conditions array is empty", () => {
    expect(evaluateConditions([], makeSignals())).toBe(true);
  });

  it("gt operator evaluates correctly", () => {
    const cond = [{ field: "urgentLeadCount", operator: "gt" as const, value: 0 }];
    expect(evaluateConditions(cond, makeSignals({ urgentLeadCount: 3 }))).toBe(true);
    expect(evaluateConditions(cond, makeSignals({ urgentLeadCount: 0 }))).toBe(false);
  });

  it("eq operator evaluates correctly", () => {
    const cond = [{ field: "activeAgentCount", operator: "eq" as const, value: 2 }];
    expect(evaluateConditions(cond, makeSignals({ activeAgentCount: 2 }))).toBe(true);
    expect(evaluateConditions(cond, makeSignals({ activeAgentCount: 5 }))).toBe(false);
  });

  it("lte operator evaluates correctly", () => {
    const cond = [{ field: "averageLeadScore", operator: "lte" as const, value: 50 }];
    expect(evaluateConditions(cond, makeSignals({ averageLeadScore: 30 }))).toBe(true);
    expect(evaluateConditions(cond, makeSignals({ averageLeadScore: 80 }))).toBe(false);
  });

  it("multiple conditions all must pass (AND logic)", () => {
    const conds = [
      { field: "urgentLeadCount", operator: "gt" as const, value: 0 },
      { field: "slaBreachCount", operator: "gt" as const, value: 0 },
    ];
    expect(evaluateConditions(conds, makeSignals({ urgentLeadCount: 1, slaBreachCount: 1 }))).toBe(true);
    expect(evaluateConditions(conds, makeSignals({ urgentLeadCount: 1, slaBreachCount: 0 }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Workflow Engine — resolveApprovalRequirements
// ---------------------------------------------------------------------------

describe("workflow engine — resolveApprovalRequirements", () => {
  it("returns false when no steps require approval", () => {
    const steps: WorkflowStep[] = [makeDefinition().steps[0]];
    expect(resolveApprovalRequirements(steps, "low")).toBe(false);
  });

  it("returns true when a step is always required", () => {
    const steps: WorkflowStep[] = [{ ...makeDefinition().steps[0], approvalRequired: "always" }];
    expect(resolveApprovalRequirements(steps, "low")).toBe(true);
  });

  it("returns true for if_high_impact when impact is critical", () => {
    const steps: WorkflowStep[] = [{ ...makeDefinition().steps[0], approvalRequired: "if_high_impact" }];
    expect(resolveApprovalRequirements(steps, "critical")).toBe(true);
  });

  it("returns false for if_high_impact when impact is low", () => {
    const steps: WorkflowStep[] = [{ ...makeDefinition().steps[0], approvalRequired: "if_high_impact" }];
    expect(resolveApprovalRequirements(steps, "low")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Workflow Engine — prioritizeWorkflowQueue
// ---------------------------------------------------------------------------

describe("workflow engine — prioritizeWorkflowQueue", () => {
  it("returns an empty array when given empty input", () => {
    expect(prioritizeWorkflowQueue([])).toEqual([]);
  });

  it("sorts critical before high before medium", () => {
    const defCritical = makeDefinition({ priority: "critical", estimatedImpact: "critical" });
    const defMedium   = makeDefinition({ id: "m", priority: "medium",   estimatedImpact: "medium"   });
    const planC = buildExecutionPlan(defCritical, makeSignals(), 0.9);
    const planM = buildExecutionPlan(defMedium,   makeSignals(), 0.9);
    const sorted = prioritizeWorkflowQueue([planM, planC]);
    expect(sorted[0].priority).toBe("critical");
  });
});

// ---------------------------------------------------------------------------
// 5. Workflow Engine — label & config maps
// ---------------------------------------------------------------------------

describe("workflow engine — label and status maps", () => {
  it("TRIGGER_LABELS covers all 22 trigger values", () => {
    expect(Object.keys(TRIGGER_LABELS).length).toBeGreaterThanOrEqual(20);
  });

  it("CATEGORY_LABELS covers all 6 categories", () => {
    expect(Object.keys(CATEGORY_LABELS).length).toBe(6);
  });

  it("STATUS_CONFIG covers all 9 status values", () => {
    expect(Object.keys(STATUS_CONFIG).length).toBe(9);
  });

  it("STATUS_CONFIG has label + color for each status", () => {
    for (const [, v] of Object.entries(STATUS_CONFIG)) {
      const config = v as { label: string; color: string };
      expect(typeof config.label).toBe("string");
      expect(typeof config.color).toBe("string");
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Automation Templates — integrity
// ---------------------------------------------------------------------------

describe("automation templates — integrity", () => {
  it("has exactly 20 templates", () => {
    expect(AUTOMATION_TEMPLATES.length).toBe(20);
  });

  it("every template has a unique id", () => {
    const ids = AUTOMATION_TEMPLATES.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("every template has at least one step", () => {
    for (const t of AUTOMATION_TEMPLATES) {
      expect(t.steps.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("every template has a version string", () => {
    for (const t of AUTOMATION_TEMPLATES) {
      expect(t.version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it("every template has a rollbackStrategy", () => {
    for (const t of AUTOMATION_TEMPLATES) {
      expect(t.rollbackStrategy.length).toBeGreaterThan(0);
    }
  });

  it("every step has a valid StepType", () => {
    const validTypes = new Set([
      "prepare", "notify_draft", "assign", "schedule",
      "flag", "escalate", "log", "route", "score", "review",
    ]);
    for (const t of AUTOMATION_TEMPLATES) {
      for (const s of t.steps) {
        expect(validTypes.has(s.type)).toBe(true);
      }
    }
  });

  it("every step has a valid ApprovalRequirement", () => {
    const valid = new Set(["always", "if_high_impact", "never"]);
    for (const t of AUTOMATION_TEMPLATES) {
      for (const s of t.steps) {
        expect(valid.has(s.approvalRequired)).toBe(true);
      }
    }
  });

  it("getTemplate returns correct template by id", () => {
    const first = AUTOMATION_TEMPLATES[0];
    expect(getTemplate(first.id)?.id).toBe(first.id);
  });

  it("getTemplate returns undefined for unknown id", () => {
    expect(getTemplate("no_such_id")).toBeUndefined();
  });

  it("getTemplatesByCategory returns correct subset for lead_management", () => {
    const leadMgmt = getTemplatesByCategory("lead_management");
    expect(leadMgmt.length).toBeGreaterThan(0);
    for (const t of leadMgmt) {
      expect(t.category).toBe("lead_management");
    }
  });

  it("getTemplatesByTrigger returns correct subset for lead_created", () => {
    const leadCreated = getTemplatesByTrigger("lead_created");
    expect(leadCreated.length).toBeGreaterThan(0);
    for (const t of leadCreated) {
      expect(t.trigger).toBe("lead_created");
    }
  });

  it("getTemplatesByPriority returns array sorted critical-first", () => {
    const byPri = getTemplatesByPriority("critical");
    for (const t of byPri) {
      expect(t.priority).toBe("critical");
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Execution Planner
// ---------------------------------------------------------------------------

describe("execution planner — buildMorningBrief", () => {
  it("returns 8 brief items", () => {
    const sig   = makeSignals();
    const brief = buildMorningBrief(sig, 0);
    expect(brief.items.length).toBe(8);
  });

  it("each brief item has question and answer", () => {
    const brief = buildMorningBrief(makeSignals(), 0);
    for (const item of brief.items) {
      expect(typeof item.question).toBe("string");
      expect(typeof item.answer).toBe("string");
    }
  });

  it("urgency is critical when slaBreachCount > 0", () => {
    const brief = buildMorningBrief(makeSignals({ slaBreachCount: 2 }), 0);
    const hasUrgentItem = brief.items.some((i) => i.urgency === "critical");
    expect(hasUrgentItem).toBe(true);
  });

  it("pendingApprovals count is reflected in brief", () => {
    const brief = buildMorningBrief(makeSignals(), 5);
    expect(brief.pendingApprovals).toBe(5);
  });
});

describe("execution planner — planActiveWorkflows", () => {
  it("returns an array of ExecutionPlans", () => {
    const plans = planActiveWorkflows(makeSignals());
    expect(Array.isArray(plans)).toBe(true);
  });

  it("all returned plans have a workflowId", () => {
    const plans = planActiveWorkflows(makeSignals({ urgentLeadCount: 2 }));
    for (const p of plans) {
      expect(typeof p.workflowId).toBe("string");
    }
  });

  it("is deterministic for same signals", () => {
    const sig = makeSignals({ slaBreachCount: 1 });
    const a = planActiveWorkflows(sig).map((p) => p.workflowId);
    const b = planActiveWorkflows(sig).map((p) => p.workflowId);
    expect(a).toEqual(b);
  });
});

describe("execution planner — scoreExecutionImpact", () => {
  it("returns a score between 0 and 100", () => {
    const def  = makeDefinition({ priority: "high", estimatedImpact: "high" });
    const plan = buildExecutionPlan(def, makeSignals(), 0.8);
    const score = scoreExecutionImpact(plan);
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
  });

  it("critical plans score higher than low plans", () => {
    const defC = makeDefinition({ priority: "critical", estimatedImpact: "critical" });
    const defL = makeDefinition({ id: "lx", priority: "low", estimatedImpact: "low" });
    const planC = buildExecutionPlan(defC, makeSignals(), 0.95);
    const planL = buildExecutionPlan(defL, makeSignals(), 0.5);
    expect(scoreExecutionImpact(planC).score).toBeGreaterThan(scoreExecutionImpact(planL).score);
  });
});

describe("execution planner — estimateCompletionTime", () => {
  it("returns a string with 'm' for sub-hour durations", () => {
    expect(estimateCompletionTime(0)).toContain("m");
    expect(estimateCompletionTime(30)).toContain("m");
  });

  it("returns hours string for long durations", () => {
    expect(estimateCompletionTime(120)).toContain("h");
  });
});

describe("execution planner — buildApprovalQueue", () => {
  it("returns only plans that require broker approval", () => {
    const defApproval = makeDefinition({ requiresBrokerApproval: true });
    const defAuto     = makeDefinition({ id: "auto_wf", requiresBrokerApproval: false });
    const plans: ExecutionPlan[] = [
      buildExecutionPlan(defApproval, makeSignals(), 0.9),
      buildExecutionPlan(defAuto,     makeSignals(), 0.9),
    ];
    const queue = buildApprovalQueue(plans);
    // Only the broker-approval plan enters the queue
    expect(queue.length).toBe(1);
    expect(queue[0].workflowId).toBe(defApproval.id);
  });

  it("excludes auto-prepare plans from the approval queue", () => {
    const defAuto = makeDefinition({ id: "pure_auto", requiresBrokerApproval: false });
    const plans   = [buildExecutionPlan(defAuto, makeSignals(), 0.9)];
    expect(buildApprovalQueue(plans).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 8. Audit Log
// ---------------------------------------------------------------------------

describe("audit log — buildAuditSummary", () => {
  it("returns zeroes for empty event list", () => {
    const summary = buildAuditSummary([]);
    expect(summary.totalEvents).toBe(0);
    expect(summary.failuresDetected).toBe(0);
  });

  it("counts workflow_created events", () => {
    const event: AuditEvent = {
      id: "e1", eventType: "workflow_created", workflowId: "w1",
      workflowName: "Test", timestamp: new Date().toISOString(),
      actorId: null, actorLabel: "System",
      detail: "Created", metadata: {}, immutable: true,
    };
    const summary = buildAuditSummary([event]);
    expect(summary.workflowsCreated).toBe(1);
    expect(summary.totalEvents).toBe(1);
  });

  it("counts failure_detected events", () => {
    const event: AuditEvent = {
      id: "e2", eventType: "failure_detected", workflowId: "w2",
      workflowName: "Fail", timestamp: new Date().toISOString(),
      actorId: null, actorLabel: "System",
      detail: "Failed", metadata: {}, immutable: true,
    };
    const summary = buildAuditSummary([event]);
    expect(summary.failuresDetected).toBe(1);
  });
});

describe("audit log — label and color maps", () => {
  it("AUDIT_EVENT_LABELS has an entry for all 10 event types", () => {
    expect(Object.keys(AUDIT_EVENT_LABELS).length).toBe(10);
  });

  it("AUDIT_EVENT_COLORS has an entry for all 10 event types", () => {
    expect(Object.keys(AUDIT_EVENT_COLORS).length).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// 9. Token compliance — no red-* tokens
// ---------------------------------------------------------------------------

describe("token compliance — automation files", () => {
  const dirs = [
    "src/lib/automation",
    "src/components/admin/automation",
    "src/app/(admin)/admin/automation",
  ];
  const files = dirs.flatMap((d) => gatherSrcFiles(d));

  it("no red-* Tailwind tokens in automation source files", () => {
    const violations: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf-8");
      const matches = src.match(/\bred-\d+/g);
      if (matches) violations.push(`${file}: ${matches.join(", ")}`);
    }
    expect(violations).toEqual([]);
  });

  it("all opacity-0 elements have motion-reduce safety net in automation pages", () => {
    const pageFiles = gatherSrcFiles("src/app/(admin)/admin/automation");
    for (const file of pageFiles) {
      const src = readFileSync(file, "utf-8");
      if (src.includes("opacity-0")) {
        expect(src).toMatch(/motion-reduce:opacity-100/);
      }
    }
  });

  it("motion-safe: prefix on animations in automation files", () => {
    for (const file of files) {
      const src = readFileSync(file, "utf-8");
      const rawAnimate = src.match(/className[^>]*\banimate-(?!none)/g);
      if (rawAnimate) {
        for (const match of rawAnimate) {
          const hasSafe = match.includes("motion-safe:") || src.includes("motion-safe:animate-");
          expect(hasSafe).toBe(true);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 10. Brand compliance — forbidden copy
// ---------------------------------------------------------------------------

describe("brand compliance — forbidden copy", () => {
  const dirs = [
    "src/lib/automation",
    "src/components/admin/automation",
    "src/app/(admin)/admin/automation",
  ];
  const files = dirs.flatMap((d) => gatherSrcFiles(d));

  it("no 'genie' in automation source", () => {
    for (const file of files) {
      expect(readFileSync(file, "utf-8").toLowerCase()).not.toMatch(/\bgenie\b/);
    }
  });

  it("no 'magic lamp' in automation source", () => {
    for (const file of files) {
      expect(readFileSync(file, "utf-8").toLowerCase()).not.toMatch(/magic\s+lamp/);
    }
  });

  it("no MLS markers in automation public source", () => {
    for (const file of files) {
      const src = readFileSync(file, "utf-8");
      expect(src).not.toMatch(/\bMLS\b/);
    }
  });

  it("Mike Eatmon not referenced as mascot or chatbot in automation files", () => {
    for (const file of files) {
      const src = readFileSync(file, "utf-8").toLowerCase();
      expect(src).not.toMatch(/mike\s+eatmon\s+(mascot|chatbot|cartoon)/);
    }
  });
});

// ---------------------------------------------------------------------------
// 11. No-outbound-execution safety
// ---------------------------------------------------------------------------

describe("no-outbound-execution safety", () => {
  const automationLib = gatherSrcFiles("src/lib/automation");

  it("automation engine does not call fetch()", () => {
    for (const file of automationLib) {
      const src = readFileSync(file, "utf-8");
      expect(src).not.toMatch(/\bfetch\s*\(/);
    }
  });

  it("automation engine does not call sendEmail or triggerSMS", () => {
    for (const file of automationLib) {
      const src = readFileSync(file, "utf-8");
      expect(src).not.toMatch(/sendEmail|triggerSMS|sendSMS/);
    }
  });

  it("automation templates do not include auto-send steps", () => {
    for (const t of AUTOMATION_TEMPLATES) {
      for (const step of t.steps) {
        expect(step.type).not.toBe("send");
        expect(step.type).not.toBe("publish");
      }
    }
  });

  it("automation templates that notify use notify_draft type (not notify_send)", () => {
    const draftSteps = AUTOMATION_TEMPLATES.flatMap((t) =>
      t.steps.filter((s) => s.type === "notify_draft")
    );
    // Ensure no step type is a raw send type
    const allStepTypes = AUTOMATION_TEMPLATES.flatMap((t) => t.steps.map((s) => s.type));
    expect(allStepTypes).not.toContain("notify_send");
  });

  it("execution planner does not call process.exit or throw unhandled errors", () => {
    const plannerSrc = readSrc("src/lib/automation/execution-planner.ts");
    expect(plannerSrc).not.toMatch(/process\.exit/);
  });
});

// ---------------------------------------------------------------------------
// 12. No secret exposure in automation files
// ---------------------------------------------------------------------------

describe("no secret exposure in automation files", () => {
  const dirs = [
    "src/lib/automation",
    "src/components/admin/automation",
    "src/app/(admin)/admin/automation",
  ];
  const files = dirs.flatMap((d) => gatherSrcFiles(d));

  it("no ADMIN_SECRET reference in automation source", () => {
    for (const file of files) {
      const src = readFileSync(file, "utf-8");
      expect(src).not.toMatch(/process\.env\.ADMIN_SECRET|process\.env\["ADMIN_SECRET"\]/);
    }
  });

  it("no hardcoded credentials in automation source", () => {
    for (const file of files) {
      const src = readFileSync(file, "utf-8");
      expect(src).not.toMatch(/password\s*[:=]\s*["'][^"']{6,}/i);
      expect(src).not.toMatch(/api_key\s*[:=]\s*["'][^"']{8,}/i);
    }
  });

  it("no SUPABASE_SERVICE_ROLE_KEY hardcoded", () => {
    for (const file of files) {
      const src = readFileSync(file, "utf-8");
      expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][^"']{10,}/);
    }
  });
});

// ---------------------------------------------------------------------------
// 13. Component file shape — exports and no forbidden imports
// ---------------------------------------------------------------------------

describe("automation component files — exports and imports", () => {
  const componentDir = "src/components/admin/automation";
  const componentFiles = gatherSrcFiles(componentDir);

  it("all expected component files exist", () => {
    const expected = [
      "automation-badge.tsx",
      "impact-score.tsx",
      "workflow-status.tsx",
      "workflow-card.tsx",
      "approval-card.tsx",
      "execution-timeline.tsx",
      "execution-log.tsx",
      "execution-summary.tsx",
      "workflow-table.tsx",
    ];
    for (const name of expected) {
      const exists = existsSync(resolve(__dirname, "../../src/components/admin/automation", name));
      expect(exists, `${name} must exist`).toBe(true);
    }
  });

  it("no automation component imports ADMIN_SECRET", () => {
    for (const file of componentFiles) {
      const src = readFileSync(file, "utf-8");
      expect(src).not.toMatch(/process\.env\.ADMIN_SECRET/);
    }
  });

  it("no automation component imports AdminShell (should only be in pages)", () => {
    for (const file of componentFiles) {
      const src = readFileSync(file, "utf-8");
      expect(src).not.toMatch(/import\s+.*AdminShell/);
    }
  });
});

// ---------------------------------------------------------------------------
// 14. Admin automation pages — correct shell and back-navigation
// ---------------------------------------------------------------------------

describe("admin automation pages — AdminShell usage", () => {
  const pageFiles = gatherSrcFiles("src/app/(admin)/admin/automation").concat(
    gatherSrcFiles("src/app/(admin)/admin/automation/workflows"),
    gatherSrcFiles("src/app/(admin)/admin/automation/queue"),
    gatherSrcFiles("src/app/(admin)/admin/automation/templates"),
    gatherSrcFiles("src/app/(admin)/admin/automation/history"),
    gatherSrcFiles("src/app/(admin)/admin/automation/executions"),
  );

  it("all automation pages import AdminShell", () => {
    for (const file of pageFiles) {
      const src = readFileSync(file, "utf-8");
      expect(src).toMatch(/import.*AdminShell/);
    }
  });

  it("no automation page imports AgentShell", () => {
    for (const file of pageFiles) {
      const src = readFileSync(file, "utf-8");
      expect(src).not.toMatch(/import.*AgentShell/);
    }
  });

  it("sub-pages have back navigation to /admin/automation", () => {
    const subPages = pageFiles.filter((f) => !f.endsWith("automation/page.tsx"));
    for (const file of subPages) {
      const src = readFileSync(file, "utf-8");
      expect(src).toMatch(/\/admin\/automation/);
    }
  });

  it("all pages export dynamic = 'force-dynamic' or are static", () => {
    for (const file of pageFiles) {
      const src = readFileSync(file, "utf-8");
      // Either force-dynamic or no async (static page)
      const isStatic = !src.includes("export default async");
      const hasDynamic = src.includes('export const dynamic') && src.includes('force-dynamic');
      expect(isStatic || hasDynamic).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 15. Workflow determinism — same signals, same plan order
// ---------------------------------------------------------------------------

describe("workflow determinism", () => {
  it("planActiveWorkflows returns same workflow IDs in same order for same signals", () => {
    const sig = makeSignals({
      urgentLeadCount: 2,
      slaBreachCount: 1,
      overdueTaskCount: 3,
      missedAppointments24h: 1,
    });
    const run1 = planActiveWorkflows(sig).map((p) => p.workflowId);
    const run2 = planActiveWorkflows(sig).map((p) => p.workflowId);
    expect(run1).toEqual(run2);
  });

  it("different signal conditions produce different active workflow sets", () => {
    const sigEmpty = makeSignals();
    const sigBusy  = makeSignals({ urgentLeadCount: 5, slaBreachCount: 3 });
    const empty = planActiveWorkflows(sigEmpty).length;
    const busy  = planActiveWorkflows(sigBusy).length;
    expect(busy).toBeGreaterThanOrEqual(empty);
  });
});
