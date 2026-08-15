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

export function smsSegmentCount(value: string) {
  const gsm = Array.from(value).every((character) => character.charCodeAt(0) <= 127);
  const single = gsm ? 160 : 70;
  const multipart = gsm ? 153 : 67;
  return value.length <= single ? 1 : Math.ceil(value.length / multipart);
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
