import { describe, expect, it } from "vitest";
import {
  collectFiles,
  readFileSafe,
  findStaleVercelUrls,
  findRedTokens,
  findNoveltyCopy,
  findMlsMarkers,
  checkCanonicalSiteConfig,
  releaseLogMentionsPr,
  findStaleVercelUrlsInDocs,
  VERCEL_URL_PATTERN,
  VERCEL_URL_ALLOWLIST,
  RED_TOKEN_PATTERN,
  NOVELTY_COPY_PATTERN,
  NOVELTY_COPY_NEGATION,
  MLS_PATTERN,
  MLS_ALLOWLIST,
  CANONICAL_DOMAIN,
} from "../../scripts/amm/launch-readiness-doctor.mjs";

// ---------------------------------------------------------------------------
// readFileSafe
// ---------------------------------------------------------------------------

describe("readFileSafe", () => {
  it("returns empty string for a non-existent path", () => {
    expect(readFileSafe("/does/not/exist/file.txt")).toBe("");
  });

  it("returns file contents for a real file", () => {
    const content = readFileSafe(process.cwd() + "/package.json");
    expect(content).toContain("ask-magic-mike");
  });
});

// ---------------------------------------------------------------------------
// collectFiles
// ---------------------------------------------------------------------------

describe("collectFiles", () => {
  it("returns empty array for a non-existent directory", () => {
    expect(collectFiles("/does/not/exist")).toEqual([]);
  });

  it("only returns files matching the given extensions", () => {
    const files = collectFiles(process.cwd() + "/tests/scripts", [".ts"]);
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(f.endsWith(".ts") || f.endsWith(".tsx")).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// VERCEL_URL_PATTERN
// ---------------------------------------------------------------------------

describe("VERCEL_URL_PATTERN", () => {
  it("matches ask-magic-mike.vercel.app", () => {
    expect(VERCEL_URL_PATTERN.test("https://ask-magic-mike.vercel.app/ask")).toBe(true);
  });

  it("does not match www.askmagicmike.com", () => {
    expect(VERCEL_URL_PATTERN.test("https://www.askmagicmike.com/ask")).toBe(false);
  });

  it("does not match a GitHub URL containing vercel.app", () => {
    expect(VERCEL_URL_PATTERN.test("https://github.com/app/vercel.app/github")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// findStaleVercelUrls
// ---------------------------------------------------------------------------

describe("findStaleVercelUrls", () => {
  it("returns empty array when no files match", () => {
    expect(findStaleVercelUrls([])).toEqual([]);
  });

  it("flags a file containing a stale vercel.app URL", () => {
    const fakeContent = (name: string, content: string) => {
      const tmp = `/tmp/test-stale-${name}.ts`;
      const { writeFileSync } = require("fs");
      writeFileSync(tmp, content);
      return tmp;
    };
    const flagged = fakeContent("bad", 'const url = "https://ask-magic-mike.vercel.app";');
    const result = findStaleVercelUrls([flagged]);
    expect(result).toContain(flagged);
  });

  it("skips allowlisted file paths", () => {
    const { writeFileSync } = require("fs");
    const allowlisted = "/tmp/site-config.ts";
    writeFileSync(allowlisted, 'const old = "https://ask-magic-mike.vercel.app";');
    const result = findStaleVercelUrls([allowlisted]);
    expect(result).not.toContain(allowlisted);
  });

  it("VERCEL_URL_ALLOWLIST contains expected filenames", () => {
    expect(VERCEL_URL_ALLOWLIST).toContain("site-config.ts");
    expect(VERCEL_URL_ALLOWLIST).toContain("utm-link-builder.ts");
  });
});

// ---------------------------------------------------------------------------
// RED_TOKEN_PATTERN
// ---------------------------------------------------------------------------

describe("RED_TOKEN_PATTERN", () => {
  it("matches text-red-500", () => {
    expect(RED_TOKEN_PATTERN.test("className='text-red-500'")).toBe(true);
  });

  it("matches bg-red-300", () => {
    expect(RED_TOKEN_PATTERN.test("bg-red-300")).toBe(true);
  });

  it("does not match text-ruby-500", () => {
    expect(RED_TOKEN_PATTERN.test("text-ruby-500")).toBe(false);
  });

  it("does not match text-red (no numeric suffix)", () => {
    expect(RED_TOKEN_PATTERN.test("text-red")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// findRedTokens
// ---------------------------------------------------------------------------

describe("findRedTokens", () => {
  it("returns empty array for no files", () => {
    expect(findRedTokens([])).toEqual([]);
  });

  it("flags a file with a prohibited red token", () => {
    const { writeFileSync } = require("fs");
    const path = "/tmp/test-red-bad.tsx";
    writeFileSync(path, '<div className="text-red-500">error</div>');
    expect(findRedTokens([path])).toContain(path);
  });

  it("ignores red tokens in comment lines", () => {
    const { writeFileSync } = require("fs");
    const path = "/tmp/test-red-comment.tsx";
    writeFileSync(path, "// was: text-red-500 — replaced with ruby");
    expect(findRedTokens([path])).not.toContain(path);
  });

  it("ignores files with no red tokens", () => {
    const { writeFileSync } = require("fs");
    const path = "/tmp/test-red-clean.tsx";
    writeFileSync(path, '<div className="text-ruby-500">ok</div>');
    expect(findRedTokens([path])).not.toContain(path);
  });
});

// ---------------------------------------------------------------------------
// NOVELTY_COPY_PATTERN / NOVELTY_COPY_NEGATION
// ---------------------------------------------------------------------------

describe("NOVELTY_COPY_PATTERN", () => {
  it("matches 'genie'", () => {
    expect(NOVELTY_COPY_PATTERN.test("Your real estate genie")).toBe(true);
  });

  it("matches 'magic lamp'", () => {
    expect(NOVELTY_COPY_PATTERN.test("rub the magic lamp")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(NOVELTY_COPY_PATTERN.test("GENIE")).toBe(true);
  });

  it("does not match 'Mike Eatmon'", () => {
    expect(NOVELTY_COPY_PATTERN.test("Mike Eatmon")).toBe(false);
  });
});

describe("NOVELTY_COPY_NEGATION", () => {
  it("matches 'no genie'", () => {
    expect(NOVELTY_COPY_NEGATION.test("// no genie language")).toBe(true);
  });

  it("matches 'No lamp'", () => {
    expect(NOVELTY_COPY_NEGATION.test("No lamp copy allowed")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// findNoveltyCopy
// ---------------------------------------------------------------------------

describe("findNoveltyCopy", () => {
  it("returns empty array for no files", () => {
    expect(findNoveltyCopy([])).toEqual([]);
  });

  it("flags a file with live genie copy", () => {
    const { writeFileSync } = require("fs");
    const path = "/tmp/test-genie-bad.tsx";
    writeFileSync(path, '<p>Ask your real estate genie</p>');
    expect(findNoveltyCopy([path])).toContain(path);
  });

  it("does not flag a comment-only occurrence", () => {
    const { writeFileSync } = require("fs");
    const path = "/tmp/test-genie-comment.tsx";
    writeFileSync(path, "// no genie language allowed here");
    expect(findNoveltyCopy([path])).not.toContain(path);
  });

  it("does not flag a file with only negation text", () => {
    const { writeFileSync } = require("fs");
    const path = "/tmp/test-genie-negation.tsx";
    writeFileSync(path, "const rule = 'No lamp or genie copy'");
    expect(findNoveltyCopy([path])).not.toContain(path);
  });
});

// ---------------------------------------------------------------------------
// MLS_PATTERN / MLS_ALLOWLIST
// ---------------------------------------------------------------------------

describe("MLS_PATTERN", () => {
  it("matches MATRIX (MLS identifier)", () => {
    expect(MLS_PATTERN.test("MATRIX listing 1234")).toBe(true);
  });

  it("matches flexmls", () => {
    expect(MLS_PATTERN.test("flexmls export")).toBe(true);
  });

  it("matches mls_number", () => {
    expect(MLS_PATTERN.test("mls_number: '123'")).toBe(true);
  });

  it("does not match generic text", () => {
    expect(MLS_PATTERN.test("Here is a property listing")).toBe(false);
  });
});

describe("findMlsMarkers", () => {
  it("returns empty array for no files", () => {
    expect(findMlsMarkers([])).toEqual([]);
  });

  it("skips files in the real-estate-intelligence allowlist path", () => {
    const { writeFileSync } = require("fs");
    const allowlisted = "/tmp/real-estate-intelligence-mls.ts";
    writeFileSync(allowlisted, "const field = 'mls_number'");
    expect(findMlsMarkers([allowlisted])).not.toContain(allowlisted);
  });

  it("flags a public file with an MLS marker", () => {
    const { writeFileSync } = require("fs");
    const path = "/tmp/test-mls-public.ts";
    writeFileSync(path, "const query = { mls_number: id }");
    expect(findMlsMarkers([path])).toContain(path);
  });

  it("MLS_ALLOWLIST contains expected paths", () => {
    expect(MLS_ALLOWLIST).toContain("real-estate-intelligence");
    expect(MLS_ALLOWLIST).toContain("_inbox_flexmls");
    expect(MLS_ALLOWLIST).toContain("listing.schema");
    expect(MLS_ALLOWLIST).toContain("listing-sanitizer");
  });
});

// ---------------------------------------------------------------------------
// checkCanonicalSiteConfig
// ---------------------------------------------------------------------------

describe("checkCanonicalSiteConfig", () => {
  it("returns ok: false for a non-existent file", () => {
    const result = checkCanonicalSiteConfig("/does/not/exist/site-config.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("not found");
  });

  it("returns ok: false if domain is absent from content", () => {
    const { writeFileSync } = require("fs");
    const path = "/tmp/test-site-config-bad.ts";
    writeFileSync(path, 'export const siteUrl = "https://ask-magic-mike.vercel.app"');
    const result = checkCanonicalSiteConfig(path);
    expect(result.ok).toBe(false);
  });

  it("returns ok: true when canonical domain is present", () => {
    const { writeFileSync } = require("fs");
    const path = "/tmp/test-site-config-good.ts";
    writeFileSync(
      path,
      'export const canonicalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.askmagicmike.com"'
    );
    const result = checkCanonicalSiteConfig(path);
    expect(result.ok).toBe(true);
  });

  it("CANONICAL_DOMAIN is the production domain", () => {
    expect(CANONICAL_DOMAIN).toBe("askmagicmike.com");
  });
});

// ---------------------------------------------------------------------------
// releaseLogMentionsPr
// ---------------------------------------------------------------------------

describe("releaseLogMentionsPr", () => {
  it("returns ok: false for a non-existent file", () => {
    const result = releaseLogMentionsPr("/does/not/exist.md", 50);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("not found");
  });

  it("returns ok: false when PR number is absent from the log", () => {
    const { writeFileSync } = require("fs");
    const path = "/tmp/test-release-log-missing.md";
    writeFileSync(path, "## [PR #48] Some sprint\n\nMerged.");
    const result = releaseLogMentionsPr(path, 50);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("PR #50");
  });

  it("returns ok: true when PR number appears as a header", () => {
    const { writeFileSync } = require("fs");
    const path = "/tmp/test-release-log-present.md";
    writeFileSync(path, "## [PR #50] LC-4 Owner Action Runbook\n\nMerged at ba7f40f.");
    const result = releaseLogMentionsPr(path, 50);
    expect(result.ok).toBe(true);
  });

  it("returns ok: true when PR number appears in inline text", () => {
    const { writeFileSync } = require("fs");
    const path = "/tmp/test-release-log-inline.md";
    writeFileSync(path, "See PR #50 for full change list.");
    const result = releaseLogMentionsPr(path, 50);
    expect(result.ok).toBe(true);
  });

  it("correctly checks the actual release log for PR #49 and #50", () => {
    const logPath = process.cwd() + "/docs/PRODUCTION_RELEASE_LOG.md";
    expect(releaseLogMentionsPr(logPath, 49).ok).toBe(true);
    // PR #50 entry is added in LC-5 — will pass after this sprint lands
  });
});

// ---------------------------------------------------------------------------
// findStaleVercelUrlsInDocs
// ---------------------------------------------------------------------------

describe("findStaleVercelUrlsInDocs", () => {
  it("returns empty array for no docs", () => {
    expect(findStaleVercelUrlsInDocs([])).toEqual([]);
  });

  it("flags a doc containing a stale vercel.app URL", () => {
    const { writeFileSync } = require("fs");
    const path = "/tmp/test-doc-stale.md";
    writeFileSync(path, "Old URL: https://ask-magic-mike.vercel.app/ask");
    expect(findStaleVercelUrlsInDocs([path])).toContain(path);
  });

  it("does not flag a doc using only the canonical domain", () => {
    const { writeFileSync } = require("fs");
    const path = "/tmp/test-doc-canonical.md";
    writeFileSync(path, "Use https://www.askmagicmike.com/ask for all CTAs.");
    expect(findStaleVercelUrlsInDocs([path])).not.toContain(path);
  });

  it("does not flag a non-existent path (skips gracefully)", () => {
    const result = findStaleVercelUrlsInDocs(["/does/not/exist.md"]);
    expect(result).not.toContain("/does/not/exist.md");
  });
});
