/** Retain an internal Lead Center bookmark, never an arbitrary redirect. */
export function safeLeadCenterReturn(value: string | null): string {
  if (!value || !value.startsWith("/") || Array.from(value).some(c => c === "\\" || c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127)) return "/admin";
  const base = "https://lead-center.invalid";
  try {
    const target = new URL(value, base);
    if (target.origin !== base || !(target.pathname === "/admin" || target.pathname.startsWith("/admin/"))) return "/admin";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch { return "/admin"; }
}
