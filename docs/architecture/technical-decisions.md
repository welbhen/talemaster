# TaleMaster — Technical Decisions

**Status:** Current implementation baseline  
**Last updated:** 2026-11-25  
**Supersedes:** The initial discovery baseline in the November 17, 2026 technical foundation document where this document records a more specific decision.

This document records decisions that implementation work must preserve. Proposed or deferred items are labeled explicitly; they are not implementation authorization.

## Product and application principles

- TaleMaster is a desktop-first, offline-first tabletop RPG management application.
- The architecture is system-agnostic; D&D is the initial content ecosystem.
- The local machine is authoritative for application data.
- The initial user experience is Master-first.
- Optional LAN multiplayer is not required for the initial standalone application.
- The application has **no login, authentication, roles, or permission system** in the current product scope. All application features are available to anyone using the local application.
- A lightweight local profile is a convenience/personalization feature, not a security identity. Profiles contain a nickname and optional profile picture and can be switched at any time. Profile-based access control and data isolation are explicitly out of scope.

## Technology and workspace

- Nx integrated monorepo; no npm workspaces.
- Angular + TypeScript renderer.
- Electron desktop runtime and Node.js main process.
- Application names: `apps/dashboard` and `apps/electron`.
- Optimus UI, OpenNG Icons, Optimus UI Themes, Transloco, and ngx-editor.
- SQLite through `better-sqlite3`; database access is main-process-only.
- ZIP archive support through the approved `@zip.js/zip.js` dependency.
- The Nx workspace lockfile is authoritative. Keep the Electron app manifest required by packaging; do not add a second dependency-management workspace.

## Application data root and ownership

The canonical application root is exactly:

```text
app.getPath('userData')/talemaster
```

Do not introduce another application root or revisit this decision.

- SQLite stores structured records, metadata, preferences, and profile records.
- The filesystem stores document bodies, binary assets, backups, and logs.
- All persistent filesystem access belongs to Electron main-process services.
- Renderer code receives narrowly scoped capabilities through preload and explicit IPC contracts; it never receives arbitrary paths or unrestricted filesystem/database access.

## Electron security boundary

- `contextIsolation: true`.
- `nodeIntegration: false`.
- Sandboxed renderer.
- Preload exposes a typed, minimal capability API only.
- No generic `send`, `invoke`, filesystem, or SQL API is exposed to the renderer.
- IPC requests are validated and authorized against the trusted application renderer.
- SQL uses parameterized queries.
- External URL handling must be explicit and safe.

## Logging decision

- `libs/logging` owns the shared logging types and implementation.
- Electron main owns logger construction, transports, and persistent log files under `userData/talemaster/logs`.
- Angular uses an injectable renderer logger service; it does not import the Node-oriented logging implementation.
- Renderer log entries cross the restricted preload API over the dedicated `logging:write` IPC channel.
- The main-process logging adapter validates the renderer payload and forwards it to the existing application logger/file transport.
- Angular's framework-level unhandled errors are routed through the renderer logger.
- Renderer logging must be non-blocking and must fall back safely when IPC is unavailable. Logging failures must not cause recursive logging or application failures.
- Renderer logging must not create a second file transport or write directly to the filesystem.

## Local profile decision

- Profiles are local convenience profiles, not accounts or authorization principals.
- Profile records contain a UUID, nickname (1–40 printable characters), optional avatar filename, active flag, and timestamps; records and active-profile state are stored in SQLite.
- Profile pictures are copied into `userData/talemaster/profile-avatars`; the database stores only a generated managed filename.
- File selection and filesystem operations are performed by Electron main through narrow IPC capabilities.
- Avatar files are limited to 2 MiB and PNG, JPEG, or WebP signatures; generated filenames and atomic file writes are used. SVG and arbitrary file paths are not accepted.
- The renderer receives bounded image data URLs through the profile IPC response; it never receives avatar filesystem paths.
- First launch must work without forcing profile creation; a default profile experience is provided.
- Profiles may be created, edited, and switched freely; the initial profile-management view is available at the renderer root.
- Profile pictures replaced by a new picture are retained for now; automatic deletion/orphan cleanup is deferred until a recoverable asset lifecycle is designed.
- Whether campaigns or other domain data are associated with a profile is **not decided** and must not be inferred by implementation.

## Renderer application shell

- Angular Router owns renderer navigation.
- The shell provides the main navigation, top bar, active-profile entry point, and routed content area.
- Initial navigation entries may include Dashboard, Campaigns, Characters, Compendium, Notes, and Settings. Future feature entries remain placeholders until their features are implemented.
- Theme and language preferences persist through the existing SQLite-backed application preferences boundary.
- Supported initial languages are English (en-US) and Brazilian Portuguese (pt-BR).

## Persistence and migration rules

- SQLite is initialized and owned by Electron main.
- Custom versioned migrations are transactional and preserve existing data.
- Foreign keys are enabled and busy timeout is configured.
- WAL mode remains disabled until the backup/recovery design explicitly approves it.
- Do not invent campaign or other domain schemas as part of infrastructure work.
- Filesystem and database operations are not assumed to form one atomic transaction; destructive operations require explicit recoverable sequencing.

## Deferred decisions

The following remain open and require design when their scope is reached:

- Final domain schemas for campaigns, players, characters, sessions, and resource ownership.
- Profile-to-campaign/data relationships.
- Recoverable filesystem/database journaling and orphan reconciliation.
- Backup/restore retention and recovery behavior; WAL evaluation.
- Custom state-management library API.
- Supported operating systems and architectures.
- Content-provider normalization and licensing boundaries.
- Local-network transport and its security model.
- Release/versioning/distribution process.

## Engineering rules

- Follow SOLID, DRY, and KISS where appropriate.
- Prefer high cohesion, low coupling, explicit contracts, and modular testable code.
- Validate all external/process-boundary input.
- Keep dependencies minimal and justify additions.
- Do not implement unrelated refactors or expand scope without approval.
- Tests and builds must be executed before reporting them as successful.
