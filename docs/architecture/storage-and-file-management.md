# Application Storage and File-Management Conventions

**Status:** Proposed implementation baseline  
**Scope:** Local persistence conventions beneath Electron's application data root.

## 1. Application data root

The canonical application root is:

```text
app.getPath("userData")/talemaster
```

This is an established project decision. All application-owned persistent data lives beneath this directory. Do not create a second application root or place TaleMaster data directly in the parent `userData` directory.

## 2. Directory layout

```text
<userData>/talemaster/
├── database/
│   └── talemaster.sqlite
├── campaigns/
│   └── <campaign-id>/
│       ├── documents/
│       ├── images/
│       └── attachments/
├── content-library/
├── backups/
│   ├── full/
│   └── campaigns/
│       └── <campaign-id>/
├── logs/
└── settings/
```

The database and logs locations preserve the existing implementation. Campaign and backup directories are owned by the Electron main process. The `settings/` directory is reserved; preferences are stored in SQLite, so it must not become a parallel settings store.

## 3. Storage ownership

| Data                                                   | Storage             |
|--------------------------------------------------------|---------------------|
| Campaigns, players, characters, sessions, dice history | SQLite              |
| Document metadata and campaign/resource relationships  | SQLite              |
| Rich-text document bodies                              | Campaign filesystem |
| Images and attachments                                 | Campaign filesystem |
| Imported structured game content                      | SQLite              |
| Application preferences                                | SQLite              |
| Backup archives and staging data                       | Filesystem          |
| Application logs                                       | Filesystem          |

SQLite is authoritative for structured records and resource ownership. The filesystem stores document bodies and binary resources. The renderer never accesses persistent paths directly.

No campaign or feature tables are implied by this document; their domain schemas must be designed separately.

## 4. Campaign resource identity and paths

Campaign directories are named using the campaign's stable ID, never its display name.

Document paths are deterministic:

```text
campaigns/<campaign-id>/documents/<document-id>.json
```

Image and attachment filenames use generated resource IDs and a validated extension:

```text
campaigns/<campaign-id>/images/<asset-id>.<extension>
campaigns/<campaign-id>/attachments/<asset-id>.<extension>
```

User-provided names are display metadata only. They are never used as path segments. Paths are derived by main-process code from validated IDs and stored resource metadata; renderer requests use IDs, not paths.

## 5. Rich-text document format

Persist the ngx-editor structured document model as JSON, not rendered HTML. Each document file uses a versioned envelope:

```json
{
  "formatVersion": 1,
  "content": {}
}
```

`content` contains the editor's structured document value. The persistence layer validates the envelope and supported version; it does not silently coerce unknown versions. The exact editor JSON schema should be validated against the installed ngx-editor/ProseMirror version when the persistence adapter is implemented.

SQLite owns document identity, campaign ownership, title, timestamps, and any future indexing metadata. The body file does not duplicate those fields. Renaming a document does not rename its file. Document IDs and campaign IDs are immutable.

## 6. File operation rules

All persistent filesystem operations run in the Electron main process.

- Resolve every path from the canonical application root; never accept an absolute path from the renderer.
- Validate IDs and resource ownership at IPC boundaries.
- Reject path traversal, symbolic links, unexpected filesystem entry types, and paths escaping the intended campaign directory.
- Use generated filenames; validate extensions and file size/type before storing binary resources. Current size limits are provisional arbitrary engineering defaults documented in source JSDoc, not finalized product requirements.
- Write new content to a uniquely named temporary file in the destination directory, flush and close it, then rename it into place.
- Use the existing storage coordinator for operations that must be consistent with snapshots.
- Never expose generic filesystem read/write/delete IPC methods.
- Do not expose destructive asset deletion until SQLite metadata can verify ownership/references and a recoverable deletion sequence is implemented.

## 7. Lifecycle and recovery

SQLite transactions and filesystem operations are not one atomic transaction. Resource operations therefore require explicit recoverable sequencing.

- **Create:** validate; write and flush a temporary file; rename into place; persist metadata; reconcile a file left behind if metadata persistence fails.
- **Update:** write and flush a temporary replacement; atomically replace the file; update metadata in the coordinated operation. Preserve the previous valid file until replacement is ready.
- **Delete:** enforce reference rules; record a recoverable deletion state or equivalent journal; remove the file; finalize metadata. Do not silently swallow filesystem failures. This operation is not implemented/enabled yet.
- **Startup/integrity scan:** detect missing referenced files, unreferenced files, stale temporary files, and incomplete deletion states. Report and reconcile safely.
- **Orphans:** never automatically delete unreferenced files on ordinary startup. Cleanup is explicit and only after verification.

The exact journal representation and transaction boundaries must be designed alongside the persistence service, not improvised separately by individual features.

## 8. Preferences

Application preferences belong in SQLite so they participate in the same database backup and restore lifecycle. Keep transient runtime state out of persistent preferences. The reserved `settings/` directory is not a second source of truth.

## 9. Backup boundary

- A full backup includes the SQLite database snapshot and all application-owned data required to restore the application: campaign resources, content library, and persistent preferences (inside SQLite).
- A campaign backup includes that campaign's structured records and its documents, images, and attachments. The exact relational export boundary depends on the campaign schema and must be defined when those tables exist.
- Backup staging and archives live beneath `backups/`; staging is not part of the backup source being archived.
- Backup and restore operations use the storage coordinator and the existing verified archive/manifest foundation.

## 10. Implementation sequence

1. Add a typed application storage-path resolver rooted at `app.getPath("userData")/talemaster`; centralize directory creation and path containment.
2. Define resource/document persistence contracts in the appropriate libraries without introducing Electron dependencies into domain/database libraries.
3. Implement main-process filesystem adapters and narrowly scoped IPC operations.
4. Implement versioned document read/write and atomic replacement.
5. Implement resource metadata integration when the relevant domain schema is approved.
6. Implement recoverable deletion and an integrity/orphan scanner.
7. Integrate the resulting storage inventory with full and campaign backup/restore workflows.

## 11. Explicit non-goals

- No campaign schema is defined here.
- No document revision/history feature is introduced.
- No arbitrary user-controlled filesystem paths.
- No automatic orphan deletion.
- No change to the established application data root.
