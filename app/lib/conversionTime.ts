/** Resolve an operator wall time in its declared zone, never the server zone.
 * DST gaps and repeated local times require an explicit offset rather than
 * guessing which occurrence the operator intended. No calendar availability.
 */
export function resolveConversionDateTime(value: string | null | undefined, timezone = "America/New_York"): string | null {
  if (!value?.trim()) return null;
  const input = value.trim();
  let format: Intl.DateTimeFormat;
  try { format = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }); }
  catch { throw new Error("invalid_appointment_timezone"); }
  if (/T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(input)) {
    if (!Number.isFinite(Date.parse(input))) throw new Error("invalid_conversion_time");
    return input;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(input);
  if (!match) throw new Error("invalid_conversion_time");
  const wall = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6] || "00"}`;
  const nominal = Date.parse(`${wall}Z`);
  if (!Number.isFinite(nominal) || new Date(nominal).toISOString().slice(0, 19) !== wall) throw new Error("invalid_conversion_time");
  const wallTime = (time: number) => {
    const parts = Object.fromEntries(format.formatToParts(time).map(({ type, value }) => [type, value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  };
  const offsets = new Set<number>();
  for (const delta of [-36, -12, 0, 12, 36]) {
    const time = nominal + delta * 3_600_000;
    offsets.add(Date.parse(`${wallTime(time)}Z`) - time);
  }
  const matches = [...offsets].map(offset => nominal - offset).filter(time => wallTime(time) === wall);
  if (matches.length !== 1) throw new Error(matches.length ? "ambiguous_conversion_time" : "nonexistent_conversion_time");
  return new Date(matches[0]).toISOString();
}
