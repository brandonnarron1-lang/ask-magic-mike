import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Liveness probe — returns 200 if the process is running. No external checks. */
export async function GET() {
  return NextResponse.json({ ok: true, status: "live" });
}
