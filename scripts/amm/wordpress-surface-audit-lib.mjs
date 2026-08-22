const HTML_ENTITY_MAP = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"',
};

const WORDPRESS_AUDIT_HOSTS = new Set([
  "ourtownproperties.com",
  "www.ourtownproperties.com",
]);

export function normalizeWordPressAuditUrl(value) {
  const parsed = new URL(String(value ?? ""));
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    !WORDPRESS_AUDIT_HOSTS.has(parsed.hostname.toLowerCase())
  ) {
    throw new Error("WordPress audit URL is outside the exact approved HTTPS hosts");
  }
  parsed.hash = "";
  return parsed.toString();
}

const DUPLICATE_ROUTE_CLUSTERS = {
  seller_value: [
    "/how-much-is-your-home-worth/",
    "/home-value/",
    "/home-evaluation/",
  ],
  direct_purchase: [
    "/we-buy-homes/",
    "/we-buy-houses/",
  ],
  ask_mike: [
    "/ask-magic-mike/",
    "/ask-mike/",
  ],
};

export function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&#x([0-9a-f]+);?/gi, (_match, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);?/g, (_match, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&([a-z]+);/gi, (match, name) => HTML_ENTITY_MAP[name.toLowerCase()] ?? match);
}

function attributeValue(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const quoted = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"));
  if (quoted) return decodeHtmlEntities(quoted[2]).trim();
  const unquoted = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*([^\\s>]+)`, "i"));
  return unquoted ? decodeHtmlEntities(unquoted[1]).trim() : "";
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((match) => match[0]);
}

function stripTags(value) {
  return decodeHtmlEntities(String(value ?? "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => String(left).localeCompare(String(right)));
}

function normalizedPath(value) {
  try {
    const path = new URL(value).pathname;
    return path.endsWith("/") ? path : `${path}/`;
  } catch {
    return "/";
  }
}

export function parseWordPressSitemap(xml) {
  return uniqueSorted(
    [...String(xml ?? "").matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/gi)]
      .map((match) => decodeHtmlEntities(match[1])),
  );
}

function extractCanonical(html) {
  for (const tag of tags(html, "link")) {
    const rel = attributeValue(tag, "rel").toLowerCase().split(/\s+/);
    if (rel.includes("canonical")) return attributeValue(tag, "href") || null;
  }
  return null;
}

function extractRobots(html) {
  for (const tag of tags(html, "meta")) {
    if (attributeValue(tag, "name").toLowerCase() === "robots") {
      return attributeValue(tag, "content").toLowerCase();
    }
  }
  return "";
}

function extractGravityFormIds(html) {
  const ids = new Set();
  for (const pattern of [
    /gform_wrapper_(\d+)/g,
    /id=["']gform_(\d+)["']/g,
    /data-formid=["'](\d+)["']/g,
  ]) {
    for (const match of html.matchAll(pattern)) ids.add(Number(match[1]));
  }
  return [...ids].sort((left, right) => left - right);
}

function extractPluginAssets(html) {
  return uniqueSorted(
    [...html.matchAll(/\/wp-content\/plugins\/([^/"'?\s]+)/gi)].map((match) => match[1]),
  );
}

function extractCanonicalLinks(html, pageUrl) {
  const links = [];
  for (const tag of tags(html, "a")) {
    const rawHref = attributeValue(tag, "href");
    if (!rawHref) continue;
    try {
      const parsed = new URL(rawHref, pageUrl);
      if (!/^(www\.)?askmagicmike\.com$/i.test(parsed.hostname)) continue;
      links.push({
        destination: `${parsed.origin}${parsed.pathname}`,
        path: parsed.pathname,
        utm_source: parsed.searchParams.get("utm_source"),
        utm_medium: parsed.searchParams.get("utm_medium"),
        utm_campaign: parsed.searchParams.get("utm_campaign"),
        utm_content: parsed.searchParams.get("utm_content"),
      });
    } catch {
      // Ignore malformed public links; the caller still receives the page-level evidence.
    }
  }
  return [...new Map(links.map((link) => [JSON.stringify(link), link])).values()];
}

function extractTelephoneTargets(html) {
  const targets = [];
  for (const tag of tags(html, "a")) {
    const href = attributeValue(tag, "href");
    if (!href.toLowerCase().startsWith("tel:")) continue;
    const digits = href.slice(4).replace(/[^0-9+]/g, "");
    if (digits) targets.push(digits);
  }
  return uniqueSorted(targets);
}

function extractNativeLeadFormEvidence(html) {
  const forms = [...html.matchAll(/<form\b[^>]*(?:data-amm-form|class=["'][^"']*amm-lead-form)[^>]*>([\s\S]*?)<\/form>/gi)];
  const fieldNames = [];
  const consentTexts = [];
  let hasExplicitConsentControl = false;

  for (const form of forms) {
    const body = form[0];
    for (const field of [...tags(body, "input"), ...tags(body, "select"), ...tags(body, "textarea")]) {
      const name = attributeValue(field, "name");
      if (name) fieldNames.push(name);
      if (/consent|permission|opt[_-]?in/i.test(name)) hasExplicitConsentControl = true;
    }
    for (const match of body.matchAll(/<[^>]+class=["'][^"']*amm-privacy[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/gi)) {
      const text = stripTags(match[1]);
      if (text) consentTexts.push(text.slice(0, 500));
    }
  }

  return {
    count: forms.length,
    field_names: uniqueSorted(fieldNames),
    consent_texts: uniqueSorted(consentTexts),
    has_explicit_consent_control: hasExplicitConsentControl,
  };
}

export function inspectWordPressPage(html, pageUrl) {
  const source = String(html ?? "");
  const robots = extractRobots(source);
  const titleMatch = source.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const nativeLeadForm = extractNativeLeadFormEvidence(source);
  const pluginAssets = extractPluginAssets(source);
  const canonicalLinks = extractCanonicalLinks(source, pageUrl);
  const embedLoader = /https:\/\/www\.askmagicmike\.com\/embed\/amm-loader\.js/i.test(source);
  const embedTag = tags(source, "div").find((tag) => /\bamm-embed\b/i.test(attributeValue(tag, "class")));
  const embed = embedTag ? {
    present: true,
    utm_source: attributeValue(embedTag, "data-utm-source") || null,
    utm_medium: attributeValue(embedTag, "data-utm-medium") || null,
    utm_campaign: attributeValue(embedTag, "data-utm-campaign") || null,
    utm_content: attributeValue(embedTag, "data-utm-content") || null,
  } : { present: false, utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null };

  return {
    url: pageUrl,
    path: normalizedPath(pageUrl),
    title: titleMatch ? stripTags(titleMatch[1]) : null,
    canonical: extractCanonical(source),
    robots: robots || null,
    indexable: !robots.split(",").map((value) => value.trim()).includes("noindex"),
    gravity_form_ids: extractGravityFormIds(source),
    native_amm_lead_form: nativeLeadForm,
    canonical_embed: { ...embed, loader_present: embedLoader },
    canonical_app_links: canonicalLinks,
    plugin_assets: pluginAssets,
    telephone_targets: extractTelephoneTargets(source),
  };
}

export function summarizeWordPressSurface(pages, canonicalBridgeFormIds = []) {
  const successful = pages.filter((page) => !page.error);
  const configuredForms = uniqueSorted(canonicalBridgeFormIds.map(Number).filter(Number.isInteger));
  const formPlacements = {};
  const pluginFootprints = {};
  const telephoneTargets = {};

  for (const page of successful) {
    for (const formId of page.gravity_form_ids) {
      formPlacements[formId] ??= [];
      formPlacements[formId].push(page.url);
    }
    for (const plugin of page.plugin_assets) {
      pluginFootprints[plugin] ??= [];
      pluginFootprints[plugin].push(page.url);
    }
    for (const telephone of page.telephone_targets) {
      telephoneTargets[telephone] ??= [];
      telephoneTargets[telephone].push(page.url);
    }
  }

  const duplicateClusters = Object.entries(DUPLICATE_ROUTE_CLUSTERS).map(([key, paths]) => {
    const matches = paths.map((path) => successful.find((page) => page.path === path)).filter(Boolean);
    return {
      key,
      expected_paths: paths,
      pages: matches.map((page) => ({
        url: page.url,
        canonical: page.canonical,
        indexable: page.indexable,
        gravity_form_ids: page.gravity_form_ids,
        native_amm_lead_form: page.native_amm_lead_form.count > 0,
        canonical_embed: page.canonical_embed.present && page.canonical_embed.loader_present,
      })),
      indexable_count: matches.filter((page) => page.indexable).length,
    };
  });

  const incompleteLinks = successful.flatMap((page) => page.canonical_app_links
    .filter((link) => !link.utm_source || !link.utm_medium || !link.utm_campaign || !link.utm_content)
    .map((link) => ({ page: page.url, destination: link.destination })));
  const incompleteEmbeds = successful
    .filter((page) => page.canonical_embed.present && (
      !page.canonical_embed.utm_source ||
      !page.canonical_embed.utm_medium ||
      !page.canonical_embed.utm_campaign ||
      !page.canonical_embed.utm_content
    ))
    .map((page) => page.url);
  const nativeLegacyPages = successful
    .filter((page) => page.native_amm_lead_form.count > 0)
    .map((page) => page.url);
  const multipleCapturePages = successful.map((page) => {
    const surfaces = [];
    if (page.gravity_form_ids.length) surfaces.push(`gravity_forms:${page.gravity_form_ids.join(",")}`);
    if (page.native_amm_lead_form.count > 0) surfaces.push("legacy_native_amm_form");
    if (page.canonical_embed.present && page.canonical_embed.loader_present) surfaces.push("canonical_amm_embed");
    return { page: page.url, surfaces };
  }).filter((page) => page.surfaces.length > 1);
  const nonCanonicalFormPlacements = Object.entries(formPlacements)
    .filter(([formId]) => configuredForms.length > 0 && !configuredForms.includes(Number(formId)))
    .map(([formId, urls]) => ({ form_id: Number(formId), placement_count: urls.length }));

  const riskFlags = [];
  for (const cluster of duplicateClusters) {
    if (cluster.indexable_count > 1) {
      riskFlags.push({ code: "multiple_indexable_intent_pages", scope: cluster.key, count: cluster.indexable_count });
    }
  }
  if (nativeLegacyPages.length) {
    riskFlags.push({ code: "legacy_native_capture_still_public", count: nativeLegacyPages.length });
  }
  if (multipleCapturePages.length) {
    riskFlags.push({ code: "multiple_capture_systems_on_same_page", count: multipleCapturePages.length });
  }
  if (incompleteLinks.length) {
    riskFlags.push({ code: "canonical_link_missing_complete_utm", count: incompleteLinks.length });
  }
  if (incompleteEmbeds.length) {
    riskFlags.push({ code: "canonical_embed_missing_placement_utm", count: incompleteEmbeds.length });
  }
  if (nonCanonicalFormPlacements.length) {
    riskFlags.push({ code: "gravity_forms_outside_configured_canonical_allowlist", forms: nonCanonicalFormPlacements });
  }
  if (Object.keys(telephoneTargets).length > 1) {
    riskFlags.push({ code: "multiple_public_telephone_targets_require_label_review", count: Object.keys(telephoneTargets).length });
  }

  return {
    page_count: pages.length,
    successful_page_count: successful.length,
    failed_page_count: pages.length - successful.length,
    canonical_bridge_form_ids_supplied_for_comparison: configuredForms,
    gravity_form_placements: formPlacements,
    plugin_footprints: pluginFootprints,
    telephone_targets: telephoneTargets,
    duplicate_route_clusters: duplicateClusters,
    canonical_app_link_count: successful.reduce((total, page) => total + page.canonical_app_links.length, 0),
    incomplete_canonical_links: incompleteLinks,
    incomplete_canonical_embeds: incompleteEmbeds,
    native_legacy_capture_pages: nativeLegacyPages,
    multiple_capture_system_pages: multipleCapturePages,
    risk_flags: riskFlags,
  };
}
