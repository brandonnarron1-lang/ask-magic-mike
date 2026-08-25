import { computeNeonEndpointAttestation } from "../../../src/lib/security/neon-endpoint-identity";

export function productionGrowthDatabaseIdentityConfirmed(
  env: Record<string, string | undefined> = process.env,
) {
  const vercelEnvironment = (env.VERCEL_ENV ?? "").trim().toLowerCase();
  const databaseEnvironment = (env.DATABASE_ENV ?? "").trim().toLowerCase();
  const endpoint = computeNeonEndpointAttestation(env);
  return vercelEnvironment === "production" &&
    databaseEnvironment === "production" &&
    endpoint.endpoint_identity_configured &&
    endpoint.endpoint_ids_distinct &&
    endpoint.database_neon_endpoint_resolved &&
    endpoint.production_endpoint_match &&
    !endpoint.preview_endpoint_match;
}

export function growthDatabaseReadIdentityConfirmed(
  env: Record<string, string | undefined> = process.env,
) {
  const vercelEnvironment = (env.VERCEL_ENV ?? "").trim().toLowerCase();
  const databaseEnvironment = (env.DATABASE_ENV ?? "").trim().toLowerCase();
  const endpoint = computeNeonEndpointAttestation(env);
  const identityFoundation = endpoint.endpoint_identity_configured &&
    endpoint.endpoint_ids_distinct && endpoint.database_neon_endpoint_resolved;
  if (!identityFoundation || vercelEnvironment !== databaseEnvironment) return false;
  if (vercelEnvironment === "production") {
    return endpoint.production_endpoint_match && !endpoint.preview_endpoint_match;
  }
  if (vercelEnvironment === "preview") {
    return endpoint.preview_endpoint_match && !endpoint.production_endpoint_match;
  }
  return false;
}
