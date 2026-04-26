import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Placeholder for Stripe signature verification and tenant subscription state updates.
  const payload = await request.text();
  return NextResponse.json({ received: true, length: payload.length });
}
