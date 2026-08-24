/**
 * Server-only Neon endpoint attestation.
 *
 * The connection URL and expected endpoint identifiers never leave this
 * module. Callers receive categorical booleans only so health responses can
 * prove the boundary without disclosing credentials or infrastructure IDs.
 */

export interface NeonEndpointAttestation {
  preview_endpoint_id_configured: boolean;
  production_endpoint_id_configured: boolean;
  endpoint_identity_configured: boolean;
  endpoint_ids_distinct: boolean;
  database_neon_endpoint_resolved: boolean;
  preview_endpoint_match: boolean;
  production_endpoint_match: boolean;
  preview_endpoint_identity_confirmed: boolean;
}

const NEON_HOST_SUFFIX = ".neon.tech";
const NEON_ENDPOINT_ID = /^ep-[a-z0-9]+(?:-[a-z0-9]+){2}$/;

function normalizeExpectedEndpointId(value: string | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  return NEON_ENDPOINT_ID.test(normalized) ? normalized : null;
}

export function extractNeonEndpointId(databaseUrl: string | undefined) {
  if (!databaseUrl) return null;

  try {
    const parsed = new URL(databaseUrl);
    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!hostname.endsWith(NEON_HOST_SUFFIX)) return null;

    const firstLabel = hostname.split(".", 1)[0];
    const endpointId = firstLabel.endsWith("-pooler")
      ? firstLabel.slice(0, -"-pooler".length)
      : firstLabel;

    return NEON_ENDPOINT_ID.test(endpointId) ? endpointId : null;
  } catch {
    return null;
  }
}

export function computeNeonEndpointAttestation(
  env: Record<string, string | undefined>,
): NeonEndpointAttestation {
  const actualEndpointId = extractNeonEndpointId(env.DATABASE_URL);
  const previewEndpointId = normalizeExpectedEndpointId(
    env.PREVIEW_NEON_ENDPOINT_ID,
  );
  const productionEndpointId = normalizeExpectedEndpointId(
    env.PRODUCTION_NEON_ENDPOINT_ID,
  );
  const endpointIdentityConfigured = Boolean(
    previewEndpointId && productionEndpointId,
  );
  const endpointIdsDistinct = Boolean(
    endpointIdentityConfigured && previewEndpointId !== productionEndpointId,
  );
  const previewEndpointMatch = Boolean(
    actualEndpointId &&
      previewEndpointId &&
      actualEndpointId === previewEndpointId,
  );
  const productionEndpointMatch = Boolean(
    actualEndpointId &&
      productionEndpointId &&
      actualEndpointId === productionEndpointId,
  );

  return {
    preview_endpoint_id_configured: Boolean(previewEndpointId),
    production_endpoint_id_configured: Boolean(productionEndpointId),
    endpoint_identity_configured: endpointIdentityConfigured,
    endpoint_ids_distinct: endpointIdsDistinct,
    database_neon_endpoint_resolved: Boolean(actualEndpointId),
    preview_endpoint_match: previewEndpointMatch,
    production_endpoint_match: productionEndpointMatch,
    preview_endpoint_identity_confirmed:
      endpointIdentityConfigured &&
      endpointIdsDistinct &&
      Boolean(actualEndpointId) &&
      previewEndpointMatch &&
      !productionEndpointMatch,
  };
}
