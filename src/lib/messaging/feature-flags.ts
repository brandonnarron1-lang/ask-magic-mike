function enabled(name: string, fallback = false) {
  const raw = process.env[name];
  return raw == null ? fallback : raw.toLowerCase() === "true";
}

export function messagingFeatureFlags() {
  return {
    internalAlert: enabled("AGENT_NOTIFICATIONS_ENABLED"),
    qaEmail: enabled("QA_EMAIL_ENABLED"),
    qaRecipientOverride: enabled("QA_TEST_RECIPIENT_OVERRIDE_ENABLED"),
    consumerAcknowledgment: enabled("CONSUMER_ACKNOWLEDGMENT_ENABLED"),
    consumerFollowupEmail: enabled("CONSUMER_FOLLOWUP_EMAIL_ENABLED"),
    consumerSms: enabled("CONSUMER_SMS_ENABLED"),
    aiPersonalizationPreview: enabled("AI_PERSONALIZATION_PREVIEW_ENABLED"),
    sequenceScheduler: enabled("MESSAGE_SEQUENCE_SCHEDULER_ENABLED"),
    autoSend: enabled("MESSAGE_AUTO_SEND_ENABLED"),
    humanApprovalRequired: enabled("MESSAGE_HUMAN_APPROVAL_REQUIRED", true),
    messagePreview: enabled("MESSAGE_PREVIEW_ENABLED", true),
    providerWebhook: enabled("RESEND_WEBHOOK_ENABLED"),
    aiAutomaticAction: enabled("AI_AUTOMATIC_ACTION_ENABLED"),
  } as const;
}

export function approvedQaRecipientConfigured() {
  const recipient = (process.env.QA_EMAIL_RECIPIENT || "").trim().toLowerCase();
  const allowed = (process.env.QA_EMAIL_ALLOWED_RECIPIENTS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(recipient && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient) && allowed.includes(recipient));
}
