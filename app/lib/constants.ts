export const brand = {
  siteName: "Ask Magic Mike",
  brokerage: "Our Town Properties",
  cityLine: "Wilson, NC",
  licensedLine: "Licensed in North Carolina",
  domain: "askmagicmike.com",
  parentDomain: "ourtownproperties.com",
  calendlyUrl: "https://calendly.com/askmagicmike",
};

export const timelineOptions = [
  "ASAP",
  "30-60 days",
  "3-6 months",
  "Just planning",
];

export const conditionOptions = [
  "Move-in ready",
  "Needs light updates",
  "Needs major repairs",
  "Inherited or vacant",
  "I want to talk before repairs",
];

export const sellerPaths = [
  "I may sell",
  "I need options",
  "I inherited a property",
  "The home needs work",
  "I want to talk before repairs",
];

export const starterPrompts = [
  "What is my home worth?",
  "Should I sell now or wait?",
  "What are buyers looking for in Wilson?",
  "Can you help me compare neighborhoods?",
  "What should I do before listing?",
];

export const analyticsEvents = [
  "page_view",
  "hero_cta_click",
  "home_value_started",
  "address_submit",
  "email_submit",
  "phone_submit",
  "seller_form_submit",
  "widget_opened",
  "widget_closed",
  "widget_lead_started",
  "widget_lead_created",
  "chat_started",
  "chat_message_sent",
  "appointment_click",
  "lead_created",
] as const;
