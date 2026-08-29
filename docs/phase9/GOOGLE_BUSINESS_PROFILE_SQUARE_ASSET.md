# Phase 9 Google Business Profile square asset

Date: 2026-08-29

Status: stacked Draft candidate after sealed PR #231; Production and external
channels unchanged

## Measured decision

The existing Distribution Command already owns the canonical creative catalog,
approved Mike Eatmon imagery, tracked destinations, shortlinks, QR codes,
protected image renderer, mobile native handoff, and publication-proof ledger.
No second creative studio or publisher is justified.

The remaining channel-fidelity gap was specific: the native Google Business
Profile handoff selected the existing 1080x1350 social feed image. Google's
current Business Profile photo guidance recommends a square 720x720 image. This
candidate adds that one format inside the existing renderer and maps only the
Google Business Profile native handoff to it.

## Implementation

- Add one deterministic `square` image specification at exactly 720x720 PNG.
- Resolve `square` only for the exact `google_business_profile` channel; other
  channels fail closed instead of receiving an accidental format expansion.
- Preserve the canonical placement definitions, copy, tracked destination,
  allowlisted shortlink, high-error-correction QR code, approved retained
  portrait, Black Diamond palette, broker-review boundary, and Equal Housing
  identification.
- Reuse the existing story card treatment at square density so long buyer and
  renter headlines remain readable without changing their claims.
- Keep the image behind the existing `report:view` session boundary with
  private/no-store, attachment-only, noindex, CSP-sandboxed responses.
- Extend the client trust boundary to accept only the exact `format=square`
  asset path; added parameters, arbitrary URLs, unknown channels, unknown
  placements, active content, oversized files, and non-PNG bytes still fail
  before native handoff.
- Preserve the two-gesture Web Share flow. Preparing or handing a file to the
  device chooser does not prove publication and never writes the proof ledger.
- Expose the same square file as the first protected Google Business Profile
  download so browsers without file-sharing support retain an exact-format
  fallback. Other channel cards do not receive that control.

## Visual and identity result

All four canonical Google Business Profile placements render at 720x720:

- general local real-estate question;
- seller value and sale-readiness review;
- buyer property-match review; and
- renter-to-homeownership readiness review.

Visual QA compared the existing 4:5 seller reference and the square adaptation
in one canvas, then reviewed a four-placement square matrix at original pixel
density. The first square pass exposed a close portrait/text collision and an
over-cropped transparent renter portrait. The final renderer reuses the
existing dark information card, keeps the renter portrait contained, and
retains safe spacing between copy, QR, and compliance text.

No generated likeness, face edit, replacement portrait, new logo, or synthetic
property image is used. The approved repository images remain untouched.

Local QA artifacts are stored outside the repository at:

```text
/Users/brandonnarron/.codex/artifacts/amm-gbp-square-assets-20260829/
```

## Primary sources

- [Google Business Profile photo guidance](https://support.google.com/business/answer/6123536?hl=en-en)
  lists square 720x720 as the recommended resolution, JPG or PNG as accepted
  formats, and a 10 KB to 5 MB size range.
- [Google Business Profile photo management](https://support.google.com/business/answer/6103862/add-photos-or-videos-to-your-business-profile-computer?hl=en-GB)
  keeps final profile selection and review in Google's native operator flow.
- [W3C Web Share Recommendation](https://www.w3.org/TR/web-share/) defines the
  user-agent chooser, file sharing, `canShare`, and transient-user-activation
  boundary retained by the existing two-gesture implementation.

Platform requirements can change. The authorized operator must inspect the
native editor and final crop before any separately approved publication.

## Authority boundary

This candidate prepares a private operator asset. It cannot publish, schedule,
choose an account, target an audience, record proof, create or edit a lead,
write Neon, send email/SMS/Push, call Google, change WordPress/DNS/Vercel
configuration, spend, delete data, or interact with NellySelly.

## Rollback

Before Production, close the Draft and leave the branch preserved. After a
separately approved release, revert the application commit or promote the
immediately preceding Ready Vercel deployment. There is no database, secret,
provider, publication, or external-account state to unwind.
