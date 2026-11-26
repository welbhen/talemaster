# Renderer Application Foundation

**Status:** Implementation plan for the renderer foundation phase  
**Delivery:** Four sequential pull requests, each based on the latest merged `master`.

## Delivery sequence

| Order | Branch                                 | Scope                                                        | Pull request |
| ----- | -------------------------------------- | ------------------------------------------------------------ | ------------ |
| 1     | `feature/renderer-logging-foundation`  | WP1 — renderer logging and framework error integration       | PR 1         |
| 2     | `feature/local-profiles`               | WP2 + WP3 — local profile persistence and profile experience | PR 2         |
| 3     | `feature/application-shell`            | WP4 + WP5 — application shell, navigation, preferences       | PR 3         |
| 4     | `feature/renderer-integration-quality` | WP6 — integration and quality gates                          | Final PR     |

Each PR must be merged before the next branch is created from the updated `master`. Do not stack dependent branches on unmerged PR heads.

## WP1 — Renderer logging foundation

### Required behavior

- Provide an Angular-injectable `LoggerService` with debug, info/log, warn, and error methods.
- Forward renderer log entries through the existing narrow `electronAPI.logging.write` capability.
- Keep the existing `logging:write` IPC contract and main-process logging adapter as the only persistence path.
- Register IPC adapters in the Electron main-process lifecycle behind the existing trusted-sender security check.
- Route Angular framework errors through a custom Angular `ErrorHandler` backed by the renderer logger.
- Serialize errors and metadata into structured-clone-safe, bounded values.
- Never block UI work waiting for disk I/O. Logging IPC failures must be caught and sent to a safe console fallback without recursive logging.
- Preserve the existing rotating main-process file transport under `userData/talemaster/logs`.

### Validation

- Unit tests for renderer logger mapping, error serialization, metadata normalization, missing preload API, and rejected IPC calls.
- Unit tests for the Angular ErrorHandler.
- Electron adapter/registration tests for validation and trusted-sender enforcement.
- Electron and Angular build, lint, and test commands.
- Verify persisted renderer log entries in an Electron runtime or integration test where the environment supports it.

## WP2 + WP3 — Local profiles

- Profiles are convenience profiles only; no authentication, roles, or permissions.
- Support nickname, optional profile picture, create/edit/list/switch, and persistence across restarts.
- Provide a default/guest first-launch experience without mandatory setup.
- Persist profile metadata and active profile selection in SQLite.
- Copy selected avatar files into application-managed storage under `userData/talemaster`; never rely on the source file remaining available.
- Validate avatar file type, decoded image, and size in the main process. Use generated filenames and narrow IPC methods.
- Do not infer profile ownership of campaigns or other data. That relationship remains deferred.

## WP4 + WP5 — Angular application shell

- Implement the desktop-first shell with sidebar, top bar, and router outlet.
- Provide initial navigation entry points and honest placeholders for features not yet implemented.
- Integrate the existing Optimus UI/theme setup, theme persistence, and Transloco language switching/persistence.
- Surface the active profile and profile switching in the shell.
- Support loading, empty, and error states with consistent UI conventions.
- No login, registration, access-denied, or permissions UX.

## WP6 — Integration and quality

- Validate the complete renderer-to-main lifecycle.
- Add/update unit, integration, and end-to-end smoke coverage for startup, renderer logging, profiles, navigation, and preferences.
- Run formatting, copyright, lint, tests, production builds, Electron assembly, and packaging validations available in CI.
- Reconcile this document and `TODO.md` with actual implementation and executed validation results.

## Package scripts

Root npm scripts are the supported developer entry points. Keep focused commands for dashboard, Electron, tests, lint, builds, assembly, formatting, and copyright checks. A combined verification script should run the same core checks developers and CI rely on; it must not silently skip a failing command.

## Scope exclusions

- No login, authentication, authorization, roles, or permissions.
- No cloud accounts or profile synchronization.
- No campaign/character feature implementation in this phase.
- No multiplayer/networking.
- No profile-based data partitioning.
