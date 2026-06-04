import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin/auth";
import { scoreSellerOffer } from "@/lib/engines/seller-offer-intelligence";
import { trackEventNoWait } from "@/lib/analytics/ledger";
import {
  timelineBucketFromMonths,
  type PropertyCondition,
  type OccupancyStatus,
} from "@/lib/leads/lead-types";

const NO_STORE = { "Cache-Control": "no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Generate a deterministic seller-offer review for a cash-offer /
 * seller lead. Returns score + grade + reasons + route + next best
 * action + suggested script + missing-data checklist + compliance
 * reminders. Persisted into `generated_assets` when Supabase is
 * configured so the admin UI can show it.
 *
 * NEVER produces customer-facing language containing "guaranteed",
 * "instant cash offer", "binding offer" — the engine enforces that.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = checkAdminAuth(req);
  if (!auth.ok)
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status, headers: NO_STORE }
    );
  const { id } = await params;
  if (!UUID.test(id))
    return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400, headers: NO_STORE });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    // Mock mode: run engine against a synthetic signal set so the admin UI
    // can still display the panel in dev.
    const assessment = scoreSellerOffer({
      timeline: "0_30_days",
      condition: "needs_repairs",
      occupancy: "vacant",
      hasAddress: true,
      hasMotivation: false,
      hasMortgagePayoff: false,
      hasAskingPrice: false,
    });
    return NextResponse.json(
      { ok: true, note: "mock_mode", assessment },
      { headers: NO_STORE }
    );
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createAdminClient() as any;

  const { data: lead } = await client
    .from("leads")
    .select(
      "address_raw, address_line1, timeline_months, property_condition, occupancy_status, seller_motivation, mortgage_payoff, asking_price, spam_score"
    )
    .eq("id", id)
    .maybeSingle();
  if (!lead) {
    return NextResponse.json(
      { ok: false, error: "lead_not_found" },
      { status: 404, headers: NO_STORE }
    );
  }

  const assessment = scoreSellerOffer({
    timeline: timelineBucketFromMonths(
      typeof lead.timeline_months === "number" ? lead.timeline_months : null
    ),
    condition: (lead.property_condition as PropertyCondition | null) ?? null,
    occupancy: (lead.occupancy_status as OccupancyStatus | null) ?? null,
    hasAddress: !!(lead.address_raw || lead.address_line1),
    hasMotivation: !!lead.seller_motivation,
    motivationText: (lead.seller_motivation as string | null) ?? null,
    hasMortgagePayoff: !!lead.mortgage_payoff,
    hasAskingPrice: !!lead.asking_price,
    spamScore: (lead.spam_score as number | null) ?? 0,
  });

  // Persist into generated_assets so the admin detail panel can show it.
  await client.from("generated_assets").insert({
    lead_id: id,
    channel: "call_script",
    body: assessment.suggestedScript,
    source_fields: {
      route: assessment.route,
      grade: assessment.grade,
      score: assessment.score,
      reasons: assessment.reasons,
      missingData: assessment.missingData,
      complianceNotes: assessment.complianceNotes,
      nextBestAction: assessment.nextBestAction,
    },
    provider: "deterministic_template",
    approved: false,
  });

  trackEventNoWait({
    eventName: "marketing_asset_generated",
    leadId: id,
    properties: {
      kind: "seller_offer_review",
      route: assessment.route,
      grade: assessment.grade,
    },
  });

  return NextResponse.json(
    { ok: true, assessment },
    { headers: NO_STORE }
  );
}
