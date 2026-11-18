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

## Next session — persistence foundation

### 1. SQLite infrastructure

- [ ] Confirm the Electron app's database module boundaries and TypeScript build configuration.
- [ ] Audit the Electron app-level package manifest/lockfile arrangement: retain the app manifest needed by Electron Forge, keep the Nx workspace lockfile authoritative, and remove any redundant nested lockfile only after confirming it is not used by a packaging step.
- [ ] Define the database path under `app.getPath('userData')`, using a dedicated `database/` directory.
- [ ] Implement a single main-process-owned `better-sqlite3` connection lifecycle.
- [ ] Create the database directory safely and handle initialization failures explicitly.
- [ ] Establish conservative SQLite connection defaults, including foreign-key enforcement and a deliberate busy-timeout policy.
- [ ] Implement a small, versioned migration runner with a migration-history table.
- [ ] Make each migration transactional where supported and define failure/rollback behavior.
- [ ] Add an initial infrastructure-only migration; do not add campaign or feature tables until their domain requirements are designed.
- [ ] Close the database cleanly during application shutdown.
- [ ] Add unit/integration tests for initialization, migration ordering, repeat startup, migration failure, and connection shutdown.
- [ ] Evaluate WAL mode in the context of the backup and recovery design before enabling it by default.

### 2. Secure Electron IPC boundary

- [ ] Define a typed, minimal renderer-facing API in the preload layer.
- [ ] Keep database handles and SQL access exclusively in the main process.
- [ ] Define explicit IPC channel names and handlers; do not expose generic `send`, `invoke`, filesystem, or SQL execution capabilities.
- [ ] Validate IPC payloads at the process boundary.
- [ ] Review sender/origin authorization and error serialization for IPC handlers.
- [ ] Add tests for valid requests, invalid payloads, unauthorized senders, and error responses.

### 3. Application data and filesystem conventions

- [ ] Finalize the application data directory layout beneath Electron's `userData` path.
- [ ] Define ownership and lifecycle rules for campaign documents, images, and attachments.
- [ ] Define the persisted ngx-editor structured JSON document format and metadata/reference relationship.
- [ ] Establish safe file naming, path validation, and deletion/orphan handling rules.
- [ ] Decide where application preferences live (SQLite or a separate local settings store).

### 4. Backup, recovery, and integrity

- [ ] Choose a backup approach that safely accounts for SQLite transactions and any WAL files.
- [ ] Define backup naming, retention, and storage location.
- [ ] Define restore validation and failure-recovery behavior.
- [ ] Add database integrity checks and tests for backup/restore.

## Remaining technical foundation decisions

- [ ] Finalize the custom state-management library API and responsibilities before implementing feature state.
- [ ] Decide the supported operating systems and architectures.
- [ ] Validate native SQLite rebuild/package behavior on each supported target.
- [ ] Define the initial automated test strategy across domain, renderer, Electron, and persistence layers.
- [ ] Define content-provider normalization contracts and source/license metadata requirements.
- [ ] Decide document storage lifecycle and versioning strategy.
- [ ] Evaluate local-network transport and security only when that optional capability enters scope.

## GitHub and project maintenance

- [ ] Add the repository workflows from `.github/workflows/` and verify them on GitHub Actions.
- [ ] Add lint, unit-test, and production-build checks to CI once their expected baseline is confirmed.
- [ ] Configure branch protection/rulesets for `master` after the checks have run successfully.
- [ ] Decide release versioning, changelog, and distribution process.
- [ ] Review supported third-party content licenses before importing or redistributing content.

## Product/design handoff

- [ ] Bring the initial visual decisions from the design conversation into the repository's design documentation.
- [ ] Confirm brand colors, typography, icon usage, and theme conventions.
- [ ] Define the initial application information architecture and Master dashboard direction.

---

**Working rule:** Do not mark a task complete until the implementation exists and the relevant validation has actually been executed.
