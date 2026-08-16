import { MESSAGE_TEMPLATE_REGISTRY } from "../src/lib/messaging/template-registry";

export const CALL_SCRIPTS = MESSAGE_TEMPLATE_REGISTRY.filter(
  (template) => template.channel === "call",
);
