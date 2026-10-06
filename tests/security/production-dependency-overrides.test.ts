import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("production dependency security overrides", () => {
  it("keeps audited runtime dependencies on patched release floors", () => {
    const root = process.cwd();
    const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    const lockfile = readFileSync(resolve(root, "pnpm-lock.yaml"), "utf8");

    expect(packageJson.pnpm?.overrides?.["browserslist@<=4.28.6"]).toBe("4.28.8");
    expect(packageJson.pnpm?.overrides?.["js-yaml"]).toBe("4.3.2");
    expect(packageJson.pnpm?.overrides?.["sharp@<0.35.5"]).toBe("0.35.5");
    expect(packageJson.pnpm?.overrides?.["source-map-js@<1.2.2"]).toBe("1.2.2");
    expect(packageJson.dependencies?.next).toBe("^15.5.24");
    expect(packageJson.dependencies?.nodemailer).toBe("10.0.12");
    expect(packageJson.devDependencies?.vitest).toBe("4.1.11");
    expect(lockfile).toContain("browserslist@4.28.8:");
    expect(lockfile).toContain("js-yaml@4.3.2:");
    expect(lockfile).toContain("next@15.5.26");
    expect(lockfile).toContain("nodemailer@10.0.12:");
    expect(lockfile.includes("sharp@0.35.5:")).toBe(true);
    expect(lockfile.includes("source-map-js@1.2.2:")).toBe(true);
    expect(lockfile).not.toMatch(/^ {2}sharp@0\.35\.[0-4]:/m);
    expect(lockfile).not.toMatch(/^ {2}source-map-js@1\.2\.[01]:/m);
    expect(lockfile).toContain("vitest@4.1.11:");
    expect(lockfile).not.toMatch(/^ {2}browserslist@4\.28\.[0-6]:/m);
    expect(lockfile).not.toMatch(/^ {2}js-yaml@4\.3\.[01]:/m);
    expect(lockfile).not.toMatch(/^ {2}next@15\.5\.2[0-3][(:]/m);
    expect(lockfile).not.toMatch(/^ {2}nodemailer@(?:[0-9]\.|10\.0\.[01]:)/m);
    expect(lockfile).not.toMatch(/^ {2}sharp@0\.35\.[0-3]:/m);
  });
});
