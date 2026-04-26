import { NextResponse } from "next/server";
import { createStripeCheckoutSession } from "@/lib/billing";

export async function POST(request: Request) {
  const { tenantSlug } = await request.json();
  if (!tenantSlug) return NextResponse.json({ error: "tenantSlug required" }, { status: 400 });

  const session = await createStripeCheckoutSession({
    tenantSlug,
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`,
    cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/onboarding`,
  });

  return NextResponse.json(session);
}
