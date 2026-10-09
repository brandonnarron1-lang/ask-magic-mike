import type { LeadAlertRenderInput } from "./leadAlertTemplates";
import { selectLeadAlertVisualTemplate, shouldRenderLeadAlertVisual, visualAssetUrl } from "./leadAlertVisualTemplates";
import { leadReceivedLabel, leadSourceLabel, leadTimelineLabel } from "./leadReadability";

function clean(value: string | undefined, fallback: string, limit = 160) {
  return Array.from(value?.trim() || fallback).map(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 ? " " : character).join("").slice(0, limit);
}
function escape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/** v4 is a separate immutable delivery version, not a rewrite of queued v3. */
export function renderReadableLeadAlert(input: LeadAlertRenderInput, mode: "delivery" | "design_preview" = "delivery") {
  const { payload, score, routing } = input;
  const preview = mode === "design_preview";
  const isTest = payload.is_test === true || preview;
  const visual = selectLeadAlertVisualTemplate(preview ? { is_test: false } : payload, score);
  const intent = clean(routing.intentLabel, "General question", 60);
  const source = clean(leadSourceLabel(routing.sourceLabel), "Source not recorded", 100);
  const name = clean(payload.name || [payload.first_name, payload.last_name].filter(Boolean).join(" "), "Name not recorded");
  const location = clean(payload.city || payload.target_geography, "Area not recorded", 80);
  const urgency = score.score >= 80 ? "High priority" : score.score >= 60 ? "Active" : "New inquiry";
  const subject = `${isTest ? "[TEST] " : ""}Ask Magic Mike | ${intent} | ${source}`.slice(0, 150);
  const canonicalId = input.duplicateOfLeadId || input.leadId;
  const base = "https://www.askmagicmike.com";
  const leadUrl = `${base}/admin/leads/${encodeURIComponent(canonicalId)}`;
  const recordStatus = preview ? "INTERNAL DESIGN PREVIEW — NO LEAD EXISTS" : isTest ? "QA TEST — DO NOT CONTACT" : urgency;
  const safeEmail = typeof payload.email === "string" && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(payload.email) ? payload.email.trim() : null;
  const safePhone = payload.phone && /^[+()\d\s.-]{7,40}$/.test(payload.phone) ? payload.phone : null;
  const notice = preview ? "No action. This is a read-only synthetic template preview."
    : isTest ? "Walkthrough only — no contact, task changes or appointment confirmations."
      : "Open the lead, review permission, then make a personal follow-up.";
  const rows = [
    ["Request", intent], ["Name", name], ["Area", location],
    ["Source", source], ["Timeframe", leadTimelineLabel(payload.timeline)],
    ["Review owner", routing.owner === "mike" ? "Mike / approved Lead Center team" : "Unassigned — owner review required"],
    ["Received", leadReceivedLabel(input.submittedAt)],
    ["Review priority", isTest ? `Test only · ${score.score}/100` : `${urgency} · ${score.score}/100`],
  ];
  const repeat = input.duplicateOfLeadId ? "This inquiry is linked to an earlier saved lead. The button opens that main record; this email describes the newer inquiry, not a new assignment." : "";
  const steps = [
    "Open the lead. Sign in with your own account if asked.",
    isTest || preview ? "Read the overview; test contacts must not be contacted." : "Read the request. Use Review & call or Review & email only when permission allows.",
    isTest || preview ? "Review tasks, appointments and history without changing them." : "After follow-up, log the actual result and set your next task. A requested appointment is not a confirmed booking.",
  ];
  const text = ["Ask Magic Mike · Our Town Properties, Inc.", recordStatus, "", ...rows.map(([key, value]) => `${key}: ${value}`), "", notice, ...(repeat ? [repeat] : []), "", "YOUR THREE-STEP WALKTHROUGH", ...steps.map((step, index) => `${index + 1}. ${step}`), "", `Open saved lead: ${leadUrl}`, `Start your day: ${base}/admin/today`, "", "Contact details, score explanation and technical delivery evidence stay in the authenticated Lead Center. No consumer acknowledgment, SMS or nurture is requested by this email.", "Not a survey."].join("\n");
  const header = shouldRenderLeadAlertVisual()
    ? `<table role="presentation" width="100%" style="table-layout:fixed"><tr><td><img src="${escape(visualAssetUrl("/images/ask-magic-mike/our-town-properties-logo.webp"))}" width="136" alt="Our Town Properties, Inc." style="display:block;width:136px;max-width:100%;height:auto"/></td><td width="90" align="right"><img src="${escape(visualAssetUrl("/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-256.webp"))}" width="80" alt="Mike Eatmon, Broker and REALTOR" style="display:block;width:80px;height:80px;border-radius:50%"/></td></tr></table>` : "";
  const facts = rows.filter(([label]) => ["Name", "Area", "Timeframe"].includes(label));
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;padding:0;background:#090909;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:12px 8px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;table-layout:fixed;border:1px solid #d9af52"><tr><td style="padding:16px;background:#090909;color:#f5ead1;overflow-wrap:anywhere">${header}<p style="margin:12px 0 6px;font-size:14px;color:#d9af52">ASK MAGIC MIKE · LEAD CENTER</p><h1 style="margin:0;font-size:24px;line-height:1.3">${escape(intent)}</h1><p style="margin:8px 0 0;font-size:14px;font-weight:bold;color:#f5ead1">${escape(recordStatus)}</p></td></tr><tr><td style="padding:16px;background:#f5ead1;color:#171715;font-size:16px;line-height:1.5;overflow-wrap:anywhere">${facts.map(([label, value]) => `<p style="margin:0 0 8px"><strong>${escape(label)}:</strong> ${escape(value)}</p>`).join("")}<p style="margin:16px 0"><a href="${escape(leadUrl)}" style="display:block;padding:14px 16px;background:#d9af52;color:#090909;text-align:center;font-weight:bold;text-decoration:none;border:1px solid #745512">Open saved lead</a></p><p style="margin:0 0 12px">${escape(notice)}</p><p style="margin:0 0 6px;font-size:14px"><strong>Source:</strong> ${escape(source)}<br/><strong>Review owner:</strong> ${escape(rows[5][1])}<br/>${escape(leadReceivedLabel(input.submittedAt))}</p>${repeat ? `<p style="padding:8px;border-left:3px solid #8a681b;font-size:14px">${escape(repeat)}</p>` : ""}<h2 style="margin:20px 0 8px;font-size:18px">Your three-step walkthrough</h2>${steps.map((step, index) => `<p style="margin:0 0 8px;font-size:14px"><strong>${index + 1}.</strong> ${escape(step)}</p>`).join("")}<p style="margin:12px 0;font-size:14px"><a href="${base}/admin/today" style="color:#514014;font-weight:bold">Start your day in Lead Center</a></p><p style="margin:16px 0 0;font-size:12px">Contact and technical details remain in Lead Center. No consumer acknowledgment, SMS or nurture is requested by this email. Our Town Properties, Inc. · Not a survey.</p></td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html, leadName: name, safeEmail, safePhone, visualTemplate: visual };
}
