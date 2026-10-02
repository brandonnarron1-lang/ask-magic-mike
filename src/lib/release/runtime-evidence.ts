export function releaseRuntimeHeaders(): Record<string, string> {
  const commit = (process.env.VERCEL_GIT_COMMIT_SHA || "unavailable").trim();
  const deploymentUrl = (process.env.VERCEL_URL || "unavailable").trim();
  const target = (
    process.env.VERCEL_TARGET_ENV
    || process.env.VERCEL_ENV
    || "unknown"
  ).trim();
  return {
    "X-AMM-Release-Commit": commit,
    "X-AMM-Release-URL": deploymentUrl,
    "X-AMM-Release-Target": target,
  };
}
