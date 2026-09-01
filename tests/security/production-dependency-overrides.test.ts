import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("production dependency security overrides", () => {
  it("keeps the vulnerable Browserslist range on the patched 4.28.8 release", () => {
    const root = process.cwd();
    const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    const lockfile = readFileSync(resolve(root, "pnpm-lock.yaml"), "utf8");

    expect(packageJson.pnpm?.overrides?.["browserslist@<=4.28.6"]).toBe("4.28.8");
    expect(lockfile).toContain("browserslist@4.28.8:");
    expect(lockfile).not.toMatch(/^ {2}browserslist@4\.28\.[0-6]:/m);
  });
});
