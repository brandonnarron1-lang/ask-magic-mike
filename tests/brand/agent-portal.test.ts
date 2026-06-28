/**
 * Agent Portal — Brand & Security Tests
 *
 * Covers:
 *  1. Role guard tests — agent pages never import admin-only controls
 *  2. Permission tests — agent auth completely separate from ADMIN_SECRET
 *  3. Assignment filter tests — agent data filtered by assigned_agent_id
 *  4. Component token guards — no red-* tokens, no hardcoded hex
 *  5. Forbidden copy guards — no genie/lamp copy
 *  6. No secret guards — no credential exposure
 *  7. No outbound messaging — no email/SMS send calls
 *  8. Admin regression guards — admin pages not weakened
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { resolveAgentAccess, agentOwnsLead, AGENT_DENIAL_MESSAGES } from "@/lib/agent/agent-auth";
import {
  calculateConversion,
  calculateHealthScore,
} from "@/lib/admin/intelligence-engine";

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

const ROOT = process.cwd();

function readSrc(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf-8");
}

function globSrc(dir: string, exts = [".ts", ".tsx"]): string[] {
  const results: string[] = [];
  function walk(d: string) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (exts.includes(extname(full))) {
        results.push(full);
      }
    }
  }
  walk(join(ROOT, dir));
  return results;
}

const AGENT_COMPONENT_FILES  = globSrc("src/components/agent");
const AGENT_PAGE_FILES        = globSrc("src/app/(agent)");
const AGENT_API_FILES         = globSrc("src/app/api/agent");
const AGENT_LIB_FILES         = globSrc("src/lib/agent");
const ROUTING_PAGE            = readSrc("src/app/(admin)/admin/routing/page.tsx");

// ---------------------------------------------------------------------------
// 1. Role guard tests
// ---------------------------------------------------------------------------

describe("Role guard — agent pages never import admin controls", () => {
  const agentFiles = [
    ...AGENT_COMPONENT_FILES,
    ...AGENT_PAGE_FILES,
    ...AGENT_LIB_FILES,
  ];

  it("no agent file imports ADMIN_SECRET via process.env access", () => {
    // Allow mentions in comments that explain separation; forbid actual env reads
    const ADMIN_SECRET_ACCESS = /process\.env\.ADMIN_SECRET|process\.env\["ADMIN_SECRET"\]/;
    for (const file of agentFiles) {
      const src = readFileSync(file, "utf-8");
      expect(ADMIN_SECRET_ACCESS.test(src), `${file} must not access process.env.ADMIN_SECRET`)
        .toBe(false);
    }
  });

  it("no agent file imports AdminShell", () => {
    // Check for actual import statements (not comments)
    const IMPORT_ADMIN_SHELL = /import\s+.*AdminShell/;
    for (const file of agentFiles) {
      const src = readFileSync(file, "utf-8");
      expect(IMPORT_ADMIN_SHELL.test(src), `${file} must not import AdminShell`)
        .toBe(false);
    }
  });

  it("no agent file imports admin-only hooks (useAdmin, loadDashboardMetrics, etc.)", () => {
    // Match actual import statements, not comments mentioning the pattern
    const adminOnlyImportPatterns = [
      /import\s+.*useAdmin/,
      /import\s+.*loadDashboardMetrics/,
      /from\s+["'].*routing-command["']/,
      /from\s+["'].*admin-analytics["']/,
    ];
    for (const file of agentFiles) {
      const src = readFileSync(file, "utf-8");
      for (const pattern of adminOnlyImportPatterns) {
        expect(pattern.test(src), `${file} must not import from ${pattern}`)
          .toBe(false);
      }
    }
  });

  it("agent-shell does not reference admin gold accent (uses cyan)", () => {
    const src = readSrc("src/components/agent/agent-shell.tsx");
    expect(src).toContain("cyan");
    // Must not use gold as the top accent (gold is admin-only)
    expect(src).not.toContain("via-gold");
  });

  it("RoleGate does not import admin auth utilities", () => {
    const src = readSrc("src/components/agent/role-gate.tsx");
    expect(src).not.toContain("ADMIN_SECRET");
    expect(src).not.toContain("loadAdmin");
    expect(src).not.toContain("admin-auth");
  });
});

// ---------------------------------------------------------------------------
// 2. Agent auth unit tests
// ---------------------------------------------------------------------------

describe("Agent auth — resolveAgentAccess", () => {
  it("returns no_agent_id when param missing", async () => {
    const result = await resolveAgentAccess({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("no_agent_id");
    }
  });

  it("returns no_agent_id when param empty string", async () => {
    const result = await resolveAgentAccess({ agent_id: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("no_agent_id");
    }
  });

  it("returns invalid_agent_id for non-UUID strings", async () => {
    const bad = ["admin", "123", "'; DROP TABLE leads; --", "<script>"];
    for (const id of bad) {
      const result = await resolveAgentAccess({ agent_id: id });
      expect(result.ok, `Expected invalid for: ${id}`).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("invalid_agent_id");
      }
    }
  });

  it("accepts valid UUID-shaped agent_id when DB not configured (dev mode)", async () => {
    // Without Supabase env vars, falls through to dev mode
    const result = await resolveAgentAccess({
      agent_id: "12345678-1234-1234-1234-123456789abc",
    });
    // Either ok (dev mode) or db_not_configured — never invalid_agent_id
    if (!result.ok) {
      expect(result.reason).not.toBe("invalid_agent_id");
    }
  });

  it("accepts array agent_id (Next.js multi-value params) — uses first value", async () => {
    const result = await resolveAgentAccess({
      agent_id: ["12345678-1234-1234-1234-123456789abc", "other"],
    });
    if (!result.ok) {
      expect(result.reason).not.toBe("invalid_agent_id");
    }
  });

  it("DENIAL_MESSAGES covers all denial reasons", () => {
    const reasons: Array<import("@/lib/agent/agent-auth").AgentAccessDenied["reason"]> = [
      "no_agent_id",
      "invalid_agent_id",
      "db_not_configured",
      "agent_not_found",
      "agent_inactive",
    ];
    for (const r of reasons) {
      expect(AGENT_DENIAL_MESSAGES[r], `Missing message for: ${r}`)
        .toBeTruthy();
    }
  });
});

describe("Agent auth — agentOwnsLead", () => {
  it("returns false when DB not configured (fail-closed)", async () => {
    const result = await agentOwnsLead("any-agent", "any-lead");
    expect(result).toBe(false);
  });

  it("returns false for empty string IDs", async () => {
    const result = await agentOwnsLead("", "");
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Assignment filter tests — code-level assertion
// ---------------------------------------------------------------------------

describe("Assignment filter — agent data is scoped by assigned_agent_id", () => {
  it("loadAgentPortalMetrics queries leads with eq('assigned_agent_id', agentId)", () => {
    const src = readSrc("src/lib/agent/agent-portal-metrics.ts");
    expect(src).toContain("assigned_agent_id");
    expect(src).toContain("eq(\"assigned_agent_id\", agentId)");
  });

  it("agentOwnsLead verifies lead.assigned_agent_id === agentId", () => {
    const src = readSrc("src/lib/agent/agent-auth.ts");
    expect(src).toContain("eq(\"assigned_agent_id\", agentId)");
  });

  it("agent leads page loader scopes by assigned_agent_id", () => {
    const src = readSrc("src/app/(agent)/agent/leads/page.tsx");
    expect(src).toContain("assigned_agent_id");
  });

  it("lead detail loader uses agentOwnsLead before loading data", () => {
    const src = readSrc("src/app/(agent)/agent/leads/[id]/page.tsx");
    expect(src).toContain("agentOwnsLead");
    // Guard is expressed as either `if (!owns)` or ternary `owns ? ... : null`
    const hasOwnershipGuard = src.includes("if (!owns)") || src.includes("owns ?") || src.includes("!owns");
    expect(hasOwnershipGuard, "Lead detail page must guard data load on agentOwnsLead result").toBe(true);
  });

  it("API mutation routes verify ownership before write", () => {
    for (const file of AGENT_API_FILES) {
      const src = readFileSync(file, "utf-8");
      expect(src, `${file} must call agentOwnsLead`).toContain("agentOwnsLead");
      expect(src, `${file} must check owns before write`).toContain("if (!owns)");
    }
  });

  it("status route uses a strict allowlist", () => {
    const src = readSrc("src/app/api/agent/[agentId]/leads/[leadId]/status/route.ts");
    expect(src).toContain("AGENT_PERMITTED_STATUSES");
    // Agents must not be able to mark converted (broker-only)
    expect(src).not.toContain('"converted"');
    // Agents must not delete
    expect(src).not.toContain("delete");
    expect(src).not.toContain(".delete(");
  });
});

// ---------------------------------------------------------------------------
// 4. Component token guards — no red-*, no hardcoded hex
// ---------------------------------------------------------------------------

describe("Token guards — agent components", () => {
  const RED_RE   = /\bred-\d+\b/;
  const HEX_RE   = /#[0-9A-Fa-f]{3,8}\b/;
  const HEX_SAFE = new Set([
    "#0A0906",   // near-black bg used in metric cells
    "#080806",   // base dark bg (also in admin)
    "#0D0B07",   // admin header bg (routing page)
  ]);

  it("no component uses banned red-* tokens", () => {
    for (const file of AGENT_COMPONENT_FILES) {
      const src = readFileSync(file, "utf-8");
      expect(RED_RE.test(src), `${file} contains red-* token`).toBe(false);
    }
  });

  it("no page uses banned red-* tokens", () => {
    for (const file of AGENT_PAGE_FILES) {
      const src = readFileSync(file, "utf-8");
      expect(RED_RE.test(src), `${file} contains red-* token`).toBe(false);
    }
  });

  it("no component uses unapproved hardcoded hex", () => {
    for (const file of AGENT_COMPONENT_FILES) {
      const src = readFileSync(file, "utf-8");
      const matches = src.match(HEX_RE) ?? [];
      for (const hex of matches) {
        const normalised = hex.toUpperCase();
        expect(
          HEX_SAFE.has(normalised) || HEX_SAFE.has(hex),
          `${file}: unapproved hex ${hex}`
        ).toBe(true);
      }
    }
  });

  it("all motion animations use motion-safe: prefix", () => {
    const BARE_ANIMATE = /(?<!motion-safe:)animate-(?!none)/;
    for (const file of [...AGENT_COMPONENT_FILES, ...AGENT_PAGE_FILES]) {
      const src = readFileSync(file, "utf-8");
      const lines = src.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (BARE_ANIMATE.test(line) && !line.includes("motion-safe:")) {
          throw new Error(
            `Bare animate-* without motion-safe: prefix at ${file}:${i + 1}\n  ${line.trim()}`
          );
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Forbidden copy guards
// ---------------------------------------------------------------------------

describe("Forbidden copy — agent files", () => {
  const allAgentFiles = [
    ...AGENT_COMPONENT_FILES,
    ...AGENT_PAGE_FILES,
    ...AGENT_LIB_FILES,
    ...AGENT_API_FILES,
  ];

  it("no agent file contains 'genie' copy", () => {
    for (const file of allAgentFiles) {
      const src = readFileSync(file, "utf-8").toLowerCase();
      expect(src, `${file} contains forbidden 'genie' copy`).not.toContain("genie");
    }
  });

  it("no agent file contains 'magic lamp' copy", () => {
    for (const file of allAgentFiles) {
      const src = readFileSync(file, "utf-8").toLowerCase();
      expect(src, `${file} contains 'magic lamp'`).not.toContain("magic lamp");
    }
  });

  it("no agent file describes Mike as mascot/chatbot", () => {
    const forbidden = ["mascot", "chatbot", "cartoon"];
    for (const file of allAgentFiles) {
      const src = readFileSync(file, "utf-8").toLowerCase();
      for (const word of forbidden) {
        expect(src, `${file} contains '${word}'`).not.toContain(word);
      }
    }
  });

  it("no agent file contains MLS marker strings", () => {
    const mlsMarkers = ["flexmls", "mls_id", "listing_id", "MLS#"];
    for (const file of allAgentFiles) {
      const src = readFileSync(file, "utf-8");
      for (const marker of mlsMarkers) {
        expect(src, `${file} contains MLS marker: ${marker}`)
          .not.toContain(marker);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 6. No secret guards
// ---------------------------------------------------------------------------

describe("No secrets in agent files", () => {
  const allAgentFiles = [
    ...AGENT_COMPONENT_FILES,
    ...AGENT_PAGE_FILES,
    ...AGENT_LIB_FILES,
    ...AGENT_API_FILES,
  ];

  it("no agent file hardcodes an API key or secret value", () => {
    const SECRET_RE = /sk-[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9+/=]{20,}/;
    for (const file of allAgentFiles) {
      const src = readFileSync(file, "utf-8");
      expect(SECRET_RE.test(src), `${file} appears to contain a hardcoded secret`)
        .toBe(false);
    }
  });

  it("API routes access secrets via process.env, not hardcoded", () => {
    for (const file of AGENT_API_FILES) {
      const src = readFileSync(file, "utf-8");
      if (src.includes("SUPABASE")) {
        expect(src).toContain("process.env.");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 7. No outbound messaging
// ---------------------------------------------------------------------------

describe("No outbound messaging in agent portal", () => {
  const OUTBOUND_PATTERNS = [
    "sendEmail",
    "sendSms",
    "sendNotification",
    "sendgrid",
    "twilio",
    "postmark",
    "nodemailer",
    "fetch(\"https://",
    'fetch("https://',
    "axios.post",
    "resend",
  ];

  const allAgentFiles = [
    ...AGENT_COMPONENT_FILES,
    ...AGENT_PAGE_FILES,
    ...AGENT_LIB_FILES,
    ...AGENT_API_FILES,
  ];

  for (const pattern of OUTBOUND_PATTERNS) {
    it(`no agent file calls '${pattern}'`, () => {
      for (const file of allAgentFiles) {
        const src = readFileSync(file, "utf-8");
        expect(src, `${file} contains forbidden outbound call: ${pattern}`)
          .not.toContain(pattern);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 8. Admin regression guards
// ---------------------------------------------------------------------------

describe("Admin regression — routing page is not weakened", () => {
  it("routing page still has SLA breach alerting", () => {
    expect(ROUTING_PAGE).toContain("slaBreachCount");
    expect(ROUTING_PAGE).toContain("SLA Breach");
  });

  it("routing page still shows agent roster section", () => {
    expect(ROUTING_PAGE).toContain("agent-roster-heading");
    expect(ROUTING_PAGE).toContain("Agent Roster");
  });

  it("routing page does not remove the routing history table", () => {
    expect(ROUTING_PAGE).toContain("routing-history-heading");
    expect(ROUTING_PAGE).toContain("Recent Routing Decisions");
  });

  it("routing page agent portal links use agent_id param (not ADMIN_SECRET)", () => {
    expect(ROUTING_PAGE).toContain("agent_id=");
    expect(ROUTING_PAGE).not.toContain("ADMIN_SECRET");
  });

  it("routing page does not import AgentShell (admin page stays on admin chrome)", () => {
    expect(ROUTING_PAGE).not.toContain("AgentShell");
  });

  it("assignment control center section is present", () => {
    expect(ROUTING_PAGE).toContain("Assignment Control Center");
    expect(ROUTING_PAGE).toContain("assignment-control-heading");
  });
});

// ---------------------------------------------------------------------------
// 9. Agent portal metrics correctness
// ---------------------------------------------------------------------------

describe("Agent portal metrics — derived from intelligence engine", () => {
  it("conversionRate = 0 when no leads", () => {
    const result = calculateConversion(0, 0);
    expect(result.rate).toBe(0);
  });

  it("conversionRate = 100 when all leads are hot", () => {
    const result = calculateConversion(10, 10);
    expect(result.rate).toBe(100);
  });

  it("healthScore is A for top performance", () => {
    const result = calculateHealthScore({
      conversionRate: 90,
      responseRate: 95,
      slaCompliance: 98,
      pipelineActivity: 80,
      dataQuality: 90,
    });
    expect(result.grade).toBe("A");
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("healthScore is F for zero performance", () => {
    const result = calculateHealthScore({
      conversionRate: 0,
      responseRate: 0,
      slaCompliance: 0,
      pipelineActivity: 0,
      dataQuality: 0,
    });
    expect(result.grade).toBe("F");
    expect(result.score).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 10. API route shape guards
// ---------------------------------------------------------------------------

describe("API route shape — agent mutation routes", () => {
  it("contact route validates UUIDs before ownership check", () => {
    const src = readSrc("src/app/api/agent/[agentId]/leads/[leadId]/contact/route.ts");
    expect(src).toContain("uuidRe.test(agentId)");
    expect(src).toContain("uuidRe.test(leadId)");
    expect(src).toContain("status: 400");
  });

  it("follow-up route validates dueAt before write", () => {
    const src = readSrc("src/app/api/agent/[agentId]/leads/[leadId]/follow-up/route.ts");
    expect(src).toContain("dueAt_required");
    expect(src).toContain("isNaN");
  });

  it("status route rejects broker-only statuses", () => {
    const src = readSrc("src/app/api/agent/[agentId]/leads/[leadId]/status/route.ts");
    expect(src).toContain("AGENT_PERMITTED_STATUSES");
    expect(src).toContain("status_not_permitted");
    // "converted" and "dead" are broker-only — must not be in permitted set
    expect(src).not.toContain('"converted"');
    expect(src).not.toContain('"dead"');
  });

  it("all API routes return 403 when ownership fails", () => {
    for (const file of AGENT_API_FILES) {
      const src = readFileSync(file, "utf-8");
      if (src.includes("agentOwnsLead")) {
        expect(src, `${file} must return 403 on ownership failure`).toContain("status: 403");
      }
    }
  });
});
