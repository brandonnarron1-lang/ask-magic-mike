/**
 * CommunicationsEngine
 *
 * Orchestrates SMS/email send paths with consent enforcement. Knows
 * nothing about who Mike is — it only knows the recipient consent state,
 * the template, and the adapter.
 *
 * Key contracts:
 *   - Marketing templates require explicit consent on the matching channel.
 *   - Transactional (`isMarketing=false`) messages still respect global
 *     opt-out (`do_not_contact` compliance flag).
 *   - Every send produces an analytics event.
 */
import { trackEventNoWait } from "@/lib/analytics/ledger";
import type { SmsAdapter, SmsSendResult } from "@/lib/adapters/sms-types";
import type {
  EmailAdapter,
  EmailSendResult,
} from "@/lib/adapters/email-types";
import { createMockSmsAdapter } from "@/lib/adapters/sms-mock";
import { createTwilioSmsAdapter } from "@/lib/adapters/sms-twilio";
import { createMockEmailAdapter } from "@/lib/adapters/email-mock";
import {
  SMS_TEMPLATES,
  EMAIL_TEMPLATES,
  type SmsTemplate,
  type EmailTemplate,
} from "./communications-templates";

export interface ConsentState {
  sms?:   boolean;
  email?: boolean;
  call?:  boolean;
  /** Global do-not-contact flag (overrides everything). */
  doNotContact?: boolean;
}

export interface SendSmsArgs {
  to: string;
  templateSlug: keyof typeof SMS_TEMPLATES;
  vars?: Record<string, string>;
  consent: ConsentState;
  leadId?: string;
  /** Override marketing classification (rare). */
  overrideMarketing?: boolean;
}

export interface SendEmailArgs {
  to: string;
  templateSlug: keyof typeof EMAIL_TEMPLATES;
  vars?: Record<string, string>;
  consent: ConsentState;
  leadId?: string;
  overrideMarketing?: boolean;
}

export type CommsSendResult =
  | { ok: true; provider: string; providerMessageId: string | null; templateSlug: string }
  | { ok: false; reason: string; templateSlug: string };

export class CommunicationsEngine {
  constructor(
    private readonly sms: SmsAdapter = pickSmsAdapter(),
    private readonly email: EmailAdapter = pickEmailAdapter(),
  ) {}

  async sendSms(args: SendSmsArgs): Promise<CommsSendResult> {
    const template: SmsTemplate | undefined = SMS_TEMPLATES[args.templateSlug];
    if (!template) {
      return { ok: false, reason: "unknown_template", templateSlug: args.templateSlug };
    }
    const consentReason = checkConsent(template.isMarketing || !!args.overrideMarketing, args.consent.sms, args.consent.doNotContact);
    if (consentReason) {
      trackEventNoWait({
        eventName: "sms_failed",
        leadId: args.leadId,
        properties: {
          templateSlug: template.slug,
          reason: consentReason,
        },
      });
      return { ok: false, reason: consentReason, templateSlug: template.slug };
    }
    const body = template.body(args.vars ?? {});
    const result: SmsSendResult = await this.sms.send({
      to: args.to,
      body,
      metadata: { templateSlug: template.slug, leadId: args.leadId },
    });
    const ok = result.status !== "failed" && result.status !== "skipped";
    trackEventNoWait({
      eventName: ok ? "sms_sent" : "sms_failed",
      leadId: args.leadId,
      properties: {
        templateSlug: template.slug,
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        status: result.status,
        reason: result.reason,
      },
    });
    if (!ok) {
      return { ok: false, reason: result.reason ?? "send_failed", templateSlug: template.slug };
    }
    return {
      ok: true,
      provider: result.provider,
      providerMessageId: result.providerMessageId,
      templateSlug: template.slug,
    };
  }

  async sendEmail(args: SendEmailArgs): Promise<CommsSendResult> {
    const template: EmailTemplate | undefined = EMAIL_TEMPLATES[args.templateSlug];
    if (!template) {
      return { ok: false, reason: "unknown_template", templateSlug: args.templateSlug };
    }
    const consentReason = checkConsent(template.isMarketing || !!args.overrideMarketing, args.consent.email, args.consent.doNotContact);
    if (consentReason) {
      trackEventNoWait({
        eventName: "email_sent",   // logged but with a failure reason
        leadId: args.leadId,
        properties: {
          templateSlug: template.slug,
          reason: consentReason,
          status: "skipped_no_consent",
        },
      });
      return { ok: false, reason: consentReason, templateSlug: template.slug };
    }
    const rendered = template.render(args.vars ?? {});
    const result: EmailSendResult = await this.email.send({
      to: args.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      from: process.env.FROM_EMAIL,
      metadata: { templateSlug: template.slug, leadId: args.leadId },
    });
    const ok = result.status !== "failed" && result.status !== "skipped";
    trackEventNoWait({
      eventName: "email_sent",
      leadId: args.leadId,
      properties: {
        templateSlug: template.slug,
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        status: result.status,
        reason: result.reason,
      },
    });
    if (!ok) {
      return { ok: false, reason: result.reason ?? "send_failed", templateSlug: template.slug };
    }
    return {
      ok: true,
      provider: result.provider,
      providerMessageId: result.providerMessageId,
      templateSlug: template.slug,
    };
  }
}

function checkConsent(
  isMarketing: boolean,
  channelConsent: boolean | undefined,
  doNotContact: boolean | undefined
): string | null {
  if (doNotContact) return "do_not_contact";
  if (isMarketing && !channelConsent) return "no_marketing_consent";
  // Transactional sends are allowed unless do_not_contact is set.
  return null;
}

function pickSmsAdapter(): SmsAdapter {
  if (process.env.SMS_PROVIDER === "twilio") return createTwilioSmsAdapter();
  return createMockSmsAdapter();
}

function pickEmailAdapter(): EmailAdapter {
  // Future: route on EMAIL_PROVIDER. Mock for now.
  return createMockEmailAdapter();
}
