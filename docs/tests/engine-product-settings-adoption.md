# Mobile adoption of Engine settings separation

## Source and ownership

Mobile pins merged Engine `a8e1b2c912cebbbb835049d3bc343cfe9a036bb7`.
This source contains the merged settings separation, import-preservation and log-profile changes.
The main ancestry validator accepts the exact pin. Compared with the previous validated
`e4ff36c97d244f8c858784097615ef52e3bdcedb`, only an upstream test and planning file differ.
Production code, binding contracts and Cargo.lock are unchanged. Source-stamped native
libraries and application packages must still be rebuilt for the merged SHA.
Mobile base is `7ec4ab73b0b2e6c5cf9c9fcd4c928c97d9ca880d`.
The module version remains `v1.1.0-rc.23`. The full source commit is authoritative.
`artifactSource` is `commit`. The product pin has no local path override.
Mobile has no Cargo.lock. Native builds use the pinned Engine Cargo.lock with `--locked`.
Bindings, compatibility and Cargo.lock do not change between task8 final and task9 final.

Mobile retains debugMode, appearance, language and other product preferences in
its existing model and storage. Engine retains device name and relay ownership.
UniFFI does not declare a host log profile. An absent effective profile remains
absent; Mobile does not report it as prod. Mobile ships iOS/Android artifacts.
Mobile does not ship ArkTS/N-API artifacts.

This PR uses Mobile main as its Git base. Dependencies are
[Engine #225](https://github.com/UniClipboard/Engine/pull/225),
[#226](https://github.com/UniClipboard/Engine/pull/226),
[#227](https://github.com/UniClipboard/Engine/pull/227), and coordinated
[Desktop #2061](https://github.com/UniClipboard/UniClipboard/pull/2061).
Desktop head `6a7d869e97200dac86fadebe370aadad5a0de152` uses the same full merged
SHA in Cargo.toml and all 18 Engine-sourced Cargo.lock entries. Recheck remote
source convergence and main reachability before merge or release.
Pending CI is not passed validation. Keep the main ancestry gate enabled.
Desktop P1 distribution and cross-repository release acceptance remain separate gates.

## Actual import and recovery surface

Mobile has no Engine configuration-bundle import UI or deep-link route.
AppSettings JSON import helpers write AsyncStorage and publish product settings.
Only their settings-store wrappers call them. Native recoverSession unlocks
secure storage and resumes P2P; it does not confirm configuration import.

The iOS legacy P2P migration copies the entire old Engine directory into shared
p2p/data. That copy can carry pending-import.json and staging. The absence of an
import button does not make rejection unreachable. This is source evidence,
not proof that any actual user profile contains staged input.

## Readonly rejection consumer

The native hosts call the generated queryRejectedConfigImport method. This method
executes Engine QueryDiagnostics. Product code does not inspect private Engine files.
The Expo adapters use the existing EngineCallResult envelope to preserve Engine
code/category/retryable. TypeScript throws UcEngineError for an Engine failure.
The three reasons are unsupportedFormat, malformedMarker and missingRuntimeMembers.

The service queries after startup, explicit resume and foreground recovery.
It deduplicates concurrent reads and discards results from an old session.
Unchecked, checked and unavailable are separate from Engine lifecycle state.
Null means no rejected pending input. Null does not confirm successful import.
A query failure reports unavailable status and preserves its failure fields.
It does not mark the original running Engine as failed.

The stable app root owns ConfigImportNotice. It waits for foreground and reuses
AppAlertDialog. Android's standalone variant owns its Compose Host. iOS uses the
existing dialog at the root, outside animated sub-pages. The notice selects
localized text from the reason enum. It asks the user to re-export with the new
version at the source installation. It does not parse the Engine message for state.
Acknowledgement changes presentation only. An unavailable query offers retry.

Mobile adds no importer or replacement confirmation. It never calls Stage, sets
replace_rejected_import to true or deletes staged input. A future importer must
follow Engine's explicit confirmation and password-validation contract.

## Merged-source validation

The following checks use `a8e1b2c912cebbbb835049d3bc343cfe9a036bb7` on 2026-10-21 UTC.
The source comparison found only upstream test/planning changes from e4. Production,
binding and Cargo.lock bytes are unchanged. Native artifacts were rebuilt rather
than relabeled. Generated Swift/Kotlin still match the formal task8 contract.

| Check | Result | Boundary |
| --- | --- | --- |
| Normal main ancestry gate | Exit 0 | Exact pin reachable from fetched official origin/main |
| Dual-platform native preparation | Exit 0 | Real release XCFramework and arm64 AAR; every native library embeds the merged SHA |
| TypeScript module build | Exit 0 | Emitted wrapper rebuilt from the existing source |
| macOS binding E2E | Six cases passed | Real generated Swift/dylib; runtime reports merged SHA and macos |
| iOS simulator binding E2E | Six cases passed | Real prepared archive; runtime reports merged SHA and ios; owned simulator deleted |
| Android development Release APK | Exit 0 | Offline retry; actual AAR/merged/stripped/APK provenance matches merged SHA |
| iOS development Release app and extensions | Exit 0 | Actual unsigned simulator app and keyboard embed merged SHA; Share remains staging-only |

The new receipts are retained separately under the task report library's
`merged-a8e1b2c9` directory. Previous receipts keep their original source identity.
The initial Android dependency-refresh command was canceled after ten minutes of HTTP
wait (exit 130). Only the verified task client received SIGINT. The offline retry
passed, and byte comparisons establish that it used the newly built local AAR.
No Mobile UI, physical device or VM acceptance is included. The same six binding
cases and the same untested Expo/TypeScript service-transition limits apply.

## Previous-source validation

The following checks ran on 2026-10-21 UTC against the previous e4ff36c9 source. These receipts retain that source identity;
they do not establish the merged SHA in a newly packaged binary.
Commands, exits, hashes and actual artifacts are in the task report's library.

| Check | Result | Boundary |
| --- | --- | --- |
| Native prepare and prepared verification | Exit 0 | Release iOS device/universal simulator archives and Android arm64 AAR |
| Swift/Kotlin regeneration | Exit 0 | Own generated bytes match formal task8 output; AAR contains compiled query |
| TypeScript module build | Exit 0 | Metro's emitted wrapper contains the new query |
| macOS real binding E2E | 6 cases passed | Host dylib; runtime source and platform assertions |
| iOS simulator real binding E2E | 6 cases passed | Prepared arm64 archive; owned iOS 26.3 simulator |
| Android development Release APK | Exit 0 | AAR/merged/stripped/APK chain and final source stamp verified |
| iOS development Release app and extensions | Exit 0 | Xcode 27; unsigned simulator app and keyboard embed final source |
| Existing service and structured-error checks | 18 passed | Existing checks; only API fixtures changed |
| Full check:ci | Exit 0 | 233 suites / 1888 checks, coverage rerun, 27 Ruby assertions |
| Lint and TypeScript checks | Exit 0 | Consumer and module source |
| Normal release-source gate | Exit 1, expected | Engine commit is not on main; gate remains enabled |
| Pin schema check | Exit 0 | Schema only; no release acceptance |

The app packages also contain the new JavaScript query. The Share extension only
stages data and does not embed Engine. Normal Android symbol stripping changes
the native hash. The AAR equals the merged native library, and the stripped
library equals the APK native library. Native source stamps still match the pin.
The cache-tools revision and disposable cache-script changes are recorded
separately from product Rust source and Cargo.lock.

## Executable E1

Reproduce with [the binding E2E instructions](../../e2e/engine-settings/README.md).
Three cases cover fresh settings, valid legacy product fields and invalid legacy
product enums/types. Inputs derive from Engine's Desktop 0.19.4 fixture. They are
synthetic. They are not actual Mobile upgrade profiles. Saves and restarts preserve
device identity, name, relays and other Engine policies. Product fields disappear
from Engine settings after a successful save.

Three further cases create an original Space and encrypted history, then seed
synthetic rejected pending input. Each case restarts Engine twice and calls session
recovery. Assertions cover all three reasons, fixed re-export guidance, original
Space/device identity, old/new encrypted history and every staged member/tree/marker.
Each boot injects a synthetic journal I/O fault. The public query must throw
1411/Internal/false. The original Space remains usable while the query fails.
Removing only that fault restores the same rejection query. No null result masks failure.
Fixture setup and assertions read synthetic files; product code uses only the public query.

The secure store and clipboard stay in memory. External file callbacks are unavailable.
The iOS mode runs a command-line host, not the Mobile app. Shutdown/delete succeeded,
and a fresh simulator inventory confirms the owned UUID is absent. Receipts retain
actual commands, executables, runtime source/platform and all assertions.

Historical 4c363556 artifacts remain separate. Their three-case E1 and app builds
passed before the rejection contract. They do not accept the final source.
Original setup failures remain in the logs. These include missing modulemap setup
and an eager native-module import in the service. The corrected commands passed.
The service now reads structured failure fields without loading Expo to classify an error.

## Acceptance limits

No browser, VM, Mobile app UI, physical-device install, production profile or OS
keychain was used. Existing Android AVDs and a personal device were inventoried only.
No new unit test or assertion was added. The existing API fixtures include the query. The startup fixture isolates the new
root native notice like its other native root components. Its six assertions remain unchanged.
The primary behavior evidence is the real generated-binding E2E above.

The tests do not execute Expo/React Native UI. They do not verify actual App Group
migration, OS/process restart, real secure storage, pairing, cross-device sync,
background behavior, power loss or upstream compression behavior. Application
compilation and simulator binding execution do not establish device/visual acceptance.

Before release, use authorized isolated iOS/Android data and a traced candidate package:

1. Verify product preferences, device name and relays after an app restart.
2. Verify the three rejection reasons and the new-version re-export instruction.
3. Acknowledge the notice and verify that all pending bytes remain unchanged.
4. Verify query failure, retry and continued use of the original Space.
5. Verify dialog presentation and dismissal on both platforms.
6. Verify pairing and cross-device send/receive.

Do not use the connected personal device without explicit authorization.
