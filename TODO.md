# TaleMaster — Technical TODO

This file tracks engineering work for the current foundation phase. It is intentionally separate from the product feature roadmap.

## Current foundation status

- [x] Nx integrated monorepo established.
- [x] Angular dashboard production build verified.
- [x] Electron main/preload build and application assembly verified.
- [x] `better-sqlite3` installed as the Electron runtime dependency.
- [x] Electron Forge native dependency unpacking configured.
- [x] Windows x64 ZIP packaging completed successfully.
- [x] Nx root lockfile pruning issue resolved; Electron package target completed without the earlier warning.
- [x] Shared visual-identity and localization resource foundations established.
- [x] Electron database module boundaries and TypeScript build configuration reviewed.
- [x] Database directory established beneath `app.getPath('userData')/talemaster/database`.
- [x] Main-process-owned SQLite connection lifecycle implemented.
- [x] Safe database directory creation and initialization failure handling implemented.
- [x] SQLite foreign-key enforcement and busy-timeout configuration implemented.
- [x] Custom versioned migration runner and migration-history table implemented.
- [x] Transactional migration execution and rollback behavior implemented.
- [x] Initial infrastructure-only migration implemented; no campaign or feature tables introduced.
- [x] Database connection shutdown integrated into the Electron application lifecycle.
- [x] Database infrastructure tests implemented.
- [x] Root workspace-wide lint command configured.
- [x] Root workspace-wide test command configured.
- [x] Nx recursive root-target invocation issue resolved.
- [x] Dedicated logging library implemented under `libs/logging`.
- [x] Structured logging, console and rotating JSON Lines file transports implemented.
- [x] Logging integrated into the Electron main-process lifecycle.
- [x] Renderer logging integrated through the secure IPC boundary.
- [x] Logging and IPC tests implemented.
- [x] Secure Electron IPC architecture and application integration completed.
- [x] Copyright header configuration and automation implemented.
- [x] Copyright headers applied and compliance validation tested successfully.
- [ ] Verify GitHub Actions test execution and CI validation on the current PR head.
- [ ] Validate Electron production build and packaging with the integrated logging, IPC, and storage infrastructure.

## Completed foundation work

### 1. Logging infrastructure

- [x] Generate a dedicated Nx logging library under `libs/logging`.
- [x] Define the typed logging API with `LOG`, `WARN`, `DEBUG`, and `ERROR` levels.
- [x] Implement ISO 8601 timestamps, contextual logger names, messages, and structured metadata.
- [x] Implement error serialization, including error names, messages, causes, and stack traces.
- [x] Enable `DEBUG` automatically in development and suppress it in production.
- [x] Implement the readable console transport.
- [x] Implement persistent JSON Lines file logging.
- [x] Store logs beneath Electron's `app.getPath('userData')/talemaster/logs` directory.
- [x] Implement size-based log rotation: 5 MB maximum per file and five retained files.
- [x] Ensure logging failures never propagate into application operations or cause recursive logging failures.
- [x] Initialize logging before SQLite so database initialization failures can be recorded.
- [x] Integrate the logger into the Electron main-process lifecycle.
- [x] Replace existing application-level console logging with the appropriate logger methods.
- [x] Implement renderer logging through the secure IPC boundary.
- [x] Add tests for log levels, timestamps, metadata, error serialization, console output, file persistence, rotation, retention, and failure handling.
- [x] Verify development and production logging behavior.

### 2. Copyright headers and compliance automation

- [x] Establish the project copyright header and supported comment syntax.
- [x] Include project-owned source files, tests, and configuration source files; exclude generated/dependency/build/binary files and non-source formats.
- [x] Implement shared copyright-header configuration and add/validation scripts.
- [x] Support dry-run mode, prevent duplicate headers, and preserve file contents, line endings, BOMs, and shebangs.
- [x] Add `copyright:add` and `copyright:check` npm scripts.
- [x] Integrate `copyright:check` into GitHub Actions pull-request validation.
- [x] Add tests for header insertion, validation, exclusions, special file handling, and file discovery.

### 3. Secure Electron IPC boundary

- [x] Define a typed, minimal renderer-facing API in the preload layer.
- [x] Keep database handles and SQL access exclusively in the main process.
- [x] Define explicit IPC channel names and handlers; do not expose generic `send`, `invoke`, filesystem, or SQL execution capabilities.
- [x] Validate IPC payloads at the process boundary.
- [x] Review sender/origin authorization and error serialization for IPC handlers.
- [x] Add tests for valid requests, invalid payloads, unauthorized senders, and error responses.
- [x] Define how main-process services access the database without exposing the connection to the renderer.
- [x] Integrate IPC registration and adapters into the Electron application lifecycle.
- [x] Integrate renderer logging through the explicit preload API.

### 4. Application data and filesystem conventions

- [x] Establish the canonical application root at `app.getPath("userData")/talemaster`.
- [x] Define the storage layout for database, campaigns, content library, backups, logs, and settings.
- [x] Define ownership boundaries: SQLite owns structured records and metadata; the filesystem owns document bodies, assets, backups, and logs.
- [x] Define the versioned structured ngx-editor JSON envelope.
- [x] Decide that application preferences are stored in SQLite and add their migration and CRUD API.
- [x] Implement UUID-derived campaign/document/asset paths, path containment checks, and symlink rejection for managed paths.
- [x] Implement campaign directory initialization and document/asset file operations.
- [x] Keep destructive asset deletion unavailable until metadata-backed ownership/reference checks and recoverable deletion are implemented.
- [x] Document provisional document/asset size limits in source JSDoc; these are arbitrary engineering defaults, not final product requirements.
- [ ] Validate initialization against pre-existing directories and files, repeated startup, and unsafe filesystem entries.
- [ ] Validate existing campaign document reads, malformed documents, asset inventory, and non-destructive behavior.
- [ ] Validate existing SQLite databases upgrade from migration version 1 without losing prior records.
- [ ] Validate migration rollback, interrupted initialization, and unsupported/corrupt migration histories.
- [ ] Validate Windows behavior for replacing existing files atomically.
- [ ] Decide whether to validate file signatures/content types in addition to extension allowlists.
- [ ] Design metadata-backed asset ownership, recoverable deletion/journaling, and orphan reconciliation with the campaign schema before enabling destructive lifecycle operations.
- [ ] Expose only required resource operations through narrowly scoped, sender-authorized IPC contracts when feature/domain contracts are ready.

### 5. Application lifecycle and error handling

- [x] Catch application initialization failures at the Electron `whenReady()` promise boundary.
- [x] Log fatal initialization/window failures where possible and request orderly application shutdown.
- [x] Keep shutdown request guaranteed even if error logging unexpectedly throws.
- [x] Catch asynchronous BrowserWindow content-loading failures and synchronous window-construction failures.
- [ ] Add integration-level verification of startup failure, window load failure, and shutdown behavior in the Electron runtime.

## Remaining technical foundation work

### 1. Backup, recovery, and integrity

- [ ] Choose a backup approach that safely accounts for SQLite transactions and any WAL files.
- [ ] Define backup naming, retention, and storage location.
- [ ] Define restore validation and failure-recovery behavior.
- [ ] Add database integrity checks and tests for backup/restore.
- [ ] Evaluate WAL mode in the context of the backup and recovery design before enabling it by default.

### 2. Architecture and platform decisions

- [ ] Audit the Electron app-level package manifest/lockfile arrangement: retain the app manifest needed by Electron Forge, keep the Nx workspace lockfile authoritative, and remove any redundant nested lockfile only after confirming it is not used by a packaging step.
- [ ] Finalize the custom state-management library API and responsibilities before implementing feature state.
- [ ] Decide the supported operating systems and architectures.
- [ ] Validate native SQLite rebuild/package behavior on each supported target.
- [ ] Define the automated test strategy across domain, renderer, Electron, and persistence layers.
- [ ] Define content-provider normalization contracts and source/license metadata requirements.
- [ ] Decide document storage lifecycle, metadata relationships, and versioning/migration strategy.
- [ ] Evaluate local-network transport and security only when that optional capability enters scope.

## GitHub and project maintenance

- [ ] Verify GitHub Actions workflows and required checks on the current PR head.
- [ ] Ensure formatting, unit tests, production builds, and copyright validation are enforced on pull requests.
- [ ] Configure branch protection/rulesets for `master` after the checks have run successfully.
- [ ] Decide release versioning, changelog, and distribution process.
- [ ] Review supported third-party content licenses before importing or redistributing content.

## Product/design handoff

- [ ] Bring the initial visual decisions from the design conversation into the repository's design documentation.
- [ ] Confirm brand colors, typography, icon usage, and theme conventions.
- [ ] Define the initial application information architecture and Master dashboard direction.

---

**Working rule:** Do not mark a task complete until the implementation exists and the relevant validation has actually been executed. A test being added is not the same as that test passing.
