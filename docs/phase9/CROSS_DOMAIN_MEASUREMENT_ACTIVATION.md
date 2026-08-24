# Phase 9 Cross-Domain Measurement Activation

Status: **code and WordPress 1.2.0 package candidate; live activation HOLD**

Date: 2026-08-24

## Reuse-first decision

The canonical Neon analytics ledger remains the operational source of truth.
It records allowlisted funnel events independently of any browser analytics
choice and remains the only event stream joined to protected lead operations.

The existing Our Town Properties Google Tag Manager container is the only
approved external browser-analytics entry point. Ask Magic Mike does not add a
second GA4 property, PostHog project, Meta Pixel, Vercel Web Analytics stream,
or another customer identity system.

## Current evidence

Read-only public checks on 2026-08-24 found:

- `https://www.ourtownproperties.com/` returned HTTP 200 and loaded one GTM
  container.
- `https://www.askmagicmike.com/` and `/ask` returned HTTP 200 but loaded no
  GTM, direct Google tag, Meta Pixel, or Vercel Web Analytics script.
- Authenticated browser inspection found a visible Our Town **Cookie Policy**
  choice with **Decline** and **Allow cookies**. Server HTML nevertheless starts
  `GTM-KZMCSLTJ` synchronously before the deferred cookie-choice provider. The
  public container payload exposes one Google tag (`G-RQRBB1G270`) firing on
  `gtm.init`, and no earlier default-denied consent command was detectable in
  the page source. This is an activation blocker, not proof of consent-safe
  cross-domain measurement.
- The existing Our Town homepage CTA points to the canonical Ask Magic Mike
  hostname with registered source/medium/campaign values. Its `/value`
  compatibility path remains functional and is covered by the separately
  sequenced canonical-alias candidate.
- The public Our Town container payload references one GA4 destination and
  Google consent/linker capabilities. That public payload does not prove the
  GA4 Admin domain list, internal-traffic rules, consent overview, or published
  tag mappings; authenticated Google Tag/GA4 review is still required.
- Git history, remote branches, and the current repository contain no prior
  GTM loader to recover. The privacy-minimized Neon event ledger already exists
  and is reused.
- The existing canonical WordPress bridge—not a new plugin—now contains a
  disabled-by-default Basic Consent loader candidate. It is pinned to
  `GTM-KZMCSLTJ`, executes before normal head output, and accepts only the
  provider's exact `vv_cookieconsent_status=allow` state. No WordPress file,
  page, cache, cookie setting, or GTM source has been changed live.

## Runtime contract

The candidate uses one approved GTM container through two consent-bound domain
loaders with these boundaries:

1. On Our Town, canonical bridge 1.2.0 exposes no Google runtime unless
   `AMM_GOOGLE_MEASUREMENT_ENABLED=true` and the existing provider cookie is
   exactly `allow`. Missing, deny, dismiss, malformed, and unknown states are
   inert. The loader has no advertising grant or noscript fallback.
2. The WordPress gate appears at `wp_head` priority 0 and pins the exact fixed
   Google URL/container in browser code. The current legacy GTM head bootstrap
   and matching noscript iframe must be removed in the same controlled change;
   coexistence is a release blocker.
3. `NEXT_PUBLIC_GTM_CONTAINER_ID` is public configuration, not a credential.
4. The Ask loader resolves only when `VERCEL_ENV=production` and the value exactly
   matches the container observed on OurTownProperties.com. A typo or a
   NellySelly container fails closed.
5. Preview, local development, Vercel aliases, automation, private/admin,
   phone-alert, operational-preview, iframe/embed, widget, and internal-QA
   contexts load no Google script.
6. Basic consent mode is used: no Google script or request is created before
   the visitor chooses **Allow analytics**.
7. Before the approved Ask container loads, consent commands default analytics and
   all advertising purposes to denied. Only `analytics_storage` is updated to
   granted after the explicit choice. `ad_storage`, `ad_user_data`, and
   `ad_personalization` remain denied; ads-data redaction stays enabled and URL
   passthrough stays disabled.
8. Decline stores only a device-local choice. Revocation sends a denied update,
   stops application event publication, removes the loader, and clears known
   Ask Magic Mike analytics cookies.
9. The existing browser event sanitizer remains authoritative. The external
   publication boundary independently rechecks consent, the approved container,
   the public event registry, the property allowlist, and `is_test` exclusion.
   GTM receives a
   dedicated `ammDataLayer` containing flat event objects with only allowlisted
   dimensions plus fixed
   `event_source`, schema version, and `public_production` traffic class. Raw
   name, email, phone, address, message, click ID, referrer, lead ID, agent ID,
   and provider identifiers are not copied from the lead payload.
10. The footer exposes an accessible Analytics preferences control. The privacy
   page states the optional purpose and exclusions.
11. Browser automation is excluded before first-party analytics/experiment
   fetches. Both public APIs independently accept-but-discard known automation
   user agents before rate limiting or persistence, protecting KPI trust when a
   browser runner hides `navigator.webdriver`.

Google documents that cross-domain measurement requires the same Google tag on
both sites and an authenticated domain-list configuration, and that successful
linking decorates navigation with `_gl` after consent:
<https://support.google.com/analytics/answer/10071811>. Google also documents
that basic consent mode blocks tags and sends no data before a choice:
<https://developers.google.com/tag-platform/security/concepts/consent-mode>.

## Activation preflight

Run the read-only public contract before opening any configuration gate:

```bash
pnpm run amm:verify:cross-domain
```

The command checks for the canonical Basic Consent marker before the existing
cookie provider, rejects any legacy GTM bootstrap or noscript bypass, verifies
the approved container and Google destination identities, proves Ask Magic
Mike server-side tag inertia, and checks NellySelly isolation. It intentionally
returns `HOLD` against the current live brokerage source. A passing static
check is necessary but not sufficient; authenticated GTM/GA4 and clean-browser
network proof are still required.

## Authenticated activation checklist

This checklist is intentionally separate from code review:

1. Use the separate WordPress gate below to back up the site, install canonical
   bridge 1.2.0 with measurement initially disabled, remove only the exact
   legacy GTM head/noscript source, enable the gate, and run controlled
   deny/allow/source/network QA. Preserve the active Form 3 bridge settings.
2. Require the public preflight to return `REVIEW_READY`; otherwise immediately
   disable the measurement flag and follow the WordPress rollback.
3. In authenticated GTM Preview/Consent Overview, prove the Google tag does not
   fire before the approved choice and that Decline keeps analytics and all
   advertising purposes denied.
4. In the existing Google Tag / GA4 property, verify destination
   `G-RQRBB1G270` belongs to Our Town Properties and not NellySelly.
5. Verify both `ourtownproperties.com` and `askmagicmike.com` are included in
   **Configure your domains** for the same web stream.
6. Review every published tag. Reject any tag that can
   send user-provided data, lead fields, enhanced-conversion contact data, or
   advertising data outside the approved consent contract.
7. Review the live OurTownProperties.com and AskMagicMike.com consent surfaces
   with the owner/legal reviewer. Do not activate cross-domain cookie identity
   until both domains' consent behavior is approved and coherent.
8. Confirm GA4 internal/developer traffic handling excludes controlled QA and
   staff verification without filtering genuine public demand.
9. Rerun `pnpm run amm:verify:cross-domain` and require `REVIEW_READY` before
   entering a Vercel value.
10. Add `NEXT_PUBLIC_GTM_CONTAINER_ID` to **Production only** in the canonical
   Vercel project. Do not add it to Preview.
11. Merge the exact green candidate and allow Vercel Git integration to build
   the same commit for Production.
12. In a clean browser, prove Decline creates no Google request and no `_ga*`
   cookie. Then separately choose Allow and prove the approved container loads.
13. Navigate through an existing tagged Our Town link to Ask Magic Mike. Verify
   `_gl` is present, both pages use the same GA4 destination/client identity,
   the destination returns 200, and UTMs remain intact.
14. Verify one sanitized `page_view` and one non-contact funnel event in Tag
   Assistant/GA4 DebugView. Do not submit a lead and do not use a genuine
   consumer identity for this measurement acceptance.
15. Recheck Production runtime errors and the canonical Neon event ledger.
16. Run a no-write browser verifier and confirm automation creates no
   first-party event/experiment POST and no external Google request.

## Rollback

WordPress rollback is independent: set `AMM_GOOGLE_MEASUREMENT_ENABLED=false`.
If necessary, restore the exact preserved legacy source and reinstall the
preserved 1.1.0 package. Do not change the Form 3 bridge flag/allowlist or delete
WordPress/Neon records. Ask rollback is to remove
`NEXT_PUBLIC_GTM_CONTAINER_ID` from Production and redeploy/promote the prior
known-good commit. The server resolves a missing value to `null`, so no Ask
consent panel, Google script, or GTM event publication remains. No database
migration or data rollback is involved.

## Exact Production gate

No WordPress, Google, Vercel, merge, or Production deployment action is
authorized by preparing this candidate. The first narrowly scoped gate, after
the 1.2.0 package and rollback digest are release-sealed, is:

`APPROVE PHASE 9 OUR TOWN BASIC CONSENT BRIDGE 1.2.0 INSTALLATION, LEGACY GTM REMOVAL, AND CONTROLLED RUNTIME QA`

That phrase authorizes only backup, 1.2.0 installation, preservation of current
Form 3 settings, exact legacy GTM head/noscript removal, measurement-flag
enablement, and reversible deny/allow/source/network QA. It does not authorize
the Vercel environment value, PR merge, Ask Production deployment, form/lead
submission, message, publication, spend, DNS, deletion, or NellySelly action.

The later application phrase is not requestable while the public preflight
returns `HOLD`. After the WordPress gate, authenticated review, exact-head CI,
and Preview proof all pass, the required phrase is:

`APPROVE PHASE 9 CROSS-DOMAIN MEASUREMENT CONFIGURATION, ENVIRONMENT ENTRY, MERGE, AND PRODUCTION DEPLOYMENT`
