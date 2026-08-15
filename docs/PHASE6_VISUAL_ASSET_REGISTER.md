# Phase 6 Visual Asset Register

## Internal alert backdrop v1

- File: `output/phase6/visual-assets/phase6-internal-alert-backdrop-v1.png`
- Intended use: optional internal lead-alert email or authenticated Lead Center presentation layer.
- Source: generated from the existing approved Mike Eatmon source portrait at `public/images/ask-magic-mike/brand-pack-v2/mike-headshot-source.jpg` using the built-in image-generation workflow on 2026-08-15.
- Dimensions: 1730 x 909 pixels (landscape).
- Content safety: no prospect identity, lead details, property address, contact information, legal claim, offer, urgency claim, or call to action is baked into the image.
- Design system: restrained black, deep navy, warm gold, ivory, and subtle cyan; negative space on the left for accessible live HTML content.
- Accessibility: decorative only when used behind live text; use an empty alt attribute in email and web UI. Do not flatten lead details into this image.
- Approval state: reviewed Phase 6 candidate asset. It is not wired into Production notifications by this commit.
- Identity note: this is an AI-assisted portrait derivative. Obtain final subject/brand approval before public marketing use. Internal QA or presentation use only until approved.

## Prior reference templates

The user-supplied high-urgency red/orange lead-alert compositions remain visual references, not machine-readable lead records and not email/SMS templates. Their useful hierarchy—priority, lead type, location, timeframe, source, lead ID, and a secure detail action—has been preserved in responsive HTML/text templates. Real lead data stays live, selectable, auditable, and accessible instead of being rendered into generated pixels.

## Non-negotiable usage rules

- Never send a generated image containing real lead PII.
- Never place secrets, bearer tokens, or open administrative links in image URLs.
- Keep the secure Lead Center link in live HTML/text.
- Keep plain-text email available.
- Do not attach the image to SMS/MMS unless carrier, consent, cost, and compliance approval is complete.
- Do not use urgency visuals to override the deterministic lead score or routing record.
