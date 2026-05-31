import type { AVMProvider } from "./provider-interface";
import { MockAVMProvider } from "./mock-provider";

export function getAVMProvider(): AVMProvider {
  // Future: check ATTOM_API_KEY, HOUSECANARY_API_KEY, etc.
  return new MockAVMProvider();
}

export type { AVMProvider, AVMInput, AVMResult } from "./provider-interface";
export { MockAVMProvider } from "./mock-provider";
export { DISCLAIMER_V1, DISCLAIMER_VERSION, getDisclaimer } from "./disclaimer";
