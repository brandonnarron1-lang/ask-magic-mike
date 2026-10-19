# Ask Magic Mike: native R3 slice

Native React Native/Expo screens, not a site WebView. Local bundled-JavaScript
Release packages use `com.askmagicmike.r3preview` on each platform. This is a
local QA namespace, not a registered store identity or a distributed beta.
There is no Production API binding, model credential or database connection in
the client. Expo Go is a separate vendor host, not our own compiled application.

## Run locally

Use Node 24 and pnpm 10.30.3. Install the root frozen dependencies first, then
`pnpm --dir clients/native install --frozen-lockfile --ignore-scripts`.
From the repository root:

```sh
pnpm --dir clients/native run typecheck
node --test clients/native/candidate.test.cjs clients/native/runtime.test.cjs clients/native/build.test.cjs
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

## Own local packages (not an export or store upload)

Inspect `scripts/amm/native-local-build.mjs` first. Use the existing pinned native
dependencies, Xcode/CocoaPods, JDK21/Gradle9.3.1 and Android36/NDK27.1.12297006.
Set `AMM_NATIVE_BUILD_ROOT` to an existing task-owned build/cache directory with
adequate disk; never use another project's cache. Set `ANDROID_HOME` and
`JAVA_HOME` explicitly for Android. `AMM_NATIVE_GRADLE_BIN` may select an already
installed compatible Gradle binary; its caches still use the task-owned root.

```sh
node scripts/amm/native-local-build.mjs ios
node scripts/amm/native-local-build.mjs android
```

The runner uses an allowlisted child environment, no dotenv/provider credential,
CNG-generated ignored projects, the pinned CocoaPods lock and one two-worker
native build. It emits timestamped APK/Simulator `.app.zip`, SHA-256, source/tree,
dirty state, backend identity and build logs under that root. Both Release
variants bundle JavaScript and need no Metro. It does not install/upload/send.
Android uses the template **test** certificate, not a store/release owner key.
iOS uses local Simulator ad-hoc signing; Xcode injects the simulator-only
entitlements at link time. Do not manually sign restricted entitlements onto
the Simulator executable or use this input for a physical-device build.

Default packages are **DISCONNECTED**: the private plan works, Ask Mike is held.
An explicit `AMM_NATIVE_QA_DESCRIPTOR_FILE` can select only a freshly verified,
synthetic loopback venue; the harness produces this public, expiring descriptor.
No server secret/session enters the package. The compiled bundle must contain
that exact QA scope, and a disconnected build must not retain a previous scope.
Metro cache identities separate these variants. Only the Android QA artifact
allows cleartext for `10.0.2.2`; ordinary packages get no such allowance.
After the harness destroys its database, that QA package is NOT an external beta.

The opt-in `AMM_R3_NATIVE_BINARY_ACCEPTANCE=ios` (or `android`) selects the existing
local session harness's bounded SQL observer. Actual native UI actions and
screenshots remain separate from its SQL assertions; a marker alone is not a
device pass. Keep all descriptors, fixtures and proofs in private `.amm-run`.
Never supply this mode with Production/Preview credentials.

On iOS, the app applies the full OS font scale to glyph AND layout size once to
avoid a reproduced live Dynamic Type/rerender clipping issue. It does not cap
the user's font preference, fit text down or limit lines. Android retains native
font scaling. Fresh launch, live-size changes and subsequent navigation require
actual device checks; a TypeScript test is not rendering evidence.

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
