/** Retain an internal Lead Center bookmark, never an arbitrary redirect. */
export function safeLeadCenterReturn(value: string | null, inheritedFragment = ""): string {
  if (!value || !value.startsWith("/") || Array.from(value).some(c => c === "\\" || c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127)) return "/admin";
  const base = "https://lead-center.invalid";
  try {
    const target = new URL(value, base);
    if (target.origin !== base || !(target.pathname === "/admin" || target.pathname.startsWith("/admin/"))) return "/admin";
    // HTTP cannot send a fragment to the server. Browsers retain it across a
    // login redirect; restore only an existing, supported lead-panel bookmark.
    if (!target.hash && /^\/admin\/leads\/[0-9a-f-]{36}$/i.test(target.pathname) &&
        ["#message-review", "#contact-review", "#follow-up", "#appointment-review", "#activity", "#property-evidence-review", "#next-action-review"].includes(inheritedFragment)) target.hash = inheritedFragment;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch { return "/admin"; }
}
