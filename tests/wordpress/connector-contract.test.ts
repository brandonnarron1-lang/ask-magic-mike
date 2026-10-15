import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(process.cwd(), "wordpress/ask-magic-mike-connector");
const candidate = readFileSync(resolve(ROOT, "ask-magic-mike-connector.php"), "utf8");
const baseline = readFileSync(
  resolve(ROOT, "baselines/ask-magic-mike-connector-1.0.0.source.txt"),
  "utf8",
);
const css = readFileSync(resolve(ROOT, "assets/ask-magic-mike.css"));
const javascript = readFileSync(resolve(ROOT, "assets/ask-magic-mike.js"));
const releaseWorkflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/release-gate.yml"),
  "utf8",
);
const contracts = JSON.parse(
  readFileSync(resolve(ROOT, "placement-contracts.json"), "utf8"),
) as {
  required_plugin_version: string;
  canonical_base_url: string;
  baseline: Record<string, string>;
  candidate: {
    version: string;
    source_sha256: string;
  };
  packages: {
    install: { file: string; sha256: string };
    rollback: { file: string; sha256: string };
  };
  placements: Array<{
    placement_key: string;
    shortcode: string;
    expected_href: string;
  }>;
  blocked_placements: Array<{ placement_key: string }>;
};

const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

describe("Ask Magic Mike Connector candidate", () => {
  it("retains an exact, non-executable copy of the observed live 1.0.0 source", () => {
    expect(sha256(baseline)).toBe(
      "2938f47cca5e667a5b65b39fecfd32bb492f7b8f579179ac2ad3105957095a8f",
    );
    expect(baseline).toContain("* Version: 1.0.0");
    expect(baseline).toContain("define( 'AMM_CONNECTOR_VERSION', '1.0.0' )");
  });

  it("preserves the observed live assets byte-for-byte", () => {
    expect(sha256(css)).toBe(contracts.baseline.css_sha256);
    expect(sha256(javascript)).toBe(contracts.baseline.javascript_sha256);
  });

  it("upgrades only the existing connector contract and keeps legacy shortcodes", () => {
    expect(candidate).toContain(`* Version: ${contracts.candidate.version}`);
    expect(candidate).toContain(`define( 'AMM_CONNECTOR_VERSION', '${contracts.candidate.version}' )`);
    expect(candidate).toContain("add_shortcode( 'ask_magic_mike_cta'");
    expect(candidate).toContain("add_shortcode( 'ask_magic_mike_embed'");
    expect(candidate).toMatch(/'source'\s*=>\s*'cta'/);
    expect(candidate).toMatch(/'content'\s*=>\s*''/);
    expect(candidate).not.toContain("wp_mail(");
    expect(candidate).not.toContain("/api/leads");
    expect(sha256(candidate)).toBe(contracts.candidate.source_sha256);
    expect(contracts.candidate.version).toBe("1.2.0");
  });

  it("supports bounded per-instance attribution with legacy fallbacks", () => {
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
      expect(candidate).toContain(`'${key}'`);
      expect(candidate).toContain(`$atts['${key}']`);
    }
    expect(candidate).toContain("amm_connector_sanitize_utm_value");
    expect(candidate).toContain("return substr( $value, 0, 120 )");
    expect(candidate).toContain("$options['utm_source']");
    expect(candidate).toContain("$options['utm_campaign']");
  });

  it("restricts destinations and emits a public candidate-version marker", () => {
    expect(candidate).toContain("'https://www.askmagicmike.com'");
    expect(candidate).toContain("'askmagicmike.com'");
    expect(candidate).toContain("'www.askmagicmike.com'");
    expect(candidate).toContain("'ask-magic-mike.vercel.app'");
    expect(candidate).toContain("'https' !== strtolower");
    expect(candidate).toContain("data-amm-connector-version");
    expect(candidate).not.toContain("eval(");
  });

  it("pins the reviewed page-specific shortcodes and expected destinations", () => {
    expect(contracts.required_plugin_version).toBe("1.1.0");
    expect(contracts.canonical_base_url).toBe("https://www.askmagicmike.com");
    expect(contracts.placements.map((row) => row.placement_key)).toEqual([
      "wordpress_home_value",
      "wordpress_we_buy_homes",
    ]);
    for (const placement of contracts.placements) {
      expect(candidate).toContain("utm_source");
      expect(placement.shortcode).toContain('utm_source="ourtownproperties"');
      expect(placement.shortcode).toContain('utm_medium="owned_media"');
      expect(placement.shortcode).toContain('utm_campaign="amm_owned_demand_2026"');
      const url = new URL(placement.expected_href);
      expect(url.origin).toBe("https://www.askmagicmike.com");
      expect(url.searchParams.get("utm_source")).toBe("ourtownproperties");
      expect(url.searchParams.get("utm_medium")).toBe("owned_media");
      expect(url.searchParams.get("utm_campaign")).toBe("amm_owned_demand_2026");
      expect(url.searchParams.get("utm_content")).toMatch(/^wordpress_/);
    }
    expect(contracts.blocked_placements).toEqual([
      { placement_key: "wordpress_homepage_ask_mike", page_id: 149, reason: expect.any(String) },
    ]);
  });

  it("pins deterministic install/rollback packages and requires hosted native PHP lint", () => {
    for (const artifact of Object.values(contracts.packages)) {
      expect(sha256(readFileSync(resolve(process.cwd(), artifact.file)))).toBe(
        artifact.sha256,
      );
    }
    expect(releaseWorkflow).toContain(
      "php -l wordpress/ask-magic-mike-connector/ask-magic-mike-connector.php",
    );
    expect(releaseWorkflow).toContain("php tests/wordpress/connector-url-runtime.php");
  });
  it("keeps the seller option explicit and allowlisted without extending other forms", () => {
    expect(candidate).toContain("$seller_option = ''");
    expect(candidate).toContain("array( '/sell', '/we-buy-houses' )");
    expect(candidate).toContain("array( 'as-is', 'compare', 'guidance' )");
    expect(candidate).toContain("$atts['seller_option']");
    expect(candidate).not.toContain("$_GET");
    expect(candidate).not.toContain("$_POST");
    expect(sha256(readFileSync(resolve(process.cwd(), "output/release/ask-magic-mike-connector-1.1.0.zip"))))
      .toBe("56934bdcc9a8685493609ffbe76938f7889ef24a01e69d5f73bd1720eed7d4fa");
  });
});
