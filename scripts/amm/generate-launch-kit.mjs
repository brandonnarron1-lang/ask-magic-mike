#!/usr/bin/env node
// Local deterministic composition only. No network, model, provider or send.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import QRCode from "qrcode";

const root = process.cwd();
const out = resolve(root, "public/launch-20261013");
const photo = resolve(root, "public/brand/black-diamond/hero-social-4x5.jpg");
const logo = resolve(root, "public/brand/black-diamond/our-town-logo.png");
const font = "/System/Library/Fonts/Supplemental/Arial.ttf";
const bold = "/System/Library/Fonts/Supplemental/Arial Bold.ttf";
mkdirSync(out, { recursive: true });
const hash = p => createHash("sha256").update(readFileSync(p)).digest("hex");
const links = {};
const audiences = [
  { key: "seller", route: "/home-value", label: "SELLING A HOME?", heading: "Request your local\nhome value review.", benefit: "Share the address and your best contact.\nPractical guidance from Mike and Our Town.", og: "Request your local\nhome value review.", alt: "Mike Eatmon with Our Town Properties branding. Request a local home value review through Ask Magic Mike. No instant valuation or appraisal is promised." },
  { key: "buyer", route: "/buy", label: "LOOKING FOR A HOME?", heading: "A home in mind?\nA place to start.", benefit: "Share a property or your search area.\nRequest local buying guidance from Our Town.", og: "A home in mind?\nA place to start.", alt: "Mike Eatmon with Our Town Properties branding. Share a specific property or general search area for a local buying-plan request through Ask Magic Mike." },
];
function run(args) { execFileSync("magick", args, { cwd: root, maxBuffer: 2_000_000 }); }
const files = [];
for (const a of audiences) {
  const canonical = `https://www.askmagicmike.com${a.route}`;
  links[a.key] = { canonical };
  for (const channel of ["facebook", "instagram", "owned_site", "qr"]) {
    const u = new URL(canonical);
    u.search = new URLSearchParams({ utm_source: channel === "owned_site" ? "ourtownproperties" : channel, utm_medium: channel === "owned_site" ? "owned_media" : channel === "qr" ? "print" : "organic_social", utm_campaign: "amm_seller_buyer_launch_2026", utm_content: `${a.key}_${channel}` }).toString();
    links[a.key][channel] = u.href;
  }
  const qr = `${a.key}-qr.png`;
  await QRCode.toFile(resolve(out, qr), links[a.key].qr, { width: 640, margin: 4, errorCorrectionLevel: "M" });
  files.push(qr);
  for (const [format, height] of [["feed", 1350], ["story", 1920]]) {
    const photoHeight = format === "feed" ? 730 : 1120;
    const file = `${a.key}-${format}.jpg`;
    run(["-size", `1080x${height}`, "xc:#050505", "(", photo, "-resize", `1080x${photoHeight}^`, "-gravity", "north", "-crop", `1080x${photoHeight}+0+0`, "+repage", ")", "-gravity", "northwest", "-geometry", "+0+0", "-composite", "(", logo, "-resize", "360x", ")", "-geometry", "+56+48", "-composite", "-fill", "#cda24a", "-draw", `rectangle 56,${photoHeight + 38} 1024,${photoHeight + 41}`, "-font", bold, "-pointsize", "34", "-annotate", `+56+${photoHeight + 102}`, a.label, "-fill", "#f4ead4", "-pointsize", "72", "-interline-spacing", "7", "-annotate", `+56+${photoHeight + 202}`, a.heading, "-font", font, "-pointsize", "32", "-interline-spacing", "10", "-annotate", `+56+${photoHeight + 360}`, a.benefit, "-font", bold, "-fill", "#cda24a", "-pointsize", "35", "-annotate", `+56+${height - 70}`, `askmagicmike.com${a.route}`, "-quality", "90", "-strip", resolve(out, file)]);
    files.push(file);
  }
  const og = `${a.key}-og.jpg`;
  run(["-size", "1200x630", "xc:#050505", "(", photo, "-resize", "530x663^", "-gravity", "north", "-crop", "530x630+0+0", "+repage", ")", "-gravity", "northwest", "-geometry", "+670+0", "-composite", "(", logo, "-resize", "290x", ")", "-geometry", "+48+35", "-composite", "-font", bold, "-fill", "#cda24a", "-pointsize", "25", "-annotate", "+48+202", a.label, "-fill", "#f4ead4", "-pointsize", "49", "-interline-spacing", "12", "-annotate", "+48+278", a.og, "-font", font, "-pointsize", "25", "-annotate", "+48+431", "Local guidance. A human reviews your request.", "-font", bold, "-fill", "#cda24a", "-pointsize", "27", "-annotate", "+48+526", `askmagicmike.com${a.route}`, "-quality", "90", "-strip", resolve(out, og)]);
  files.push(og);
}
writeFileSync(resolve(out, "links.json"), JSON.stringify(links, null, 2) + "\n");
writeFileSync(resolve(out, "alt-text.txt"), audiences.map(a => `${a.key} feed/story/OG: ${a.alt}`).join("\n\n") + "\n");
writeFileSync(resolve(out, "posts.md"), `# Short launch posts\n\nSeller 1: Thinking about selling? Request a local home value review with Mike Eatmon and Our Town Properties. Share your address and best contact method to start. ${links.seller.facebook}\n\nSeller 2: Not sure where to begin with selling? Ask for practical, local guidance — no instant valuation promised. ${links.seller.facebook}\n\nBuyer 1: Have a home in mind? Share the address or listing link. Still searching? Tell us your preferred area. Request a local buying plan with Our Town Properties. ${links.buyer.facebook}\n\nBuyer 2: Your next move starts with a clear request. Share a property or a search area, and your best contact method. Mike and Our Town Properties can review the next steps. ${links.buyer.facebook}\n\nFor Instagram, use the matching Instagram URL from links.json in an available Story link sticker or profile link. A URL pasted into a caption is not a clickable-link proof.\n`);
writeFileSync(resolve(out, "widget.html"), '<!-- Owned-site launcher; additive use of the existing versioned widget. -->\n<script async src="https://www.askmagicmike.com/widget.js" data-source="ourtownproperties" data-medium="owned_media" data-campaign="amm_seller_buyer_launch_2026" data-placement="owned-seller-buyer-launch"></script>\n');
writeFileSync(resolve(out, "START_HERE.md"), `# Share Ask Magic Mike\n\nSeller: ${links.seller.canonical}\nBuyer: ${links.buyer.canonical}\n\nFacebook: use the matching link from links.json and a feed image (1080x1350). Choose one post from posts.md.\nInstagram: use a Story image (1080x1920) plus the matching link sticker, or an available profile link. Caption URLs alone are not clickable.\nOwned site: use widget.html only on the verified owned site; the widget has an Open full form fallback.\nPrint: use the matching QR image. On a phone, provide a real clickable link rather than QR-only access.\nAlt text: alt-text.txt. Link previews: seller-og.jpg / buyer-og.jpg (1200x630).\n\nThese files are prepared assets, not evidence that an account published them. Publish only after the corresponding capture and dual-operator delivery acceptance is recorded. No paid advertising, consumer message, guaranteed value, financing or response-time promise.\n`);
const dimensions = files.filter(f => f.endsWith(".jpg")).map(file => ({ file, dimensions: execFileSync("magick", ["identify", "-format", "%wx%h", resolve(out, file)], { encoding: "utf8" }), sha256: hash(resolve(out, file)) }));
const decoded = JSON.parse(execFileSync("swift", [resolve(root, "scripts/amm/decode-launch-qr.swift"), out], { encoding: "utf8", timeout: 60_000 }));
if (decoded.length !== 2 || decoded.some(item => item.result !== "PASS")) throw new Error("qr_decode_proof_failed");
writeFileSync(resolve(out, "asset-manifest.json"), JSON.stringify({ source: { photo: hash(photo), logo: hash(logo) }, identityPreserved: true, aiGeneratedIdentityUsed: false, networkUsed: false, files: dimensions, qr: decoded }, null, 2) + "\n");
const cards = audiences.map(a => `<section><h2>${a.key === "seller" ? "Seller: local home value review" : "Buyer: a property or a search plan"}</h2><p><a class="button" href="${links[a.key].canonical}">Open ${a.key} form</a> <a href="${links[a.key].facebook}">Facebook link</a> · <a href="${links[a.key].instagram}">Instagram link</a></p><div class="assets"><figure><a href="${a.key}-feed.jpg" download><img src="${a.key}-feed.jpg" alt="${a.alt}" width="1080" height="1350"></a><figcaption><a href="${a.key}-feed.jpg" download>Download feed image</a> · 1080×1350</figcaption></figure><figure><a href="${a.key}-story.jpg" download><img src="${a.key}-story.jpg" alt="${a.alt}" width="1080" height="1920"></a><figcaption><a href="${a.key}-story.jpg" download>Download Story image</a> · 1080×1920</figcaption></figure></div><p><a href="${a.key}-qr.png" download>Print QR</a> · <a href="${a.key}-og.jpg" download>Link-preview card</a></p></section>`).join("");
writeFileSync(resolve(out, "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Share Ask Magic Mike — Our Town Properties</title><style>body{margin:0;background:#050505;color:#f4ead4;font:16px/1.6 Arial,sans-serif}main{max-width:960px;margin:auto;padding:24px}a{color:#e2c06f;overflow-wrap:anywhere}h1{font-size:30px;line-height:1.2}section{margin-top:32px;padding-top:20px;border-top:1px solid #cda24a}.button{display:inline-flex;min-height:44px;align-items:center;padding:4px 16px;background:#cda24a;color:#050505;border-radius:6px;text-decoration:none;font-weight:bold}.assets{display:grid;grid-template-columns:1fr 1fr;gap:24px}figure{margin:0}img{display:block;width:100%;height:auto}figcaption a{display:inline-flex;min-height:44px;align-items:center}@media(max-width:500px){.assets{grid-template-columns:1fr}main{padding:20px}}</style></head><body><main><p>Our Town Properties, Inc. · Ask Magic Mike</p><h1>Two clear ways to start.</h1><p>Choose seller or buyer. Download the matching creative and share its link.</p><p><a class="button" href="launch-kit.zip" download>Download the complete share kit</a></p>${cards}<section><h2>What to share where</h2><p>Facebook: a feed image and matching Facebook link. Instagram: a Story image with an available link sticker, or the matching link in your profile. Caption URLs alone are not clickable links. Print QR codes are a second option, not the only way to access a form on a phone.</p><p><a href="posts.md">Short posts</a> · <a href="alt-text.txt">Alt text</a> · <a href="links.json">All channel links</a> · <a href="widget.html" download>Owned-site widget snippet</a> · <a href="START_HERE.md">Start here</a></p><p>Prepared assets are not proof of publication. Use the corresponding path after its operational acceptance is recorded. No instant valuation, appraisal, financing, appointment or response time is promised.</p></section></main></body></html>\n`);
const archiveFiles = ["START_HERE.md", "index.html", "links.json", "posts.md", "alt-text.txt", "widget.html", "asset-manifest.json", ...files];
execFileSync("zip", ["-q", "-FS", "launch-kit.zip", ...archiveFiles], { cwd: out, timeout: 60_000 });
console.log(JSON.stringify({ output: out, images: dimensions, qrDecoded: true, generatedWithoutNetwork: true }, null, 2));
