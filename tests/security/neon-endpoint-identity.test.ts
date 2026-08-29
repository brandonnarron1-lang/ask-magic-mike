import { describe, expect, it } from "vitest";
import {
  computeNeonEndpointAttestation,
  extractNeonEndpointId,
} from "@/lib/security/neon-endpoint-identity";

const PREVIEW_ENDPOINT = "ep-amm-preview-qa123456";
const PRODUCTION_ENDPOINT = "ep-amm-production-qa654321";

describe("Neon endpoint identity", () => {
  it("extracts the endpoint ID from direct and pooled Neon URLs", () => {
    expect(
      extractNeonEndpointId(
        `postgresql://synthetic@${PREVIEW_ENDPOINT}.us-east-2.aws.neon.tech/neondb?sslmode=require`,
      ),
    ).toBe(PREVIEW_ENDPOINT);
    expect(
      extractNeonEndpointId(
        `postgres://${PREVIEW_ENDPOINT}-pooler.c-2.us-east-1.aws.neon.tech/neondb`,
      ),
    ).toBe(PREVIEW_ENDPOINT);
  });

  it("rejects non-Neon, non-Postgres, malformed, and forged hostnames", () => {
    expect(extractNeonEndpointId("https://example.com/database")).toBeNull();
    expect(
      extractNeonEndpointId(
        `postgresql://${PREVIEW_ENDPOINT}.neon.tech.example.com/neondb`,
      ),
    ).toBeNull();
    expect(
      extractNeonEndpointId("postgresql://ep-invalid.neon.tech/neondb"),
    ).toBeNull();
    expect(extractNeonEndpointId("not a URL")).toBeNull();
  });

  it("confirms only a distinct, exact Preview endpoint match", () => {
    const attestation = computeNeonEndpointAttestation({
      DATABASE_URL: `postgresql://${PREVIEW_ENDPOINT}-pooler.c-2.us-east-1.aws.neon.tech/neondb`,
      PREVIEW_NEON_ENDPOINT_ID: PREVIEW_ENDPOINT,
      PRODUCTION_NEON_ENDPOINT_ID: PRODUCTION_ENDPOINT,
    });

    expect(attestation).toEqual({
      preview_endpoint_id_configured: true,
      production_endpoint_id_configured: true,
      endpoint_identity_configured: true,
      endpoint_ids_distinct: true,
      database_neon_endpoint_resolved: true,
      preview_endpoint_match: true,
      production_endpoint_match: false,
      preview_endpoint_identity_confirmed: true,
    });
    expect(JSON.stringify(attestation)).not.toContain(PREVIEW_ENDPOINT);
    expect(JSON.stringify(attestation)).not.toContain("DATABASE_URL");
  });

  it("fails closed when expected endpoint IDs are equal", () => {
    const attestation = computeNeonEndpointAttestation({
      DATABASE_URL: `postgresql://${PREVIEW_ENDPOINT}.us-east-2.aws.neon.tech/neondb`,
      PREVIEW_NEON_ENDPOINT_ID: PREVIEW_ENDPOINT,
      PRODUCTION_NEON_ENDPOINT_ID: PREVIEW_ENDPOINT,
    });

    expect(attestation.endpoint_ids_distinct).toBe(false);
    expect(attestation.production_endpoint_match).toBe(true);
    expect(attestation.preview_endpoint_identity_confirmed).toBe(false);
  });
});
