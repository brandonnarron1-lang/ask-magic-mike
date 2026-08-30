import { type NextRequest, NextResponse } from "next/server";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import {
  isWordPressActivationPlacementKey,
  loadWordPressActivationChangeSet,
} from "../../../../../lib/growth/wordpress-activation-change-set";
import {
  loadWordPressSellerIntentDecisionManifest,
  WORDPRESS_SELLER_INTENT_DECISION_KEY,
} from "../../../../../lib/growth/wordpress-seller-intent-decision";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = {
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ placementKey: string }> },
) {
  const auth = await requireLeadCenterApiPermission(request, "report:view");
  if (!auth.ok) {
    for (const [name, value] of Object.entries(NO_STORE)) {
      auth.response.headers.set(name, value);
    }
    return auth.response;
  }

  const { placementKey } = await context.params;
  const isSellerIntentDecision = placementKey === WORDPRESS_SELLER_INTENT_DECISION_KEY;
  if (!isSellerIntentDecision && !isWordPressActivationPlacementKey(placementKey)) {
    return NextResponse.json(
      { ok: false, error: "wordpress_activation_placement_not_found" },
      { status: 404, headers: NO_STORE },
    );
  }

  const changeSet = isSellerIntentDecision
    ? await loadWordPressSellerIntentDecisionManifest()
    : await loadWordPressActivationChangeSet(placementKey);
  return NextResponse.json(changeSet, {
    status: 200,
    headers: {
      ...NO_STORE,
      "Content-Disposition": `attachment; filename="amm-${placementKey}-wordpress-change-set.json"`,
    },
  });
}
