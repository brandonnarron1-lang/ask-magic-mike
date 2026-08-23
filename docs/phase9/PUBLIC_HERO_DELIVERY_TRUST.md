# Phase 9 public hero delivery trust

Date: 2026-08-23

Status: stacked Draft PR #201; Production unchanged

## Reuse-first decision

Keep the approved Black Diamond homepage composition, Mike Eatmon imagery,
Our Town Properties identity, copy, calls to action, attribution, and public
routes unchanged. This candidate does not generate replacement artwork, add a
landing page, create another analytics system, or alter a lead contract.

## Evidence-led gap

The homepage hero is the likely Largest Contentful Paint element. Before this
candidate, the browser received a single 1,080-pixel mobile WebP (289,876 bytes)
or 2,880-pixel desktop WebP (503,788 bytes) directly from an unversioned public
path. The element did not declare eager loading, high fetch priority, intrinsic
dimensions, or a responsive optimizer source set.

The historical Black Diamond performance report described homepage LCP as an
estimate. It was not field or Lighthouse evidence and must not be presented as
a measured score. The existing privacy-safe Web Vitals collector remains the
canonical source once sufficient genuine traffic exists.

## Candidate behavior

- feeds the exact approved mobile and desktop WebP artwork through the Next.js
  image optimizer;
- uses Next.js `getImageProps` for framework-managed responsive source sets;
- preserves art direction at the existing 768-pixel breakpoint;
- marks the above-fold artwork `loading="eager"` and `fetchPriority="high"`;
- supplies intrinsic dimensions and `sizes="100vw"`;
- retains an empty alternative because the image is decorative and the visible
  heading carries the page meaning; and
- leaves field Web Vitals reporting, attribution, lead creation, consent,
  scoring, routing, notifications, and operator controls unchanged.

## Safety boundary

This is a presentation-delivery change only. It does not authorize a merge,
Production deployment, WordPress publication, public post, consumer message,
database write, provider change, spend, DNS change, or NellySelly mutation.

## Release order

Draft PR #201 is stacked after Draft PRs #197, #198, #199, and #200. Those
predecessors must be released and this branch refreshed before its own exact
merge and Production deployment approval can be used.

## Rollback

Revert the candidate commit. The prior static `<picture>` implementation and
the same approved files remain in `public/brand/black-diamond/`; no data or
infrastructure rollback is required.
