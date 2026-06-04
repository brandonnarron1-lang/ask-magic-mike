/**
 * MarketingAssetEngine
 *
 * Deterministic template renderer. Accepts ONLY a sanitized public
 * listing object (per `sanitizeForMarketing`) and produces channel-specific
 * copy. The fair-housing guardrail vets every output; anything that fails
 * is rejected so a human can rewrite.
 *
 * If `OPENAI_API_KEY` is set and `ENABLE_AI_GENERATION=true`, callers can
 * swap to the LLM path by overriding `generate` — the sanitizer is still
 * called upstream so private fields cannot enter the prompt.
 */
import type { PublicListing } from "@/schemas/listing.schema";
import {
  sanitizeForMarketing,
  PRIVATE_FIELD_NAMES,
} from "@/lib/compliance/listing-sanitizer";
import { scanForFairHousingIssues } from "@/lib/compliance/fair-housing";

export type MarketingChannel =
  | "sms"
  | "email"
  | "social_post"
  | "reel_script"
  | "caption"
  | "flyer"
  | "landing_copy"
  | "ad_copy"
  | "call_script";

export interface GenerateMarketingArgs {
  listing: PublicListing | Record<string, unknown>;
  channel: MarketingChannel;
  audience?: "buyer" | "seller" | "investor" | "general";
  cta?: string;
  tone?: "warm" | "professional" | "premium";
}

export interface MarketingAsset {
  channel: MarketingChannel;
  body: string;
  cta: string;
  sourceFields: string[];
  fairHousingPassed: boolean;
  fairHousingFindings: ReturnType<
    typeof scanForFairHousingIssues
  >["findings"];
  provider: "deterministic_template";
}

const DEFAULT_CTAS: Record<MarketingChannel, string> = {
  sms: "Reply YES to learn more.",
  email: "Schedule a quick call",
  social_post: "Ask Mike",
  reel_script: "Ask Magic Mike",
  caption: "Ask Mike",
  flyer: "Ask Mike",
  landing_copy: "Start With Your Address",
  ad_copy: "Ask Mike",
  call_script: "Schedule a Quick Call",
};

function fmtPrice(n: number | null): string {
  if (n === null) return "";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export class MarketingAssetEngine {
  generate(args: GenerateMarketingArgs): MarketingAsset {
    const safe = sanitizeForMarketing(args.listing as Record<string, unknown>);
    const cta = args.cta ?? DEFAULT_CTAS[args.channel];

    const usedFields: string[] = [];
    function uses<K extends keyof PublicListing>(k: K): PublicListing[K] {
      usedFields.push(k as string);
      return safe[k];
    }

    let body: string;
    switch (args.channel) {
      case "sms":
        body = renderSms(uses, cta);
        break;
      case "email":
        body = renderEmail(uses, cta);
        break;
      case "social_post":
      case "caption":
      case "ad_copy":
        body = renderSocial(uses, cta);
        break;
      case "reel_script":
        body = renderReel(uses, cta);
        break;
      case "flyer":
        body = renderFlyer(uses, cta);
        break;
      case "landing_copy":
        body = renderLanding(uses, cta);
        break;
      case "call_script":
        body = renderCallScript(uses, cta);
        break;
    }

    // Defensive: assert no private field name leaked into the rendered body.
    for (const priv of PRIVATE_FIELD_NAMES) {
      if (body.toLowerCase().includes(priv)) {
        throw new Error(
          `[marketing-assets] generated body mentions private field "${priv}"`
        );
      }
    }

    const fh = scanForFairHousingIssues(body);

    return {
      channel: args.channel,
      body,
      cta,
      sourceFields: [...new Set(usedFields)],
      fairHousingPassed: fh.passes,
      fairHousingFindings: fh.findings,
      provider: "deterministic_template",
    };
  }
}

// ─── Renderers ──────────────────────────────────────────────────────────────

type Uses = <K extends keyof PublicListing>(k: K) => PublicListing[K];

function renderSms(uses: Uses, cta: string): string {
  const address = uses("address_line1");
  const city = uses("city");
  const price = fmtPrice(uses("list_price"));
  return [
    `Ask Magic Mike: ${address ?? "A local home"}${city ? ` in ${city}` : ""}${
      price ? ` — listed at ${price}` : ""
    }. ${cta}`,
    "Reply STOP to opt out.",
  ].join(" ");
}

function renderEmail(uses: Uses, cta: string): string {
  const address = uses("address_line1");
  const city = uses("city");
  const beds = uses("beds");
  const baths = uses("baths_full");
  const sqft = uses("sqft");
  const price = fmtPrice(uses("list_price"));
  const remarks = uses("public_remarks");
  return [
    `Subject: New from Our Town Properties — ${address ?? "a Wilson-area home"}${price ? ` at ${price}` : ""}`,
    "",
    `Hi,`,
    "",
    `Sharing a Wilson-area home Mike Eatmon's team thought you'd want to see.${address ? ` Property: ${address}` : ""}${city ? `, ${city}, NC` : ""}.`,
    [
      beds ? `${beds} bed` : null,
      baths ? `${baths} bath` : null,
      sqft ? `${sqft.toLocaleString()} sqft` : null,
      price ? `Listed at ${price}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    "",
    remarks ?? "",
    "",
    `${cta} — Mike Eatmon, Our Town Properties.`,
  ].join("\n");
}

function renderSocial(uses: Uses, cta: string): string {
  const address = uses("address_line1");
  const city = uses("city");
  const beds = uses("beds");
  const baths = uses("baths_full");
  const sqft = uses("sqft");
  const price = fmtPrice(uses("list_price"));
  return [
    `${address ? `${address}${city ? `, ${city}` : ""}` : "Wilson-area home"} — ${[
      beds ? `${beds} bed` : null,
      baths ? `${baths} bath` : null,
      sqft ? `${sqft.toLocaleString()} sqft` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "details inside"}.`,
    price ? `Listed at ${price}.` : "",
    "Local guidance from Mike Eatmon · Our Town Properties.",
    cta,
  ]
    .filter(Boolean)
    .join(" ");
}

function renderReel(uses: Uses, cta: string): string {
  const address = uses("address_line1");
  const city = uses("city");
  const beds = uses("beds");
  const baths = uses("baths_full");
  const sqft = uses("sqft");
  const price = fmtPrice(uses("list_price"));
  return [
    `[0:00] Open on ${address ?? "a Wilson-area home"}${city ? `, ${city}` : ""}.`,
    `[0:03] Voiceover: "${beds ?? "?"} bed, ${baths ?? "?"} bath${sqft ? `, ${sqft.toLocaleString()} sqft` : ""}${price ? `, listed at ${price}` : ""}."`,
    `[0:08] Cut to Mike Eatmon — "Local guidance, not an algorithm."`,
    `[0:14] CTA: ${cta}`,
  ].join("\n");
}

function renderFlyer(uses: Uses, cta: string): string {
  const address = uses("address_line1");
  const city = uses("city");
  const price = fmtPrice(uses("list_price"));
  const remarks = uses("public_remarks");
  return [
    `${address ?? "A Wilson-area home"}${city ? `, ${city}, NC` : ""}`,
    price ? `Listed at ${price}` : "",
    remarks ?? "",
    "Mike Eatmon · Our Town Properties, Inc. · Licensed in NC.",
    cta,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function renderLanding(uses: Uses, cta: string): string {
  const city = uses("city");
  return [
    `Get a local read on your ${city ? `${city}-area ` : ""}home.`,
    "Ask Magic Mike helps you see a preliminary home value range, compare selling options, and get follow-up from Mike Eatmon's Our Town Properties team.",
    cta,
  ].join("\n\n");
}

function renderCallScript(uses: Uses, cta: string): string {
  const address = uses("address_line1");
  return [
    `Hi, this is Mike's team at Our Town Properties.`,
    `I'm reaching out about ${address ?? "your property"} — ${cta}.`,
    `When works for a quick call?`,
  ].join(" ");
}
