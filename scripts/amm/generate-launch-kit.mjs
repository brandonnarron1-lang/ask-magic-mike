#!/usr/bin/env node
// Additive, local-only composition. Historic launch assets and tags are immutable.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const out = resolve(root, "public/launch-20261013");
const version = "20261021";
const pageFile = `share-${version}.html`;
const creativeFile = `creative-${version}.html`;
const manifestFile = `share-manifest-${version}.json`;
const checkOnly = process.argv.includes("--check");
assert(process.argv.slice(2).every(arg => arg === "--check"), "only --check is supported");
const hash = path => createHash("sha256").update(readFileSync(path)).digest("hex");
const json = path => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const experience = json("config/experience-contract.v1.json");
assert.equal(experience.version, "amm.experience.v1");
assert.equal(experience.canonicalOrigin, "https://www.askmagicmike.com");
const historicLinks = json("public/launch-20261013/links.json");
const historicManifest = json("public/launch-20261013/asset-manifest.json");
const historicFiles = readdirSync(out).filter(file => !file.includes(version));
const historicHashes = historicFiles.map(file => ({ file, sha256: hash(resolve(out, file)) }));
const photo = "public/brand/black-diamond/hero-social-4x5.jpg";
const logo = "public/brand/black-diamond/our-town-logo.png";
assert.equal(hash(resolve(root, photo)), historicManifest.source.photo);
assert.equal(hash(resolve(root, logo)), historicManifest.source.logo);

// Execute the actual pure registry, not a duplicate campaign/placement list.
// Bounded Node TypeScript resolver, matching the repo's standalone worker pattern.
const contractUrl = pathToFileURL(resolve(root, "config/experience-contract.v1.json")).href;
const hooks = registerHooks({
  resolve(specifier, context, next) {
    try { return next(specifier, context); }
    catch (error) {
      if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".")) return next(`${specifier}.ts`, context);
      throw error;
    }
  },
  load(url, context, next) {
    if (url === contractUrl) return { format: "module", source: `export default ${readFileSync(fileURLToPath(url), "utf8")};`, shortCircuit: true };
    return next(url, context);
  },
});
const { resolveOwnedDemandPlacement, resolveExactOwnedDemandSignalPlacement } = await import("../../app/lib/growth/owned-demand.ts");
const { safeRegisteredPublicAnalyticsDimension } = await import("../../src/lib/analytics/privacy.ts");
hooks.deregister();

const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const read = file => readFileSync(resolve(out, file), "utf8");
const write = (file, content) => {
  assert(file.includes(`-${version}.`) && !file.includes("/"), "versioned new outputs only");
  if (checkOnly) assert.equal(read(file), content, `generated content drift: ${file}`);
  else if (!existsSync(resolve(out, file)) || read(file) !== content) writeFileSync(resolve(out, file), content);
};
const formats = [
  { key: "feed", width: 1080, height: 1350, label: "Feed · 4:5" },
  { key: "story", width: 1080, height: 1920, label: "Story · 9:16" },
  { key: "og", width: 1200, height: 630, label: "OG · 1200×630" },
];
const offers = [
  { key: "home-value", contract: "homeValue", name: "Home Value", legacy: "seller", placement: "seller_review", heading: "Request your local\nhome value review.", eyebrow: "SELLING A HOME?", body: "Share the address and your best contact.\nPractical guidance from Mike and Our Town.", caption: "Thinking about selling? Request a local home value review with Mike Eatmon and Our Town Properties. Share your address and best contact method for review. Broker-reviewed guidance, not an instant valuation, appraisal or guaranteed value.", alt: "Mike Eatmon with Our Town Properties branding. Request a local home value review through Ask Magic Mike. No instant valuation or appraisal is promised." },
  { key: "buying-help", contract: "buyer", name: "Buying Help", legacy: "buyer", placement: "buyer_match", heading: "A home in mind?\nA place to start.", eyebrow: "LOOKING FOR A HOME?", body: "Share a property or your search area.\nRequest local buying guidance from Our Town.", caption: "Have a home in mind? Share the address or listing link. Still searching? Tell us your preferred area. Request local buying guidance from Mike Eatmon and Our Town Properties. Availability, financing and appointments require confirmation.", alt: "Mike Eatmon with Our Town Properties branding. Share a specific property or general search area for a local buying-plan request through Ask Magic Mike." },
  { key: "compare-selling-options", contract: "compare", name: "Compare Selling Options", placement: "compare_selling_options", heading: "Compare your\nselling options.", eyebrow: "LISTING OR AS-IS?", body: "Share your property and timing for review.\nNo offer, valuation or closing date is promised.", caption: "Listing, selling as-is, or simply weighing your options? Request a property review with Mike Eatmon and Our Town Properties before deciding. Compare listing with an as-is option. No offer, valuation or closing date is promised.", alt: "Mike Eatmon with the Our Town Properties logo. Compare listing with an as-is selling option through Ask Magic Mike. Property review is required; no offer, valuation or closing date is promised." },
];

function signalForUrl(value) {
  const url = new URL(value);
  return { source: url.searchParams.get("utm_source"), medium: url.searchParams.get("utm_medium"), campaign: url.searchParams.get("utm_campaign"), content: url.searchParams.get("utm_content"), leads: 1 };
}

function verifiedPlacement(channel, key, clean) {
  const placement = resolveOwnedDemandPlacement(channel, key);
  assert(placement, `missing registered placement: ${channel}/${key}`);
  const choice = (placement.destinationChoices ?? [placement]).find(item => item.destination === clean);
  assert(choice, `registered destination mismatch: ${clean}`);
  const url = new URL(choice.trackedUrl);
  assert.equal(url.origin, experience.canonicalOrigin);
  const match = resolveExactOwnedDemandSignalPlacement(signalForUrl(choice.trackedUrl));
  assert.equal(match?.channelKey, channel);
  assert.equal(match?.placementKey, key);
  for (const dimension of ["utm_source", "utm_medium", "utm_campaign"]) {
    assert.equal(safeRegisteredPublicAnalyticsDimension(dimension, url.searchParams.get(dimension)), url.searchParams.get(dimension), `unregistered public dimension: ${dimension}`);
  }
  return { channel, placement: key, url: choice.trackedUrl };
}
for (const offer of offers) {
  offer.clean = new URL(experience.offers[offer.contract].destination, experience.canonicalOrigin).href;
  offer.tracked = ["facebook", "instagram"].map(channel => verifiedPlacement(channel, offer.placement, offer.clean));
  if (offer.contract === "compare") offer.tracked.push(verifiedPlacement("ourtown_wordpress", "wordpress_we_buy_homes", offer.clean));
  offer.assets = formats.map(format => ({ ...format, file: offer.legacy ? `${offer.legacy}-${format.key}.jpg` : `compare-selling-options-${format.key}-${version}.jpg`, reused: Boolean(offer.legacy) }));
}
for (const key of ["seller", "buyer"]) {
  for (const channel of ["facebook", "instagram"]) {
    assert.equal(resolveExactOwnedDemandSignalPlacement(signalForUrl(historicLinks[key][channel])), null, "historic registry discrepancy needs fresh review");
  }
}

const css = `:root{color-scheme:dark;--black:#050505;--cream:#f4ead4;--gold:#cda24a}*{box-sizing:border-box}body{margin:0;background:var(--black);color:var(--cream);font:16px/1.6 Arial,sans-serif}a{color:#e2c06f;overflow-wrap:anywhere}a,button{touch-action:manipulation}a:focus-visible,button:focus-visible,textarea:focus-visible{outline:3px solid var(--cream);outline-offset:4px}main{max-width:1120px;margin:auto;padding:32px 24px 64px}.brand{width:210px;height:auto;display:block}h1{font-size:clamp(32px,5vw,56px);line-height:1.08;max-width:780px;margin:32px 0 20px}h2{font-size:28px;line-height:1.2}h3{font-size:17px;margin-bottom:8px}.muted{color:#d1c8b6}.eyebrow{color:var(--gold);font-size:13px;font-weight:bold;letter-spacing:.14em}.intro{max-width:760px}.nav{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}.button,button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 16px;border:1px solid var(--gold);border-radius:4px;background:var(--gold);color:var(--black);font:700 14px/1.4 Arial,sans-serif;text-decoration:none;font-weight:bold;cursor:pointer}.secondary{background:transparent;color:var(--cream)}section{border-top:1px solid #59472a;padding-top:28px;margin-top:36px}.assets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}figure{margin:0;min-width:0}figure img{width:100%;height:auto;display:block;border:1px solid #302b20}figcaption{font-size:14px;margin-top:8px}figcaption a{display:inline-flex;align-items:center;min-height:44px}.copy{max-width:850px}textarea{display:block;width:100%;resize:vertical;min-height:100px;padding:12px;background:#12110f;border:1px solid #72603d;border-radius:4px;color:var(--cream);font:inherit;line-height:1.5}.copy-row{display:flex;gap:12px;align-items:center;margin:8px 0 20px}.link{display:block;font-size:14px;line-height:1.7;margin-bottom:12px;overflow-wrap:anywhere}.warning{border-left:3px solid var(--gold);padding:12px 16px;background:#19150d}.status{font-size:13px;color:#e2c06f}details{margin:16px 0}summary{cursor:pointer;min-height:44px;padding:8px 0}footer{border-top:1px solid #59472a;margin-top:36px;padding-top:24px;font-size:14px}@media(max-width:650px){main{padding:24px 20px 48px}.assets{grid-template-columns:1fr 1fr;gap:14px}.assets figure:last-child{grid-column:1/-1;max-width:480px}h2{font-size:25px}}@media(max-width:360px){.assets{grid-template-columns:1fr}.assets figure:last-child{grid-column:auto}}`;
const head = (title, styles) => `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>${escape(title)} — Our Town Properties</title><style>${styles}</style></head>`;
const creativeCss = `*{box-sizing:border-box}body{margin:0;background:#181818;color:#f4ead4;font-family:Arial,sans-serif}.creative{position:relative;width:1080px;height:1350px;background:#050505;overflow:hidden;margin-bottom:24px}.photo{position:absolute;inset:0 0 auto;width:1080px;height:730px;object-fit:cover;object-position:top}.logo{position:absolute;left:56px;top:48px;width:360px;height:auto}.copy{position:absolute;top:768px;left:56px;width:968px;border-top:3px solid #cda24a;padding-top:48px}.eyebrow{font-size:34px;color:#cda24a;font-weight:700;margin:0 0 48px}.heading{font-size:72px;line-height:1.2;font-weight:700;white-space:pre-line;margin:0 0 16px}.body{font-size:32px;line-height:1.42;white-space:pre-line;margin:0}.url{position:absolute;left:56px;bottom:36px;color:#cda24a;font-size:35px;font-weight:700;margin:0}.disclosure{font-size:25px;margin-top:26px}.story{height:1920px}.story .photo{height:1120px}.story .copy{top:1158px}.story .url{bottom:210px}.og{width:1200px;height:630px}.og .photo{left:670px;width:530px;height:630px}.og .logo{left:48px;top:35px;width:290px}.og .copy{top:190px;left:48px;width:590px;border:0;padding:0}.og .eyebrow{font-size:25px;margin:0 0 40px}.og .heading{font-size:49px;line-height:1.35;margin:0 0 30px}.og .body{font-size:24px;line-height:1.5}.og .url{left:48px;bottom:88px;font-size:27px}.og .disclosure{font-size:21px;margin-top:20px}.editor-note{max-width:900px;font:16px/1.6 Arial,sans-serif;margin:24px}.editor-note a{color:#e2c06f}`;
const creatives = offers.flatMap(offer => formats.map(format => `<article id="${offer.key}-${format.key}" class="creative ${format.key}" aria-label="${escape(`${offer.name} ${format.label}`)}"><img class="photo" src="../brand/black-diamond/hero-social-4x5.jpg" alt="Mike Eatmon in front of a home at dusk"><img class="logo" src="../brand/black-diamond/our-town-logo.png" alt="Our Town Properties, Inc."><div class="copy"><p class="eyebrow">${escape(offer.eyebrow)}</p><h2 class="heading">${escape(offer.heading)}</h2><p class="body">${escape(offer.body)}</p>${!offer.legacy && format.key !== "og" ? '<p class="disclosure">Request a review with Mike Eatmon · Our Town Properties</p>' : ""}</div><p class="url">askmagicmike.com${escape(new URL(offer.clean).pathname)}</p></article>`)).join("\n");
write(creativeFile, `${head("Editable share creatives", creativeCss)}<body><p class="editor-note">Local editable HTML source · all three offers and formats. Edit typography and copy through the generator; do not alter Mike’s identity or the logo. Seller/buyer JPG exports are intentionally reused byte-for-byte; this source does not claim pixel parity with historic exports. Only the new comparison panels are rendered. <a href="${pageFile}">Back to the share page</a>.</p>${creatives}</body></html>\n`);

const cards = offers.map(offer => {
  const tracked = offer.tracked.map(item => `<h3>${item.channel === "ourtown_wordpress" ? "Registered owned-site link · not for social" : `Registered ${item.channel === "facebook" ? "Facebook" : "Instagram"} link`}</h3><a class="link" href="${escape(item.url)}">${escape(item.url)}</a>`).join("");
  return `<section id="${offer.key}"><p class="eyebrow">${escape(offer.key === "home-value" ? "01 · SELL" : offer.key === "buying-help" ? "02 · BUY" : "03 · COMPARE")}</p><h2>${offer.name}</h2><p>${escape(experience.offers[offer.contract].claim)}.</p><div class="assets">${offer.assets.map(asset => `<figure><a href="${asset.file}" download><img src="${asset.file}" width="${asset.width}" height="${asset.height}" loading="lazy" alt="${escape(offer.alt)}"></a><figcaption>${asset.label}<br><a href="${asset.file}" download>Download JPG</a> · ${asset.width}×${asset.height}${asset.reused ? " · reused" : ""}</figcaption></figure>`).join("")}</div><div class="copy"><h3><label for="caption-${offer.key}">Caption · add the appropriate link below</label></h3><textarea id="caption-${offer.key}" readonly rows="5">${escape(offer.caption)}</textarea><div class="copy-row"><button type="button" data-copy="caption-${offer.key}">Copy caption</button><span class="status" aria-live="polite"></span></div><h3><label for="alt-${offer.key}">Alt text · feed, Story and OG</label></h3><textarea id="alt-${offer.key}" readonly rows="3">${escape(offer.alt)}</textarea><div class="copy-row"><button type="button" class="secondary" data-copy="alt-${offer.key}">Copy alt text</button><span class="status" aria-live="polite"></span></div><h3>Clean link</h3><a class="link" href="${escape(offer.clean)}">${escape(offer.clean)}</a>${tracked}<p><a href="${creativeFile}#${offer.key}-feed">Editable HTML typography</a></p></div></section>`;
}).join("\n");
const copyScript = `<script>document.querySelectorAll('[data-copy]').forEach(function(button){button.addEventListener('click',async function(){var field=document.getElementById(button.dataset.copy);var status=button.nextElementSibling;try{await navigator.clipboard.writeText(field.value);status.textContent='Copied.';}catch(error){field.focus();field.select();status.textContent='Text selected. Use your device’s Copy command.';}});});</script>`;
write(pageFile, `${head("Three offers. One simple share kit", css)}<body><main><header><img class="brand" src="../brand/black-diamond/our-town-logo.png" alt="Our Town Properties, Inc." width="343" height="145"><p class="eyebrow">ASK MAGIC MIKE · OWNER SHARE KIT · OCTOBER 21, 2026</p><h1>Three ways to start a local conversation.</h1><p class="intro">Choose one offer. Download the matching creative, copy its caption and alt text, then add the appropriate link. Requests go to Mike Eatmon and Our Town Properties for review.</p><p class="intro muted">Prepared locally for owner review. Nothing has been published or sent. No paid tools, ad spend or guarantees.</p><nav class="nav" aria-label="Offers">${offers.map(offer => `<a class="button secondary" href="#${offer.key}">${offer.name}</a>`).join("")}</nav></header>${cards}<section id="tracking"><h2>Tracking and posting notes</h2><p>Facebook: use the offer’s registered Facebook link in the post. Instagram: use its registered Instagram link in a Story link sticker or the verified profile-link field. A URL in an Instagram feed caption is not a clickable-link placement. Keep Story link stickers clear of Mike’s face and the visible copy.</p><p>The historic kit uses <code>organic_social</code> and <code>amm_seller_buyer_launch_2026</code>. Those exact tuples are not in the current owned-demand registry, which uses <code>social_organic</code> and <code>amm_owned_demand_2026</code>. The original assets, URLs, tags and seven-day sequence are retained unchanged, not silently retagged. The registered links shown above come directly from that existing registry.</p><p>Compare Selling Options now has registered Facebook and Instagram offer links in the existing owned-demand campaign. Both preserve the contract’s compare choice. Its existing Our Town WordPress link and tracking tag are retained separately; use only the matching channel link. Registration is not proof of publication, traffic or a genuine inquiry.</p><p><a href="index.html">Historic two-offer kit</a> · <a href="seven-day-sharing.md">Historic seven-day sequence</a> · <a href="${manifestFile}">Asset hashes, dimensions and tracking evidence</a></p></section><footer>Mike Eatmon · Our Town Properties, Inc. · Equal Housing Opportunity.<br>No instant valuation, appraisal, guaranteed offer, financing, appointment, response time or closing date is promised. Property facts and possible next steps require human verification. Prepared assets are not publication, traffic, inquiries or delivery receipts.</footer></main>${copyScript}</body></html>\n`);

if (!checkOnly) {
  // Existing repository renderer dependency; never install a browser or package.
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 1920 }, deviceScaleFactor: 1 });
    await page.route("**/*", route => route.request().url().startsWith("file:") ? route.continue() : route.abort());
    await page.goto(pathToFileURL(resolve(out, creativeFile)).href);
    await page.evaluate(() => document.fonts.ready);
    for (const asset of offers[2].assets) {
      const panel = page.locator(`#${offers[2].key}-${asset.key}`);
      await panel.scrollIntoViewIfNeeded();
      const box = await panel.boundingBox();
      assert(box, "creative panel missing");
      // Integer clipping avoids a fractional page offset adding a stray pixel.
      await page.screenshot({ path: resolve(out, asset.file), clip: { x: Math.round(box.x), y: Math.round(box.y), width: asset.width, height: asset.height }, type: "jpeg", quality: 90, animations: "disabled" });
    }
  } finally { await browser.close(); }
}
const images = offers.flatMap(offer => offer.assets.map(asset => {
  const path = resolve(out, asset.file);
  const dimensions = execFileSync("magick", ["identify", "-format", "%wx%h", path], { encoding: "utf8" });
  assert.equal(dimensions, `${asset.width}x${asset.height}`, asset.file);
  if (asset.reused) assert.equal(hash(path), historicManifest.files.find(item => item.file === asset.file)?.sha256, `historic export changed: ${asset.file}`);
  return { file: asset.file, offer: offer.name, dimensions, sha256: hash(path), reused: asset.reused };
}));
for (const item of historicHashes) assert.equal(hash(resolve(out, item.file)), item.sha256, `historic kit changed: ${item.file}`);
const registryFiles = ["app/lib/growth/owned-demand.ts", "app/lib/growth/wordpress-placement-catalog.ts", "src/lib/admin/utm-link-builder.ts", "src/lib/analytics/privacy.ts", "config/experience-contract.v1.json"];
const manifest = {
  version, page: pageFile, editableSource: creativeFile, identityPreserved: true, aiGeneratedIdentityUsed: false, networkUsed: false, newSpendUsd: 0,
  source: { photo: { file: photo, sha256: hash(resolve(root, photo)) }, logo: { file: logo, sha256: hash(resolve(root, logo)) } },
  images, documents: [pageFile, creativeFile].map(file => ({ file, sha256: hash(resolve(out, file)) })),
  registry: registryFiles.map(file => ({ file, sha256: hash(resolve(root, file)) })),
  offers: offers.map(offer => ({ offer: offer.name, clean: offer.clean, caption: offer.caption, alt: offer.alt, registeredLinks: offer.tracked, historicLinks: offer.legacy ? historicLinks[offer.legacy] : null })),
  discrepancies: ["Historic seller/buyer organic_social + amm_seller_buyer_launch_2026 tuples are retained but absent from the current owned-demand registry; new social handoff uses existing registered social_organic + amm_owned_demand_2026 tuples."],
  historicFiles: historicHashes, status: "locally prepared only; not published, sent, deployed or live-tracking verified",
};
write(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ mode: checkOnly ? "check" : "generate", page: resolve(out, pageFile), images, historicFilesUnchanged: historicHashes.length, registryVerified: true, discrepancies: manifest.discrepancies }, null, 2));
