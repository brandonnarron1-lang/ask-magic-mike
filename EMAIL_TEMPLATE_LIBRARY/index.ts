import {
  MESSAGE_TEMPLATE_REGISTRY,
  renderBrandedEmail,
  renderMessageTemplate,
} from "../src/lib/messaging/template-registry";

export const EMAIL_TEMPLATES = MESSAGE_TEMPLATE_REGISTRY.filter(
  (template) => template.channel === "email",
);

export { renderBrandedEmail, renderMessageTemplate };
