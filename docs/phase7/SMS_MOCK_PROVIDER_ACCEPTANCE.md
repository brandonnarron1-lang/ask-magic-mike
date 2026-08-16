# SMS mock-provider acceptance

Acceptance boundary: render only, no carrier. The existing mock adapter and communication tests prove template interpolation, transactional-versus-marketing separation, do-not-contact blocking, unknown-template rejection, and opt-out language. The Phase 7 permission service adds purpose-specific consent, test/suppression enforcement, and human review.

Result: release-candidate interface ready; carrier activation not authorized and not attempted.

