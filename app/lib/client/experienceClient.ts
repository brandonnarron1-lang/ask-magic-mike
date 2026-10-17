import { experienceContract, type ExperienceContract } from "../experienceContract";

/** Same-origin web transport, injectable for a supported native transport later. */
export async function readExperience(fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<ExperienceContract> {
  const response = await fetcher("/api/experience/v1", {
    method: "GET", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer",
    headers: { Accept: "application/json" }, signal,
  });
  if (!response.ok || !response.headers.get("content-type")?.startsWith("application/json")) throw new Error("experience_unavailable");
  const value: unknown = await response.json();
  // This version is a bundled immutable public contract. Reject incompatible or
  // unexpected fields, never let network config replace approved destinations.
  if (JSON.stringify(value) !== JSON.stringify(experienceContract)) throw new Error("experience_version_mismatch");
  return experienceContract;
}
