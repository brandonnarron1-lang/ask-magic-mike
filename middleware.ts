export { middleware } from "./src/middleware";

// NOTE: Next.js statically analyzes `config.matcher` from THIS root file only —
// it does not follow re-exports to resolve the literal value. Re-exporting
// `config` from ./src/middleware (as this file previously did) meant Next
// could not determine the matcher at build time and silently fell back to
// matching every route ("/:path*"), which put this admin-only auth check
// (and its Buffer/base64 decode, which is not Edge-safe on Vercel) in front
// of every single request — including "/" — causing a site-wide 500
// (`ReferenceError: __dirname is not defined`) on 2026-07-08.
// Keep the matcher literal, defined directly here.
export const config = { matcher: ["/admin/:path*"] };
