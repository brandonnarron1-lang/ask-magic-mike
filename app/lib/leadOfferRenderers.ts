import { LEAD_MODULES, lockScreenPresentation, offerDeadline, type LeadPresentation } from "./leadPresentation";
import { smsEncodingEstimate } from "../../src/lib/messaging/sms-policy";

const ORIGIN = "https://www.askmagicmike.com";
function escape(value: unknown) { return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!); }
function safeLine(value: string) { return Array.from(value,c=>c.charCodeAt(0)<=31||c.charCodeAt(0)===127?" ":c).join("").slice(0,120); }
function offerUrl(view: LeadPresentation) {
  return view.offer ? `${ORIGIN}/admin/allocation/offers/${encodeURIComponent(view.offer.id)}` : `${ORIGIN}/admin/leads`;
}

export function renderLeadOfferEmail(input: LeadPresentation) {
  // Offers deliberately use the same minimized tier as SMS. Existing full
  // internal alerts remain unchanged; this does not expand BCC fanout.
  const view = lockScreenPresentation(input);
  const category = LEAD_MODULES[view.subtype];
  const state = view.offer?.state || "blocked";
  const subject = `${view.isTest ? "[TEST] " : ""}Ask Magic Mike | ${category.label} | ${safeLine(view.location)} | ${state.replaceAll("_", " ")}`;
  const preheader = `${view.priority} · ${view.reference} · Current details require sign-in.`;
  const deadline = view.offer ? offerDeadline(view.offer.deadline) : "No active acceptance deadline";
  const url = offerUrl(view);
  const text = `${subject}\n${preheader}\nOur Town Properties, Inc.\n${category.title}\n${view.location}\nPriority: ${view.priority}${view.score !== null ? ` ${view.score}` : " — not scored"}\n${view.reference}\n${state}\nDeadline: ${deadline}\n${view.nextAction}\nReview current state: ${url}\nClaim/Pass requires the intended agent to sign in and confirm. Opening this link does not assign a lead.\nThis is a send-time snapshot, not a live countdown. No consumer contact is authorized by this message.\n${view.isTest ? "INTERNAL QA — DO NOT CONTACT\n" : ""}Manage channel preferences in Lead Center.`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>${escape(subject)}</title></head><body style="margin:0;background:#080A0B;color:#F5EAD1;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escape(preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;border:1px solid #D9AF52;background:#121619;border-radius:16px"><tr><td style="padding:24px"><img width="164" height="70" alt="Our Town Properties, Inc." src="${ORIGIN}/images/ask-magic-mike/brand-pack-v2/our-town-logo-clean.png" style="display:block;object-fit:contain;max-width:100%"><p style="font-size:12px;color:#D9AF52;letter-spacing:2px">ASK MAGIC MIKE</p></td></tr><tr><td bgcolor="${category.surface}" style="padding:16px 24px;border-top:1px solid #D9AF52;border-bottom:1px solid #D9AF52;color:${category.accent};font-size:22px;font-weight:bold">${escape(category.title)}</td></tr><tr><td style="padding:24px"><p style="color:#D9AF52;font-weight:bold">${view.priority}${view.score !== null ? ` · ${view.score}` : ""} · ${escape(view.reference)}</p><h1 style="font-size:28px;margin:12px 0;color:#F5EAD1">${escape(view.location)}</h1><p style="color:#F5EAD1">${escape(state.replaceAll("_", " "))} · Owned intake</p><p style="color:#F5EAD1"><strong>Deadline:</strong> ${escape(deadline)}</p><p style="line-height:1.6;color:#F5EAD1">${escape(view.nextAction)}</p><p style="margin:24px 0"><a href="${escape(url)}" style="display:inline-block;background:#D9AF52;color:#080A0B;font-weight:bold;padding:16px 24px;border-radius:8px;text-decoration:none">${state === "offered" ? "Review Claim / Pass" : "Open current state"}</a></p><p style="font-size:14px;line-height:1.6;color:#D9CEB8">Only the intended agent can confirm. Link scanners, previews and audit copies cannot claim. Details remain in the authenticated Lead Center.</p>${view.isTest ? '<p style="color:#FF8794;font-weight:bold">INTERNAL QA — DO NOT CONTACT</p>' : ""}</td></tr><tr><td style="padding:20px 24px;border-top:1px solid #746239;color:#D9CEB8;font-size:12px;line-height:1.6">Our Town Properties, Inc. · Ask Magic Mike<br>This is a send-time snapshot. Current ownership and expiry are checked on the server.<br>No valuation, availability, financing or appointment is guaranteed.<br>Manage channel preferences in Lead Center.</td></tr></table></td></tr></table></body></html>`;
  if (new TextEncoder().encode(html).length > 40_000) throw new Error("email_size_budget_exceeded");
  return { subject, preheader, html, text, url };
}

export function renderLeadOfferSms(input: LeadPresentation, code?: string) {
  const view = lockScreenPresentation(input);
  if (code && !/^[A-HJ-NP-Z2-9]{8}$/.test(code)) throw new Error("invalid_offer_code");
  const command = view.offer?.state === "offered" && code ? `Reply CLAIM ${code} or PASS ${code}.` : "Sign in to review current state.";
  const text = `${view.isTest ? "[TEST] " : ""}Ask Magic Mike / Our Town\n${LEAD_MODULES[view.subtype].label} | ${safeLine(view.location)} | ${view.priority}${view.score !== null ? ` ${view.score}` : ""}\n${command}\n${view.offer ? `${view.offer.state==="offered"?"Expires":"Original offer deadline"} ${offerDeadline(view.offer.deadline)}.\n` : ""}${offerUrl(view)}\nSTOP to opt out. HELP for help.${view.isTest ? "\nINTERNAL QA - DO NOT CONTACT" : ""}`;
  return { text, url: offerUrl(view), ...smsEncodingEstimate(text) };
}

// Category-only static artwork: no DTO, offer code/id, consumer/property
// fields or auth capability enter pixels or media paths.
export function renderLeadCategorySvg(subtype: keyof typeof LEAD_MODULES, logoDataUri?: string) {
  if(logoDataUri&&(!logoDataUri.startsWith("data:image/png;base64,")||!/^[A-Za-z0-9+/=]+$/.test(logoDataUri.slice(22))))throw new Error("approved_logo_png_required");
  const category = LEAD_MODULES[subtype];
  const title = category.label === "Cash-offer seller" ? "CASH-OFFER SELLER" : category.label.toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="#080A0B"/><rect x="42" y="42" width="996" height="1266" rx="40" fill="#121619" stroke="#D9AF52" stroke-width="3"/><path d="M82 260H998M82 1120H998" stroke="#746239"/>${logoDataUri?`<image x="82" y="64" width="440" height="130" href="${logoDataUri}"/>`:'<text x="82" y="120" font-size="45" font-family="Arial,sans-serif" fill="#D9AF52">OUR TOWN PROPERTIES, INC.</text>'}<text x="82" y="234" font-size="32" font-family="Arial,sans-serif" letter-spacing="5" fill="#F5EAD1">ASK MAGIC MIKE</text><rect x="82" y="300" width="916" height="140" rx="20" fill="${category.surface}" stroke="${category.accent}"/><text x="110" y="385" font-size="48" font-family="Arial,sans-serif" font-weight="bold" fill="${category.accent}">${escape(title)}</text><path d="M310 685L540 505L770 685M358 660V915H722V660M493 915V777H587V915" fill="none" stroke="#D9AF52" stroke-width="14" stroke-linejoin="round"/><text x="540" y="1010" text-anchor="middle" font-size="30" font-family="Arial,sans-serif" fill="#D9CEB8">Illustrative category artwork — not a property</text><text x="82" y="1194" font-size="36" font-family="Arial,sans-serif" fill="#F5EAD1">Review details in your secure Lead Center.</text><text x="82" y="1254" font-size="28" font-family="Arial,sans-serif" fill="#D9AF52">Commands and deadline are in the message text.</text></svg>`;
}
