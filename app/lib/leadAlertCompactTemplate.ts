import type { LeadAlertRenderInput } from "./leadAlertTemplates";
import { leadReceivedLabel, leadRequestLabel, leadSourceLabel, leadTimelineLabel } from "./leadReadability";
import { selectLeadAlertVisualTemplate } from "./leadAlertVisualTemplates";

function clean(value: string | undefined, fallback: string, limit = 160) {
  return Array.from(value?.trim() || fallback).map(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? " " : c).join("").slice(0, limit);
}
function escape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/** Reader-only v5. Generation remains v4 until a separate reader-first release
 * and activation decision. Never render old queued events through this version. */
export function renderCompactLeadAlert(input: LeadAlertRenderInput) {
  const { payload, score, routing } = input;
  const isTest = payload.is_test === true;
  const request = leadRequestLabel(payload.lead_type === "chat" ? "ask" : payload.lead_type || payload.funnel_type);
  const subject = `${isTest ? "[TEST] " : ""}Ask Magic Mike | ${request}`;
  // Arbitrary UTMs/source labels may themselves contain private free text.
  const knownSources = new Set(["ourtownproperties", "home_value_page", "wordpress_home_value_page", "wordpress_rental_to_homeownership", "renter_page", "buyer_page", "seller_page", "ask_page", "home_value", "widget", "open_house", "internal_qa"]);
  const source = knownSources.has(routing.sourceLabel) ? leadSourceLabel(routing.sourceLabel) : "Source needs review in Lead Center";
  const name = clean(payload.name || [payload.first_name, payload.last_name].filter(Boolean).join(" "), "Name not recorded");
  const area = clean(payload.city || payload.target_geography, "Area not recorded", 80);
  const timeframe = clean(leadTimelineLabel(payload.timeline), "Timeframe not recorded", 80);
  const priority = score.score >= 80 ? "High" : score.score >= 60 ? "Medium" : "Standard";
  const queue = routing.owner === "mike" ? "Mike / approved Lead Center team" : "Owner review required";
  const received = leadReceivedLabel(input.submittedAt);
  const leadUrl = `https://www.askmagicmike.com/admin/leads/${encodeURIComponent(input.duplicateOfLeadId || input.leadId)}`;
  const notice = isTest ? "QA TEST — DO NOT CONTACT. Read-only review only."
    : "Review permission before personal follow-up. Record the actual result afterward.";
  const repeat = input.duplicateOfLeadId ? "Newer inquiry linked to an existing lead. Opens the main record; not a new assignment." : "";
  const text = [subject, `Open saved lead: ${leadUrl}`, notice, `Request: ${request}`, `Timeframe: ${timeframe}`,
    `Source: ${source}`, `Review queue: ${queue}`, `Received: ${received}`, `Priority: ${isTest ? "Test only" : priority}`,
    ...(repeat ? [repeat] : []), "Our Town Properties, Inc. Contact details stay in Lead Center. Not a survey."].join("\n");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;background:#090909;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:12px 8px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;table-layout:fixed;border:1px solid #d9af52"><tr><td style="padding:14px 16px;background:#090909;color:#f5ead1;overflow-wrap:anywhere"><p style="margin:0;font-size:14px;color:#d9af52">ASK MAGIC MIKE · OUR TOWN PROPERTIES, INC.</p></td></tr><tr><td style="padding:16px;background:#f5ead1;color:#171715;line-height:1.5;overflow-wrap:anywhere"><h1 style="margin:0 0 12px;font-size:22px;line-height:1.3">${escape(request)}</h1><p style="margin:0 0 8px;font-size:16px"><strong>${escape(name)}</strong><br/>${escape(area)} · ${escape(timeframe)}</p><p style="margin:14px 0"><a href="${escape(leadUrl)}" style="display:block;padding:14px 16px;min-height:24px;background:#d9af52;color:#090909;text-align:center;font-size:16px;font-weight:bold;text-decoration:none">Open saved lead</a></p><p style="margin:0 0 12px;font-size:14px">${escape(notice)}</p><p style="margin:0;font-size:14px"><strong>Source:</strong> ${escape(source)}<br/><strong>Review queue:</strong> ${escape(queue)}<br/><strong>Received:</strong> ${escape(received)}<br/><strong>Priority:</strong> ${escape(isTest ? "Test only" : priority)}</p>${repeat ? `<p style="margin:12px 0 0;font-size:14px">${escape(repeat)}</p>` : ""}<p style="margin:14px 0 0;font-size:12px">Contact details stay in the authenticated Lead Center. Not a survey.</p></td></tr></table></td></tr></table></body></html>`;
  // Keep the renderer's established provider/Reply-To return contract unchanged.
  const safeEmail = typeof payload.email === "string" && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(payload.email) ? payload.email.trim() : null;
  const safePhone = payload.phone && /^[+()\d\s.-]{7,40}$/.test(payload.phone) ? payload.phone : null;
  return { subject, text, html, leadName: name, safeEmail, safePhone, visualTemplate: selectLeadAlertVisualTemplate(payload, score) };
}
