/** Human-readable age since last contact, e.g. "2h ago" or "never". */
export function formatContactAge(isoString: string | null): string {
  if (!isoString) return "never";
  const ms = Date.now() - new Date(isoString).getTime();
  if (ms < 0) return "just now";
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
