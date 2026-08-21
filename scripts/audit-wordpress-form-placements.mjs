#!/usr/bin/env node

import {
  inspectWordPressPage,
  parseWordPressSitemap,
  summarizeWordPressSurface,
} from "./amm/wordpress-surface-audit-lib.mjs";

const sitemapUrl = process.env.WORDPRESS_SITEMAP_URL
  || "https://www.ourtownproperties.com/page-sitemap.xml";
const canonicalBridgeFormIds = (process.env.WORDPRESS_BRIDGE_FORM_IDS || "")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter(Number.isInteger);
const headers = { "user-agent": "AskMagicMike-WordPress-Surface-Audit/2.0" };

async function getText(url) {
  const response = await fetch(url, {
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { response, text: await response.text() };
}

const { text: sitemap } = await getText(sitemapUrl);
const urls = parseWordPressSitemap(sitemap);
const pages = [];

for (let offset = 0; offset < urls.length; offset += 6) {
  const batch = urls.slice(offset, offset + 6);
  const inspected = await Promise.all(batch.map(async (url) => {
    try {
      const { response, text } = await getText(url);
      return {
        ...inspectWordPressPage(text, response.url || url),
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
