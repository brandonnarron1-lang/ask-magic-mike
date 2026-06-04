/**
 * Default SMS + email templates.
 *
 * SMS templates are the six the brief calls out (new buyer/listing,
 * seller-cash-offer, agent assigned, appointment reminder, listing
 * inquiry, after-hours). Each carries `is_marketing` so the consent
 * gate can apply different rules.
 *
 * Email templates ship as a render function that returns subject + html
 * + text. HTML is intentionally minimal — no third-party CSS framework.
 */

export interface SmsTemplate {
  slug: string;
  body: (vars: Record<string, string>) => string;
  variables: string[];
  isMarketing: boolean;
}

const BRAND_FOOTER_SMS = "Reply STOP to opt out.";

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/{{(\w+)}}/g, (_, k: string) => vars[k] ?? "");
}

export const SMS_TEMPLATES: Record<string, SmsTemplate> = {
  buyer_listing_confirmation: {
    slug: "buyer_listing_confirmation",
    body: (v) =>
      interpolate(
        `Ask Magic Mike: Thanks for reaching out. I got your request and someone from Our Town Properties will follow up shortly. ${BRAND_FOOTER_SMS}`,
        v
      ),
    variables: [],
    isMarketing: false,
  },
  seller_cash_offer_confirmation: {
    slug: "seller_cash_offer_confirmation",
    body: (v) =>
      interpolate(
        `Our Town Properties: Thanks for sending your property info. We'll review it and follow up about your selling options. ${BRAND_FOOTER_SMS}`,
        v
      ),
    variables: [],
    isMarketing: false,
  },
  agent_assigned_intro: {
    slug: "agent_assigned_intro",
    body: (v) =>
      interpolate(
        `Ask Magic Mike: I'm connecting you with {{agent_name}} from Our Town Properties. They'll help with {{lead_intent}}. ${BRAND_FOOTER_SMS}`,
        v
      ),
    variables: ["agent_name", "lead_intent"],
    isMarketing: false,
  },
  appointment_reminder: {
    slug: "appointment_reminder",
    body: (v) =>
      interpolate(
        `Our Town Properties reminder: your appointment is {{appointment_time}}. Reply here if anything changes. ${BRAND_FOOTER_SMS}`,
        v
      ),
    variables: ["appointment_time"],
    isMarketing: false,
  },
  listing_inquiry: {
    slug: "listing_inquiry",
    body: (v) =>
      interpolate(
        `Ask Magic Mike: Got your question about {{listing_address}}. Want details, a showing, or similar homes? ${BRAND_FOOTER_SMS}`,
        v
      ),
    variables: ["listing_address"],
    isMarketing: false,
  },
  after_hours_auto: {
    slug: "after_hours_auto",
    body: (v) =>
      interpolate(
        `Ask Magic Mike: Got it. It's after hours, but your request is logged and prioritized. For urgent property questions, reply here. ${BRAND_FOOTER_SMS}`,
        v
      ),
    variables: [],
    isMarketing: false,
  },
};

export interface EmailTemplate {
  slug: string;
  isMarketing: boolean;
  render: (vars: Record<string, string>) => {
    subject: string;
    html: string;
    text: string;
  };
}

const SAFE_EMAIL_FOOTER = (vars: Record<string, string>) =>
  `Our Town Properties, Inc. · Wilson, NC · ${vars.unsubscribe_url ? `Unsubscribe: ${vars.unsubscribe_url}` : "Reply with UNSUBSCRIBE to opt out."}`;

export const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  new_lead_confirmation: {
    slug: "new_lead_confirmation",
    isMarketing: false,
    render: (v) => ({
      subject: "Your Ask Magic Mike request — Our Town Properties",
      text:
        `Hi ${v.first_name || "there"},\n\n` +
        `Thanks for reaching out. Mike Eatmon or a member of the Our Town Properties team will follow up with local guidance based on what you shared. ` +
        `Preliminary home value range only — not an appraisal.\n\n` +
        `${SAFE_EMAIL_FOOTER(v)}`,
      html:
        `<p>Hi ${v.first_name || "there"},</p>` +
        `<p>Thanks for reaching out. Mike Eatmon or a member of the Our Town Properties team will follow up with local guidance based on what you shared. Preliminary home value range only — not an appraisal.</p>` +
        `<p style="color:#888;font-size:12px;">${SAFE_EMAIL_FOOTER(v)}</p>`,
    }),
  },
  seller_cash_offer_next_steps: {
    slug: "seller_cash_offer_next_steps",
    isMarketing: false,
    render: (v) => ({
      subject: "Next steps on your property review — Our Town Properties",
      text:
        `Hi ${v.first_name || "there"},\n\n` +
        `Thanks for sharing your property details. Mike Eatmon's team is reviewing them now. ` +
        `We'll follow up with practical selling options. Subject to review — not an instant offer.\n\n` +
        `${SAFE_EMAIL_FOOTER(v)}`,
      html:
        `<p>Hi ${v.first_name || "there"},</p>` +
        `<p>Thanks for sharing your property details. Mike Eatmon's team is reviewing them now. We'll follow up with practical selling options. Subject to review — not an instant offer.</p>` +
        `<p style="color:#888;font-size:12px;">${SAFE_EMAIL_FOOTER(v)}</p>`,
    }),
  },
  listing_inquiry_followup: {
    slug: "listing_inquiry_followup",
    isMarketing: false,
    render: (v) => ({
      subject: `Question about ${v.listing_address || "a listing"} — Our Town Properties`,
      text:
        `Hi ${v.first_name || "there"},\n\n` +
        `Thanks for asking about ${v.listing_address || "the listing"}. ` +
        `Our Town Properties can send full details, schedule a showing, or share similar homes.\n\n` +
        `${SAFE_EMAIL_FOOTER(v)}`,
      html:
        `<p>Hi ${v.first_name || "there"},</p>` +
        `<p>Thanks for asking about ${v.listing_address || "the listing"}. Our Town Properties can send full details, schedule a showing, or share similar homes.</p>` +
        `<p style="color:#888;font-size:12px;">${SAFE_EMAIL_FOOTER(v)}</p>`,
    }),
  },
  agent_assigned_intro: {
    slug: "agent_assigned_intro",
    isMarketing: false,
    render: (v) => ({
      subject: `Your local contact — ${v.agent_name || "Mike Eatmon"}`,
      text:
        `Hi ${v.first_name || "there"},\n\n` +
        `${v.agent_name || "Mike Eatmon"} at Our Town Properties will be your contact for ${v.lead_intent || "this request"}.\n\n` +
        `${SAFE_EMAIL_FOOTER(v)}`,
      html:
        `<p>Hi ${v.first_name || "there"},</p>` +
        `<p>${v.agent_name || "Mike Eatmon"} at Our Town Properties will be your contact for ${v.lead_intent || "this request"}.</p>` +
        `<p style="color:#888;font-size:12px;">${SAFE_EMAIL_FOOTER(v)}</p>`,
    }),
  },
};
