#!/usr/bin/env node

import {
  inspectWordPressPage,
  normalizeWordPressAuditUrl,
  parseWordPressSitemap,
  summarizeWordPressSurface,
} from "./amm/wordpress-surface-audit-lib.mjs";

const sitemapUrl = normalizeWordPressAuditUrl(
  process.env.WORDPRESS_SITEMAP_URL
    || "https://www.ourtownproperties.com/page-sitemap.xml",
);
const rawCanonicalBridgeFormIds = process.env.WORDPRESS_BRIDGE_FORM_IDS;
const canonicalBridgeFormIds = rawCanonicalBridgeFormIds === undefined
  ? null
  : rawCanonicalBridgeFormIds
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
const headers = { "user-agent": "AskMagicMike-WordPress-Surface-Audit/2.0" };

async function getText(url) {
  let currentUrl = normalizeWordPressAuditUrl(url);
  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirectCount === 5) throw new Error("Unsafe or excessive redirect");
      currentUrl = normalizeWordPressAuditUrl(new URL(location, currentUrl).toString());
      continue;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { response, finalUrl: currentUrl, text: await response.text() };
  }
  throw new Error("WordPress audit redirect limit exceeded");
}

const { text: sitemap } = await getText(sitemapUrl);
const urls = parseWordPressSitemap(sitemap).map(normalizeWordPressAuditUrl);
const pages = [];

for (let offset = 0; offset < urls.length; offset += 6) {
  const batch = urls.slice(offset, offset + 6);
  const inspected = await Promise.all(batch.map(async (url) => {
    try {
      const { response, finalUrl, text } = await getText(url);
      return {
        ...inspectWordPressPage(text, finalUrl),
        requested_url: url,
        http_status: response.status,
      };
    } catch (error) {
      return {
        url,
        requested_url: url,
        error: error instanceof Error ? error.message.slice(0, 120) : "request_failed",
      };
    }
  }));
  pages.push(...inspected);
}

console.log(JSON.stringify({
  checked_at: new Date().toISOString(),
  mode: "read_only_public_surface",
  sitemap: sitemapUrl,
  summary: summarizeWordPressSurface(pages, canonicalBridgeFormIds),
  pages,
}, null, 2));
