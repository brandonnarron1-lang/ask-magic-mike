import { MESSAGE_TEMPLATE_REGISTRY } from "../src/lib/messaging/template-registry";
import {
  classifyInboundSms,
  isWithinSmsSendWindow,
  smsFrequencyAllowed,
  smsSegmentCount,
} from "../src/lib/messaging/sms-policy";

export const SMS_TEMPLATES = MESSAGE_TEMPLATE_REGISTRY.filter(
  (template) => template.channel === "sms",
);

export {
  classifyInboundSms,
  isWithinSmsSendWindow,
  smsFrequencyAllowed,
  smsSegmentCount,
};
