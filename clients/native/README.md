# Ask Magic Mike: native R3 slice

Native React Native/Expo screens, not a site WebView. This is a local prototype,
not a signed/distributed beta. The app has no product bundle/package identity,
signing account, production API binding, model credential or database connection.
Expo Go is a separate vendor development host, not our own compiled application.

## Run locally

Use Node 24 and pnpm 10.30.3. Install the root frozen dependencies first, then
`pnpm --dir clients/native install --frozen-lockfile --ignore-scripts`.
From the repository root:

```sh
pnpm --dir clients/native run typecheck
node --test clients/native/candidate.test.cjs clients/native/runtime.test.cjs
pnpm --dir clients/native start
```

Start is offline, loopback-only, one Metro worker, with dotenv and telemetry
disabled. Open its local development URL in a compatible existing Expo Go host.
No public tunnel or Production connection is required. Default builds are
disconnected: Home, Saved and My Plan work without calling any API. Do not put
credentials into an Expo public variable or import the server's environment.

Hermes JS exports (not native binary/signing proof):

```sh
EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 EXPO_NO_DOTENV=1 pnpm --dir clients/native run export:ios
EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 EXPO_NO_DOTENV=1 pnpm --dir clients/native run export:android
```

## Actual behavior and privacy

- Save eight user-reported, unverified interests; compare two; edit a private
  buying plan and seller-preparation checklist. No enrichment, property facts,
  synchronization, account change or customer inquiry is inferred.
- Use the actual protected SecureStore adapter. Bounded chunks commit through a
  manifest; failures never fall back to plaintext. Local retention is checked
  on load, up to 30 days after editing, not a background deletion promise.
- In a separately verified synthetic QA venue, deliberately request a cited
  answer, recheck current source validity and record scoped feedback. Answer
  text is not cached; background/tab transitions hide it. Opaque receipts and
  an ambiguous feedback request retain the exact session/key/body for an
  explicit reconciliation, never an automatic retry or new-key resend.
- The guest-only transport uses its own protected jar, not staff credentials or
  the OS shared jar. Native feedback obtains fresh session-bound CSRF proof and
  reuses the existing server authorization, feedback, rate and audit service.
  Existing browser Origin checks are unchanged.
- Human-help buttons open canonical public forms for review. Opening is not a
  submission, send, task, appointment, contact outcome or reviewed handoff.
- Expo Go's backup/host settings are not our application's privacy acceptance.
  Own-app configuration disables Android backup; signed-device acceptance and
  native account login/export/deletion remain separate work.

## Real local API/session acceptance

Review `scripts/amm/reference-session-acceptance.mjs` before running it. It
requires the existing disposable local PostgreSQL venue, rejects unsafe targets,
starts the compiled app with synthetic fixtures and no outbound/model transport,
then destroys its own database/process. Never supply a Production environment.

```sh
AMM_QA_POSTGRES_TEST=1 AMM_QA_NATIVE_POSTGRES_TEST=1 AMM_R3_NATIVE_ACCEPTANCE=1 \
  node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/amm/reference-session-acceptance.mjs
```

The separate native-device suite additionally requires
`AMM_R3_NATIVE_DEVICE_ACCEPTANCE=1` and the exact owned Android test host verified
by `tests/support/android-native-ui.ts`. It is not portable to an arbitrary
connected phone. Private screenshots, session traces, generated QA descriptors
and database identity receipts must stay outside tracked source. Do not
reconnect a retired cloud QA branch or infer authorization from a descriptor.

## Release boundary

R2's accepted release is unchanged. R3 adds a native package and two server
feedback routes, with no migration or remote runtime change. This local source
needs its own frozen-source review and acceptance before deployment/distribution.
Do not promote a synthetic-configured build. A server rollback must retain R2's
source revocation, immutable reviews and v6 notification readers. Native rollback
must not silently erase local data, feedback receipts or pending exact requests.
