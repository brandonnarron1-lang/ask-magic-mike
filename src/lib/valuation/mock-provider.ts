import type { AVMProvider, AVMInput, AVMResult } from "./provider-interface";
import type { ValuationComp } from "@/types/domain.types";

// Deterministic price range by zip code prefix (for Gainesville, FL area)
// All values in cents
const ZIP_BASE_PRICES: Record<string, number> = {
  "326": 28000000, // Gainesville area (~$280k base)
  "327": 32000000, // North Central FL (~$320k base)
  "328": 25000000, // ~$250k
  "329": 22000000, // ~$220k
};
const DEFAULT_BASE = 27500000; // $275,000

function getBasePrice(zip: string): number {
  const prefix = zip.slice(0, 3);
  return ZIP_BASE_PRICES[prefix] ?? DEFAULT_BASE;
}

function buildStubComps(zip: string, midCents: number): ValuationComp[] {
  const variance = midCents * 0.08;
  return [
    {
      address: `1234 Sample Oak Dr, Gainesville, FL ${zip}`,
      salePrice: Math.round(midCents - variance * 0.5),
      saleDate: "2024-11-15",
      sqft: 1820,
      beds: 3,
      baths: 2,
      distanceMiles: 0.3,
    },
    {
      address: `5678 Magnolia Blvd, Gainesville, FL ${zip}`,
      salePrice: Math.round(midCents + variance * 0.2),
      saleDate: "2024-10-28",
      sqft: 1950,
      beds: 3,
      baths: 2.5,
      distanceMiles: 0.7,
    },
    {
      address: `9012 Palmetto Ave, Gainesville, FL ${zip}`,
      salePrice: Math.round(midCents + variance * 0.8),
      saleDate: "2024-12-03",
      sqft: 2100,
      beds: 4,
      baths: 2,
      distanceMiles: 1.1,
    },
  ];
}

export class MockAVMProvider implements AVMProvider {
  readonly name = "mock";

  isConfigured(): boolean {
    return true;
  }

  async getEstimate(input: AVMInput): Promise<AVMResult> {
    const base = getBasePrice(input.zip ?? "326");

    // Adjust for sqft if known
    const sqftMultiplier = input.sqft
      ? Math.min(1.5, Math.max(0.6, input.sqft / 1800))
      : 1;

    const mid = Math.round(base * sqftMultiplier);
    const low = Math.round(mid * 0.92);
    const high = Math.round(mid * 1.08);

    return {
      estimateLow: low,
      estimateMid: mid,
      estimateHigh: high,
      confidencePct: null,
      comps: buildStubComps(input.zip, mid),
      providerReportId: null,
      providerRaw: {
        provider: "mock",
        input,
        note: "This is a deterministic mock. No real AVM data.",
      },
    };
  }
}
