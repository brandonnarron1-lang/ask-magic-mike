import type { CRMAdapter } from "./types";
import { NullCRMAdapter } from "./null-adapter";
import { FollowUpBossAdapter } from "./follow-up-boss";
import { KvCoreAdapter } from "./kvcore";

export function getCRMAdapter(): CRMAdapter {
  if (process.env.FUB_API_KEY) {
    return new FollowUpBossAdapter();
  }
  if (process.env.KVCORE_API_KEY) {
    return new KvCoreAdapter();
  }
  return new NullCRMAdapter();
}

export type { CRMAdapter } from "./types";
export { NullCRMAdapter } from "./null-adapter";
export { FollowUpBossAdapter } from "./follow-up-boss";
export { KvCoreAdapter } from "./kvcore";
