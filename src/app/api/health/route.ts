import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  return NextResponse.json(
    { ok: true, service: "ask-magic-mike" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
