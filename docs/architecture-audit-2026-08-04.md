# Code-Only Architecture Audit

Date: 2026-08-04
Last updated: 2026-08-04 (post-remediation pass)
Scope: source code, build output, CI/CD pipelines, runtime artifacts, and executable configuration only.
Excluded: all files under docs and other narrative documentation.

## Executive Summary

The codebase has a solid architectural direction for isolated, framework-agnostic distribution through Native Federation and Angular Elements. The production build is stable and small-to-moderate in size. Three Priority-0 code issues identified during the initial audit have been resolved: the embed protocol is now wired into SPA startup, listener lifecycle leaks are fixed in both the SDK and the PostMessageService, and the stale debug code in polyfills.ts has been removed. Remaining open risks are around test coverage, deployment pipeline contracts, and CORS policy.

Overall implementation maturity: Medium-High.

## Scorecard (0-10)

- Maintainability: 7.2
- Reusability: 7.7
- Robustness: 7.0
- Size and performance: 7.4
- Security: 7.8
- Testability and quality gates: 4.2
- Deployability and release reliability: 8.5
- Accessibility and UX resilience: 6.1
- Observability and supportability: 3.8

## Evidence Base

Primary implementation files reviewed:
- src/main.ts
- src/embed-sdk.ts
- src/app/date-picker/*
- src/app/data-grid/*
- src/app/shared/post-message.service.ts
- angular.json
- federation.config.js
- staticwebapp.config.json
- package.json
- scripts/create-federation-aliases.js
- .github/workflows/azure-static-web-apps-calm-flower-07ba9db00.yml
- azure-pipelines.yml
- tsconfig*.json
- lint/build command output and dist artifact inventory

## Critical Findings

### 1) ~~Embed protocol support exists but is not integrated into SPA startup flow~~ ✅ RESOLVED

Resolution (2026-08-04):
- `src/main.ts` now calls `getPostMessageService({ allowedOrigins: environment.allowedOrigins })` before Angular bootstraps, ensuring the message listener is active from the first frame and `allowedOrigins` from the environment config is properly wired in.

### 2) ~~Embed SDK listener lifecycle leak risk~~ ✅ RESOLVED

Resolution (2026-08-04):
- `EmbedInstance` in `src/embed-sdk.ts` now stores the bound handler as `boundMessageHandler` and calls `window.removeEventListener` in `destroy()`, eliminating the leak for long-lived host apps that mount/unmount many embeds.
- `PostMessageService` in `src/app/shared/post-message.service.ts` received the same fix plus a public `destroy()` method for explicit teardown.

### 3) ~~Build/deploy path contract is split across outputs and pipelines~~ ✅ RESOLVED

Resolution (2026-08-04):
- Root cause identified: `@angular/build:application` appends a `/browser` subdirectory inside `outputPath`, so `outputPath: "dist/browser"` produced `dist/browser/browser/` — one level deeper than intended.
- Fixed by changing `outputPath` in `angular.json` from `"dist/browser"` to `"dist"`. Browser assets now land directly in `dist/browser/` with no nesting.
- `scripts/create-federation-aliases.js` updated to use the single canonical path `dist/browser` directly; the dual-path fallback probe is removed.
- GitHub Actions "Resolve deploy directory" step simplified to set `DEPLOY_DIR=dist/browser` unconditionally; both index.html and remoteEntry.json presence are verified before continuing.

### 4) ~~Azure DevOps pipeline artifact publish path likely incorrect~~ ✅ RESOLVED

Resolution (2026-08-04):
- Added a `CopyFiles@2` task that copies the `dist/browser` output into `$(Build.ArtifactStagingDirectory)` before the `PublishBuildArtifacts@1` task runs.
- Added a bash verification step that fails the pipeline with a clear error message if `index.html` or `remoteEntry.json` are missing.
- Added a step to copy `staticwebapp.config.json` into the deploy directory, matching what the GitHub Actions workflow already did.
- A `BUILD_OUTPUT_DIR` pipeline variable (`dist/browser`) is now declared at the top of `azure-pipelines.yml` as the single definition of the output path for both copy and verification steps.

### 5) ~~Static web app headers are permissive by default~~ ✅ RESOLVED

Resolution (2026-08-04):
- Removed the blanket `Access-Control-Allow-Origin: *` from `globalHeaders` in `staticwebapp.config.json`. HTML responses no longer carry a wildcard CORS header.
- `Access-Control-Allow-Origin: *` is retained only on `/remoteEntry.json` and `/*.js` routes, where cross-origin fetching by federation consumers is the intended behaviour.
- Added hardening headers globally: `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`.
- `X-Frame-Options` is intentionally omitted: this app is designed to be embeddable by any host; restricting framing would break its core purpose.

Open note:
- `Access-Control-Allow-Headers: *` was also removed from `globalHeaders`; simple GET/OPTIONS requests do not require it and its presence was broader than needed.

### 6) Test safety net is minimal

Why it matters:
- Contract-heavy architecture (web components + postMessage) requires strong automated regression tests.

Code signals:
- no *.spec.ts files found under src.
- test harness is present (karma/jasmine) but no implementation tests detected.

Risk:
- Breakages in component contracts, protocol, and event semantics may ship undetected.

## Category Assessment

### Maintainability

Strengths:
- Strict TypeScript and Angular template strictness are enabled.
- Components are separated by domain with clear type files.
- Build/deploy scripts are concise.

Weaknesses:
- Mixed contract assumptions between app runtime and embed SDK.
- Some any usage in public messaging and row data structures reduces type safety.
- Lifecycle hooks are present but lint warns lifecycle interfaces are not implemented.

### Reusability

Strengths:
- Angular Elements registration is clean and guarded against duplicate registration.
- Inputs/outputs are explicit in DatePicker/DataGrid components.
- Federation exposes are minimal and focused.

Weaknesses:
- Runtime integration patterns are not codified in code-level compatibility tests.
- Alias mapping relies on manifest shape and can fail silently for unexpected changes.

### Robustness

Strengths:
- Origin checking exists in SDK and postMessage service.
- messageQueue in SDK mitigates early-send race.
- Listener cleanup is now explicit in both EmbedInstance and PostMessageService.
- PostMessageService is initialised at SPA startup with environment-sourced allowed origins.

Remaining weaknesses:
- payload validation is shallow (type-only allowlist, many any payloads).
- dispatchCustomEvent uses (this as any).el assumptions in components.

### Size and Performance

Observed production artifact sizes:
- chunk-FIPEZK7K.js: 151,104 bytes
- main-RFXKYTHH.js: 98,476 bytes
- polyfills-2ZZPFYBY.js: 45,203 bytes
- DataGrid-I7MMHBKG.js: 7,718 bytes
- DatePicker-GG4F7S5H.js: 5,862 bytes

Interpretation:
- Reasonable for isolated distribution mode.
- Initial estimated transfer reported by build is modest.

Performance concerns:
- Duplicate runtimes are expected with full isolation strategy.
- No automated bundle regression thresholds beyond coarse angular budgets.

### Security

Strengths:
- postMessage origin checks are implemented in EmbedInstance (host SDK); origin is always derived from `config.src`.
- iframe sandbox attribute is explicitly set in SDK.
- `isPostMessagePayload` runtime guard validates the full protocol structure before any message is dispatched, replacing the previous loose string-check allowlist.
- Discriminated union types (`PostMessagePayload`) eliminate `any` from all message payload paths; each message type has a narrow, named shape.
- `EmbedError.details` narrowed from `any` to `unknown`.
- CORS wildcard removed from HTML responses; only federation asset routes retain it.
- Hardening headers (`X-Content-Type-Options`, `Referrer-Policy`) added globally.
- Open-embed origin policy in `PostMessageService` is an explicit design decision: when no `allowedOrigins` is configured, messages from any origin are accepted so any host can embed; when a list is supplied, it is strictly enforced.

Remaining gaps:
- No Content-Security-Policy header defined (depends on deployment environment).
- Auth tokens travel in postMessage payloads without an additional envelope signature.

### Testability and Quality Gates

Current state:
- Lint runs and currently reports warnings (not errors).
- No unit specs detected.
- Build is green.

Impact:
- Quality gates mostly validate compilation style, not behavior.

### Deployability and Operations

Strengths:
- GitHub Actions workflow and Azure DevOps pipeline now deploy the same artifact layout from the same canonical path (`dist/browser`).
- Both pipelines verify that `index.html` and `remoteEntry.json` are present before deploying; a missing file fails the pipeline with a clear error message.
- `staticwebapp.config.json` is copied into the deploy directory by both pipelines.
- `create-federation-aliases.js` uses a single pinned output path; no runtime path probe ambiguity.
- `BUILD_OUTPUT_DIR` variable in `azure-pipelines.yml` is the single definition of the output path.

Remaining gaps:
- No automated smoke test (HTTP status check) after deployment to confirm the live URL serves the expected content.

### Accessibility and UX Resilience

Strengths:
- aria labels exist on key controls.
- fallback empty state in data grid is present.

Gaps:
- no automated a11y checks.
- keyboard interaction behavior not verified by tests.

### Observability and Supportability

Current state:
- Console logging is primary observability mechanism.
- no telemetry abstraction for embed lifecycle and protocol failures.

Impact:
- difficult production diagnosis for host/embed integration issues.

## Additional Technical Debt Signals

- ~~src/polyfills.ts references debug helpers without visible imports and may be stale or unsafe~~ (resolved: stale code removed; file now documents that no polyfills are needed for the zoneless build).
- TypeScript tooling reports deprecation/migration warnings in tsconfig settings (baseUrl/downlevelIteration/moduleResolution) and rootDir layout warnings; these should be addressed before TS7 migration windows.

## Prioritized Remediation Plan

### Priority 0 (Immediate) — COMPLETED 2026-08-04

1. ✅ Wire runtime postMessage handling into SPA startup path (theme, locale, auth, navigation).
2. ✅ Add SDK listener teardown in destroy and prevent duplicate registrations.
3. ✅ Remove stale debug helpers from polyfills.ts.
4. ✅ Unify output/public path contract and make both CI systems publish the same artifact layout.

### Priority 1 (Next Sprint)

1. Replace wildcard CORS with explicit origin policy where required.
   - ~~Removed global wildcard; asset-level wildcard retained intentionally for open federation.~~ ✅ DONE
2. ~~Add protocol payload schema validation~~ ✅ DONE — replaced with discriminated union types and `isPostMessagePayload` runtime guard.
3. Add first behavior tests for DatePicker, DataGrid, and postMessage protocol.

### Priority 2 (Following Sprint)

1. Add compatibility test fixtures for framework consumers.
2. Add bundle-size regression tracking in CI (gzip/brotli).
3. Introduce telemetry hooks in embed SDK for ready/error/rejected-origin events.

## KPI Baseline Suggestions

- Unit/integration test count: currently near zero for feature contracts.
- Lint warnings: 4 current warnings in lifecycle interface usage.
- Build success: passing.
- Artifact contract stability: medium risk due to dual output path handling.

## Final Verdict

All Priority-0 items and Priority-1 security/payload items are resolved. Both CI pipelines now deploy the same verified artifact from `dist/browser`. The codebase is production-deployable with a clear and consistent release path. The remaining significant risk is low behavioral test coverage for component contracts.
