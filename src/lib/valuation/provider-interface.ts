import type { ValuationComp } from "@/types/domain.types";

export interface AVMInput {
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  fipsCode?: string | null;
  parcelId?: string | null;
  beds?: number | null;
  baths?: number | null;
  sqft?: number | null;
  yearBuilt?: number | null;
}

export interface AVMResult {
  estimateLow: number;
  estimateMid: number;
  estimateHigh: number;
  confidencePct: number | null;
  comps: ValuationComp[];
  providerReportId: string | null;
  providerRaw: Record<string, unknown>;
}

export interface AVMProvider {
  readonly name: string;
  isConfigured(): boolean;
  getEstimate(input: AVMInput): Promise<AVMResult>;
}
