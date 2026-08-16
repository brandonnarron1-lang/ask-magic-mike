import { MESSAGE_TEMPLATE_REGISTRY } from "../src/lib/messaging/template-registry";

export const PUSH_TEMPLATES = MESSAGE_TEMPLATE_REGISTRY.filter(
  (template) => template.channel === "push",
);
