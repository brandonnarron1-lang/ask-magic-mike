import { NextRequest, NextResponse } from "next/server";
import { ComputeScoreRequestSchema } from "@/schemas/scoring.schema";
import { computeScore } from "@/lib/scoring";
import { trackEventNoWait } from "@/lib/analytics/ledger";
import type { ScoringInput } from "@/types/domain.types";
import type { Json } from "@/types/database.types";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ComputeScoreRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { leadId } = parsed.data;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const client = createAdminClient();

  const { data: lead, error } = await client
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const scoringInput: ScoringInput = {
    primaryIntent: lead.primary_intent as ScoringInput["primaryIntent"],
    timelineMonths: lead.timeline_months as ScoringInput["timelineMonths"],
    questionRaw: lead.question_raw,
    hasEmail: !!lead.email,
    hasPhone: !!lead.phone,
    hasAddress: !!(lead.address_raw || lead.address_line1),
    hasName: !!(lead.first_name || lead.last_name),
    consentSms: lead.consent_sms,
    consentCall: lead.consent_call,
    consentEmail: lead.consent_email,
    ctaChipUsed: lead.cta_chip_used as ScoringInput["ctaChipUsed"],
    utmSource: null,
    utmMedium: null,
  };

  const score = computeScore(scoringInput);

  await client.from("lead_scores").upsert(
    {
      lead_id: leadId,
      seller_certainty_score: score.sellerCertaintyScore,
      buyer_certainty_score: score.buyerCertaintyScore,
      composite_score: score.compositeScore,
      temperature: score.temperature,
      factor_log: score.factorLog as unknown as Json,
      scorer_version: score.scorerVersion,
    },
    { onConflict: "lead_id" }
  );

  trackEventNoWait({
    eventName: "lead_scored",
    leadId,
    properties: {
      sellerScore: score.sellerCertaintyScore,
      buyerScore: score.buyerCertaintyScore,
      compositeScore: score.compositeScore,
      temperature: score.temperature,
      rescore: true,
    },
  });

  return NextResponse.json({ leadId, score });
}
