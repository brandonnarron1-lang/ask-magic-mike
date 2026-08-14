#!/usr/bin/env node

const sitemapUrl = process.env.WORDPRESS_SITEMAP_URL
  || "https://www.ourtownproperties.com/page-sitemap.xml";

const sitemapResponse = await fetch(sitemapUrl, {
  headers: { "user-agent": "AskMagicMike-Phase2-Audit/1.0" },
  signal: AbortSignal.timeout(20_000),
});

if (!sitemapResponse.ok) {
  throw new Error(`Sitemap request failed with HTTP ${sitemapResponse.status}`);
}

const sitemap = await sitemapResponse.text();
const urls = [...sitemap.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)].map((match) => match[1]);
const placements = [];

for (const url of urls) {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "AskMagicMike-Phase2-Audit/1.0" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) continue;

    const html = await response.text();
    const ids = new Set();
    for (const pattern of [
      /gform_wrapper_(\d+)/g,
      /id=["']gform_(\d+)["']/g,
      /data-formid=["'](\d+)["']/g,
    ]) {
      for (const match of html.matchAll(pattern)) ids.add(Number(match[1]));
    }
    if (ids.size > 0) placements.push({ url, form_ids: [...ids].sort((a, b) => a - b) });
  } catch {
    // A single page timeout must not abort the inventory.
  }
}

console.log(JSON.stringify({ checked_at: new Date().toISOString(), sitemap: sitemapUrl, placements }, null, 2));
