import { NextResponse } from "next/server";
import { experienceContract } from "../../../lib/experienceContract";

/** Public contract only: never reads a session, customer record or configuration. */
export function GET() {
  return NextResponse.json(experienceContract, {
    headers: { "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" },
  });
}
