import { describe, expect, it } from "vitest";

// Static guard tests for Phase 4 Motion System
// Verifies token export shapes, class string invariants, and component exports.

// ---------------------------------------------------------------------------
// visual-system.ts — motion export
// ---------------------------------------------------------------------------

describe("visual-system motion export", () => {
  it("exports motion with all required groups", async () => {
    const mod = await import("@/lib/brand/visual-system");
    expect(mod.motion).toBeDefined();
    expect(mod.motion.reveal).toBeDefined();
    expect(mod.motion.hover).toBeDefined();
    expect(mod.motion.press).toBeDefined();
    expect(mod.motion.transition).toBeDefined();
  });

  it("reveal map covers all 7 variants", async () => {
    const { motion } = await import("@/lib/brand/visual-system");
    const variants = [
      "fade-up", "fade-down", "fade-in",
      "scale-in", "slide-left", "slide-right", "blur-in",
    ] as const;
    for (const v of variants) {
      expect(motion.reveal[v]).toMatch(/^animate-/);
    }
  });

  it("hover tokens use motion-safe-compatible class names (no hardcoded hex)", async () => {
    const { motion } = await import("@/lib/brand/visual-system");
    for (const cls of Object.values(motion.hover)) {
      expect(cls).not.toMatch(/text-\[#/);
      expect(cls).not.toMatch(/bg-\[#/);
    }
  });

  it("press tokens include motion-reduce override", async () => {
    const { motion } = await import("@/lib/brand/visual-system");
    expect(motion.press.sm).toContain("motion-reduce:active:scale-100");
    expect(motion.press.md).toContain("motion-reduce:active:scale-100");
  });

  it("transition tokens use named durations (not arbitrary ms)", async () => {
    const { motion } = await import("@/lib/brand/visual-system");
    for (const cls of Object.values(motion.transition)) {
      expect(cls).not.toMatch(/duration-\[\d/);
    }
  });
});

// ---------------------------------------------------------------------------
// useReveal hook
// ---------------------------------------------------------------------------

describe("useReveal hook", () => {
  it("exports useReveal and staggerDelay", async () => {
    const mod = await import("@/hooks/use-reveal");
    expect(typeof mod.useReveal).toBe("function");
    expect(typeof mod.staggerDelay).toBe("function");
  });

  it("staggerDelay computes correct offset", async () => {
    const { staggerDelay } = await import("@/hooks/use-reveal");
    expect(staggerDelay(0, 0, 80)).toBe(0);
    expect(staggerDelay(1, 0, 80)).toBe(80);
    expect(staggerDelay(3, 100, 60)).toBe(280);
  });
});

// ---------------------------------------------------------------------------
// Reveal / Stagger components
// ---------------------------------------------------------------------------

describe("Reveal and Stagger components", () => {
  it("exports Reveal and Stagger from ui/reveal", async () => {
    const mod = await import("@/components/ui/reveal");
    expect(mod.Reveal).toBeDefined();
    expect(mod.Stagger).toBeDefined();
  });

  it("re-exports Reveal and Stagger from ui/index barrel", async () => {
    const mod = await import("@/components/ui/index");
    expect(mod.Reveal).toBeDefined();
    expect(mod.Stagger).toBeDefined();
  });
});
