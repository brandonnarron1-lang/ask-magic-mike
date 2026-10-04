export const OPERATIONAL_TIME_ZONE = "America/New_York";

export function normalizeSmsKeyword(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z]/g, "");
}

export function classifyInboundSms(value: string): "stop" | "help" | "reply" {
  const keyword = normalizeSmsKeyword(value);
  if (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(keyword)) return "stop";
  if (keyword === "HELP" || keyword === "INFO") return "help";
  return "reply";
}

// GSM 03.38 is not ASCII. Extended characters consume two septets; Unicode
// consumes UTF-16 code units (a supplementary character consumes two).
const GSM_BASIC = new Set(Array.from("@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"));
const GSM_EXTENDED = new Set(Array.from("\f^{}\\[~]|€"));

export function smsEncodingEstimate(value: string) {
  let septets = 0;
  let gsm = true;
  for (const character of value) {
    if (GSM_BASIC.has(character)) septets++;
    else if (GSM_EXTENDED.has(character)) septets += 2;
    else { gsm = false; break; }
  }
  const units = gsm ? septets : value.length;
  const single = gsm ? 160 : 70;
  const multipart = gsm ? 153 : 67;
  return { encoding: gsm ? "GSM-7" as const : "UCS-2" as const, units,
    segments: units <= single ? 1 : Math.ceil(units / multipart) };
}

export function smsSegmentCount(value: string) {
  return smsEncodingEstimate(value).segments;
}

export function isWithinSmsSendWindow(
  at: Date,
  timeZone = OPERATIONAL_TIME_ZONE,
  startHour = 9,
  endHour = 20,
) {
  const hourText = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hour12: false,
  }).format(at);
  const hour = Number(hourText === "24" ? "0" : hourText);
  return Number.isFinite(hour) && hour >= startHour && hour < endHour;
}

export function smsFrequencyAllowed(input: {
  sentInLast24Hours: number;
  sentInLast7Days: number;
  maxPer24Hours?: number;
  maxPer7Days?: number;
}) {
  return input.sentInLast24Hours < (input.maxPer24Hours ?? 2) && input.sentInLast7Days < (input.maxPer7Days ?? 5);
}
