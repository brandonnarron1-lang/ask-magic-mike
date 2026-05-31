export const DISCLAIMER_VERSION = "v1";

export const DISCLAIMER_V1 = `This Automated Valuation Model (AVM) estimate is for informational purposes only. It is not an appraisal, a Comparative Market Analysis (CMA), or a guarantee of market value. Estimates are based on publicly available data and may not reflect current market conditions, property condition, upgrades, or buyer demand.

For a professional, no-obligation evaluation of your home's current market value, contact Mike Eatmon at Our Town Properties. Our Town Properties and its affiliates are not responsible for errors or omissions in this estimate and make no representations regarding its accuracy or completeness.

Licensed Real Estate Broker · Our Town Properties · Gainesville, FL`;

export function getDisclaimer(version: string = DISCLAIMER_VERSION): string {
  const map: Record<string, string> = {
    v1: DISCLAIMER_V1,
  };
  return map[version] ?? DISCLAIMER_V1;
}
