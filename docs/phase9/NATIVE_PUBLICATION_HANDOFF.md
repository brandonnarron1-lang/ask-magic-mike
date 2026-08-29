# Phase 9 native publication handoff

Date: 2026-08-23

Status: downstream Draft candidate; Production and external channels unchanged

## Measured decision

An aggregate-only read of canonical Neon Production at
`2026-08-23T23:21:50Z` reported six suppressed test leads and zero live leads,
contactable leads, owned-demand publication proofs, source rows, outcomes,
spend, active experiments, first-response samples, or open opportunities. The
constraint is still first owned-demand activation—not another form, store,
score, route, dashboard, AI model, or visual library.

The existing protected Distribution Command already contains canonical copy,
tracked links, 4:5 and 9:16 PNGs, QR exports, native review boundaries, and an
append-only proof ledger. This change closes only the remaining mobile handoff
friction.

## Implementation

- Reuse the existing canonical placement catalog and protected asset route.
- Offer the handoff only for Google Business Profile, Facebook, Instagram, and
  LinkedIn placements.
- Use the dedicated 720x720 image for Google Business Profile, the existing
  4:5 image for Facebook and LinkedIn, and the existing 9:16 image for
  Instagram. The square adaptation is documented in
  `GOOGLE_BUSINESS_PROFILE_SQUARE_ASSET.md`.
- Require one explicit tap to prepare the private same-origin PNG and a second
  explicit tap to invoke the device share sheet. This preserves the Web Share
  transient-user-activation boundary after asynchronous image preparation.
- Validate one correlated publication identity across channel, placement,
  channel-native format, canonical filename, proof target, UTM source, and UTM
  medium. Also validate the exact four UTM fields, approved destination path,
  exact protected asset path, PNG media type and byte signature, safe copy
  bounds, and a five-megabyte image ceiling before creating a browser `File`.
- Keep the Client Component isolated from the server-side QR/image-generation
  module so no server-capable dependency can drift into the browser bundle.
- Use `navigator.canShare({ files })` before invoking `navigator.share`.
- Treat share-sheet cancellation as no publication. Even a resolved share
  promise proves only OS handoff, never native publication.
- Preserve the existing download and copy controls as the cross-browser
  fallback.

The W3C Web Share Recommendation defines the user-agent chooser, file sharing,
`canShare`, and required transient activation:
https://www.w3.org/TR/web-share/

Google's current Business Profile guidance supports update posts with a photo
and action link, requires native review, and states that posts can be pending or
not approved after submission. Its photo guidance caps images at 5 MB. Those
native states are why this feature never records publication automatically:

- https://support.google.com/business/answer/7342169
- https://support.google.com/business/answer/6123536

## Authority boundary

The handoff cannot choose a share target, publish, schedule, message, target an
audience, spend, write the database, record proof, or call a provider. The
authenticated operator must select the native destination, inspect the final
editor, approve the external action, verify the resulting platform state, and
only then record valid proof under the existing separately gated workflow.

This candidate contains no migration, environment change, new dependency,
provider SDK, generated likeness, lead data, consumer PII, email, SMS, Push,
WordPress edit, DNS change, spend, deletion, or NellySelly interaction.

## Rollback

Revert the application commit or redeploy the exact PR #206 predecessor. The
existing download/copy workflow remains intact and there is no database or
provider rollback.
