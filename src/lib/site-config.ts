/**
 * Central site configuration for Ask Magic Mike / Our Town Properties.
 *
 * Single source of truth for canonical domain, brand names, agent details,
 * and market. All metadata, sitemap, robots, and OG URL construction
 * should import from here rather than inlining strings.
 *
 * NEXT_PUBLIC_SITE_URL must be set to https://www.askmagicmike.com in
 * production. The Vercel project domain setting (Production Domain) must
 * also point to www.askmagicmike.com — that is a Vercel dashboard step,
 * not a code change.
 */

export const siteConfig = {
  /** Canonical public URL — drives metadataBase, OG, sitemap, robots. */
  canonicalSiteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.askmagicmike.com",

  /** Vercel deployment alias — never presented as the public brand. */
  vercelAlias: "https://ask-magic-mike.vercel.app",

  brandName: "Ask Magic Mike",
  parentBrandName: "Our Town Properties, Inc.",
  agentName: "Mike Eatmon",
  agentTitle: "Broker",
  market: "Wilson, NC / Eastern NC",

  parentBrandUrl: "https://www.ourtownproperties.com",
  agentProfileUrl: "https://www.ourtownproperties.com/agents/mike-eatmon/",
  homeValueUrl: "https://www.ourtownproperties.com/home-value/",

  /** Agent direct line. */
  agentPhone: process.env.NEXT_PUBLIC_AGENT_PHONE ?? "+12522454337",
  agentPhoneDisplay: "252-245-4337",

  /** Our Town Properties main office. */
  officePhone: "252-243-7700",
  officePhoneDisplay: "252-243-7700",
} as const;

export type SiteConfig = typeof siteConfig;
