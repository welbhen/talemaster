# TaleMaster — Technical TODO

This file tracks the next engineering tasks for the current foundation phase. It is intentionally separate from the product feature roadmap.

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
- [x] Database directory established beneath `app.getPath('userData')/database`.
- [x] Main-process-owned SQLite connection lifecycle implemented.
- [x] Safe database directory creation and initialization failure handling implemented.
- [x] SQLite foreign-key enforcement and busy-timeout configuration implemented.
- [x] Custom versioned migration runner and migration-history table implemented.
- [x] Transactional migration execution and rollback behavior implemented.
- [x] Initial infrastructure-only migration implemented; no campaign or feature tables introduced.
- [x] Database connection shutdown integrated into the Electron application lifecycle.
- [x] Database infrastructure tests implemented and passing locally.
- [ ] GitHub Actions test execution and CI validation updates: changes prepared; awaiting push and successful GitHub Actions verification.

## Next session — secure Electron IPC boundary

### 1. Secure Electron IPC boundary

- [ ] Define a typed, minimal renderer-facing API in the preload layer.
- [ ] Keep database handles and SQL access exclusively in the main process.
- [ ] Define explicit IPC channel names and handlers; do not expose generic `send`, `invoke`, filesystem, or SQL execution capabilities.
- [ ] Validate IPC payloads at the process boundary.
- [ ] Review sender/origin authorization and error serialization for IPC handlers.
- [ ] Add tests for valid requests, invalid payloads, unauthorized senders, and error responses.
- [ ] Define how main-process services access the database without exposing the connection to the renderer.

### 2. Application data and filesystem conventions

- [ ] Finalize the application data directory layout beneath Electron's `userData` path.
- [ ] Define ownership and lifecycle rules for campaign documents, images, and attachments.
- [ ] Define the persisted ngx-editor structured JSON document format and metadata/reference relationship.
- [ ] Establish safe file naming, path validation, and deletion/orphan handling rules.
- [ ] Decide where application preferences live (SQLite or a separate local settings store).

### 3. Backup, recovery, and integrity

- [ ] Choose a backup approach that safely accounts for SQLite transactions and any WAL files.
- [ ] Define backup naming, retention, and storage location.
- [ ] Define restore validation and failure-recovery behavior.
- [ ] Add database integrity checks and tests for backup/restore.
- [ ] Evaluate WAL mode in the context of the backup and recovery design before enabling it by default.

## Remaining technical foundation decisions

- [ ] Audit the Electron app-level package manifest/lockfile arrangement: retain the app manifest needed by Electron Forge, keep the Nx workspace lockfile authoritative, and remove any redundant nested lockfile only after confirming it is not used by a packaging step.
- [ ] Finalize the custom state-management library API and responsibilities before implementing feature state.
- [ ] Decide the supported operating systems and architectures.
- [ ] Validate native SQLite rebuild/package behavior on each supported target.
- [ ] Define the initial automated test strategy across domain, renderer, Electron, and persistence layers.
- [ ] Define content-provider normalization contracts and source/license metadata requirements.
- [ ] Decide document storage lifecycle and versioning strategy.
- [ ] Evaluate local-network transport and security only when that optional capability enters scope.

## GitHub and project maintenance

- [ ] Verify updated GitHub Actions workflows on GitHub after pushing the CI changes.
- [ ] Ensure formatting, unit tests, and production builds are enforced on pull requests.
- [ ] Configure branch protection/rulesets for `master` after the checks have run successfully.
- [ ] Decide release versioning, changelog, and distribution process.
- [ ] Review supported third-party content licenses before importing or redistributing content.

## Product/design handoff

- [ ] Bring the initial visual decisions from the design conversation into the repository's design documentation.
- [ ] Confirm brand colors, typography, icon usage, and theme conventions.
- [ ] Define the initial application information architecture and Master dashboard direction.

---

**Working rule:** Do not mark a task complete until the implementation exists and the relevant validation has actually been executed.
