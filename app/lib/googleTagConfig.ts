export const OUR_TOWN_GTM_CONTAINER_ID = "GTM-KZMCSLTJ";

export function isApprovedOurTownGtmContainerId(value: unknown): value is string {
  return typeof value === "string" && value.trim() === OUR_TOWN_GTM_CONTAINER_ID;
}

type PublicRuntimeEnvironment = {
  VERCEL_ENV?: string;
  NEXT_PUBLIC_GTM_CONTAINER_ID?: string;
};

/**
 * External analytics is deliberately fail-closed:
 *
 * - Preview and local builds never receive the Production container.
 * - A mistyped or unrelated container is rejected instead of silently mixing
 *   independent systems' data.
 * - The identifier is public configuration, not a secret.
 */
export function resolveProductionGtmContainerId(
  environment: PublicRuntimeEnvironment,
) {
  if (environment.VERCEL_ENV !== "production") return null;
  const configured = environment.NEXT_PUBLIC_GTM_CONTAINER_ID?.trim();
  return isApprovedOurTownGtmContainerId(configured) ? configured : null;
}
