import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { checkBearerSecret } from "@/lib/admin/auth";
import { messagingFeatureFlags } from "@/lib/messaging/feature-flags";
import { renderMessageTemplate } from "@/lib/messaging/template-registry";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET(request: NextRequest) {
  if (!checkBearerSecret(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  if (!messagingFeatureFlags().sequenceScheduler) {
    return NextResponse.json({ ok: true, processed: 0, disabled: true, delivery_mode: "mock_only" }, { headers: NO_STORE });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 503, headers: NO_STORE });
  }

  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql.query(
    `WITH candidate AS (
       SELECT msr.id
         FROM public.message_sequence_step_runs msr
         JOIN public.message_sequence_instances msi ON msi.id = msr.sequence_instance_id
         JOIN public.leads l ON l.id = msi.lead_id
        WHERE msi.status = 'test'
          AND l.is_test = true
          AND l.communication_suppressed = true
          AND (
            (msr.status = 'scheduled' AND msr.scheduled_at <= now())
            OR (msr.status = 'claimed' AND msr.updated_at <= now() - interval '5 minutes')
          )
          AND msr.attempt_count < 3
        ORDER BY msr.scheduled_at ASC, msr.step_index ASC
        LIMIT 1
        FOR UPDATE OF msr SKIP LOCKED
     )
     UPDATE public.message_sequence_step_runs msr
        SET status = 'claimed', attempt_count = attempt_count + 1, updated_at = now()
       FROM candidate,
            public.message_sequence_instances msi
      WHERE msr.id = candidate.id
        AND msi.id = msr.sequence_instance_id
     RETURNING msr.id, msr.sequence_instance_id, msr.template_id,
               msr.template_version, msr.step_index, msr.attempt_count,
               msr.channel, msr.purpose, msi.lead_id`,
  ) as Array<{
    id: string;
    sequence_instance_id: string;
    template_id: string;
    template_version: string;
    step_index: number;
    attempt_count: number;
    channel: string;
    purpose: string;
    lead_id: string;
  }>;
  const step = rows[0];
  if (!step) {
    return NextResponse.json({ ok: true, processed: 0, delivery_mode: "mock_only" }, { headers: NO_STORE });
  }

  const rendered = renderMessageTemplate(step.template_id, {});
  if (!rendered.ok) {
    await sql.query(
      `UPDATE public.message_sequence_step_runs
          SET status = CASE WHEN attempt_count >= 3 THEN 'failed' ELSE 'scheduled' END,
              scheduled_at = CASE WHEN attempt_count >= 3 THEN scheduled_at ELSE now() + interval '5 minutes' END,
              last_error_code = $1,
              updated_at = now()
        WHERE id = $2::uuid AND status = 'claimed'`,
      [rendered.error, step.id],
    );
    return NextResponse.json({ ok: false, processed: 1, error: rendered.error, delivery_mode: "mock_only" }, { status: 422, headers: NO_STORE });
  }

  const decisionKey = `phase7-test-sequence:${step.id}:${step.template_version}`;
  const decisionRows = await sql.query(
    `INSERT INTO public.communication_decisions
      (lead_id, channel, purpose, allowed, decision_code, explanation,
       is_test, actor, idempotency_key, metadata)
     VALUES ($1::uuid, $2, 'qa_test', true, 'allowed',
             'Suppressed Phase 7 test sequence rendered through the mock provider; no external message was sent.',
             true, 'phase7_sequence_mock', $3, $4::jsonb)
     ON CONFLICT (idempotency_key)
     DO UPDATE SET decided_at = public.communication_decisions.decided_at
     RETURNING id`,
    [step.lead_id, step.channel, decisionKey, JSON.stringify({
      template_id: step.template_id,
      template_version: step.template_version,
      sequence_instance_id: step.sequence_instance_id,
      external_delivery: false,
    })],
  ) as Array<{ id: string }>;
  const providerEventId = `phase7-sequence-mock:${step.id}`;

  await sql.query(
    `UPDATE public.message_sequence_step_runs
        SET status = 'delivered', rendered_content_hash = $1,
            permission_decision_id = $2::uuid, last_error_code = NULL, updated_at = now()
      WHERE id = $3::uuid AND status = 'claimed'`,
    [rendered.contentHash, decisionRows[0]?.id || null, step.id],
  );
  await sql.query(
    `INSERT INTO public.communication_events
      (lead_id, provider_event_id, event_type, channel, occurred_at, metadata)
     VALUES ($1::uuid, $2, 'mock_delivered', $3, now(), $4::jsonb)
     ON CONFLICT (provider_event_id) WHERE provider_event_id IS NOT NULL DO NOTHING`,
    [step.lead_id, providerEventId, step.channel, JSON.stringify({
      sequence_instance_id: step.sequence_instance_id,
      step_id: step.id,
      template_id: step.template_id,
      template_version: step.template_version,
      content_hash: rendered.contentHash,
      external_delivery: false,
    })],
  );
  await sql.query(
    `UPDATE public.message_sequence_instances msi
        SET status = 'completed', stopped_at = now(), stop_reason = 'test_sequence_complete',
            last_transition_at = now(), last_transition_by = 'phase7_sequence_mock', updated_at = now()
      WHERE msi.id = $1::uuid AND msi.status = 'test'
        AND NOT EXISTS (
          SELECT 1 FROM public.message_sequence_step_runs remaining
           WHERE remaining.sequence_instance_id = msi.id
             AND remaining.status NOT IN ('delivered', 'skipped', 'cancelled', 'blocked')
        )`,
    [step.sequence_instance_id],
  );

  return NextResponse.json({
    ok: true,
    processed: 1,
    delivery_mode: "mock_only",
    externally_delivered: false,
    step_id: step.id,
    sequence_instance_id: step.sequence_instance_id,
    template_id: step.template_id,
    content_hash: rendered.contentHash,
  }, { headers: NO_STORE });
}
