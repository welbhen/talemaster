<div align="center">

<img src="libs/visual-identity/assets/logos/logo.png" alt="TaleMaster" width="160" />

# TaleMaster

**An offline-first, system-agnostic workspace for tabletop RPG campaigns.**

[Website](#) · [Getting started](#getting-started) · [Technology stack](#technology-stack) · [Architecture](#architecture-overview) · [Contributing](#contributing)

</div>

---

## About

TaleMaster is a desktop-first workspace for Game Masters to prepare, organize, document, and run tabletop role-playing campaigns.

The initial content focus is Dungeons & Dragons, while the underlying product architecture is designed to remain system-agnostic so that other tabletop RPG systems can be supported in the future.

### Product Principles

- **Desktop-first:** Designed primarily for a rich desktop experience.
- **Offline-first:** Core campaign workflows must remain available without an internet connection.
- **Local data ownership:** Campaign data belongs to the user and is stored locally.
- **Game Master-first:** Tools and workflows prioritize the person preparing and running the game.
- **Optional connectivity:** Local-network play is a future capability, not a requirement for the standalone application.
- **Maintainable by design:** Modular boundaries, testability, and deliberate technical decisions take priority over premature abstraction.

## Project Status

<sub>Early development — technical foundation in progress.</sub>

The repository currently contains the foundational infrastructure for the TaleMaster desktop application, including:

- Nx integrated monorepo and Angular dashboard.
- Electron main process and restricted preload layer.
- Secure, typed IPC communication between the renderer and main process.
- Main-process-owned SQLite database infrastructure with versioned migrations.
- Dedicated logging infrastructure with console and rotating file transports.
- Shared visual identity and localization resources.
- Copyright header and compliance automation.
- Electron Forge packaging configuration for Windows x64.

The application is still in its foundation phase. The product capabilities below describe the intended direction and should not be interpreted as already implemented functionality.

### Planned Capabilities

- Campaign organization and session history.
- Player and character management.
- Story and adventure documentation with rich-text editing.
- Virtual dice, modifiers, and roll history.
- Locally managed game-content library.
- Localization, initially English and Brazilian Portuguese.
- Optional host-authoritative local-network sessions in a later phase.

## Technology Stack

| Area                   | Technology              | Responsibility                                                 |
| ---------------------- | ----------------------- | -------------------------------------------------------------- |
| Workspace              | Nx Monorepo             | Applications, libraries, builds, and testing                   |
| Renderer               | Angular + TypeScript    | Application interface and client-side behavior                 |
| Desktop Runtime        | Electron + Node.js      | Desktop lifecycle and privileged operating-system capabilities |
| UI                     | Optimus UI              | Component library                                              |
| Icons                  | OpenNG Icons            | Icon system                                                    |
| Themes                 | Optimus UI Themes       | Application theming                                            |
| Localization           | Transloco               | Translation and locale management                              |
| Rich Text              | ngx-editor              | Structured rich-text editing                                   |
| Structured Persistence | SQLite + better-sqlite3 | Local application data                                         |
| Logging                | Custom Logging Library  | Structured application logging and log persistence             |
| IPC                    | Custom IPC Bridge       | Typed communication infrastructure                             |
| Unit Testing           | Jest                    | Unit and integration-level tests                               |
| Packaging              | Electron Forge          | Desktop application packaging                                  |

## Architecture Overview

TaleMaster separates the user interface from privileged desktop capabilities.

### Application Layers

- **Angular Renderer:** Presentation, user interaction, localization, and client-side state.
- **Electron Main Process:** Application lifecycle, database and filesystem access, operating-system integration, and authorized IPC handlers.
- **Preload Bridge:** Exposes a deliberately small, typed API to the renderer without granting unrestricted Node.js access.
- **Shared Libraries:** Provide reusable infrastructure and domain capabilities with clearly defined responsibilities.

### Workspace Libraries

The infrastructure is separated into dedicated Nx libraries:

| Library                | Responsibility                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `libs/database`        | SQLite connection lifecycle, database contracts, migrations, and persistence infrastructure |
| `libs/logging`         | Logging contracts, logger implementation, console output, and rotating file transport       |
| `libs/ipc-bridge`      | Generic IPC transport abstractions and typed invocation infrastructure                      |
| `libs/i18n`            | Localization resources                                                                      |
| `libs/visual-identity` | Shared visual assets and SCSS resources                                                     |
| `libs/scripts`         | Repository maintenance and automation scripts                                               |

Electron acts as the composition root for application infrastructure and owns Electron-specific adapters, IPC registration, sender authorization, and service integration.

Feature libraries should not depend directly on Electron APIs or generic IPC transport infrastructure. Domain logic should remain independent of Angular and Electron.

### Security Boundaries

The renderer must not access SQLite directly.

Database operations belong exclusively to the Electron main process and are exposed only through explicit, validated IPC operations.

The application follows these security principles:

- Context isolation enabled.
- Node.js integration disabled in the renderer.
- Restricted preload API.
- Explicit IPC channels and sender authorization.
- Runtime validation of untrusted IPC payloads.
- Parameterized SQL statements.
- No unrestricted renderer filesystem access.

### Local Data

The local machine is the authoritative source of application data.

The database resides beneath Electron's `app.getPath('userData')` directory, rather than the application installation directory.

The current database infrastructure includes:

- Main-process-owned SQLite connections.
- Versioned database migrations.
- Transactional migration execution.
- Foreign-key enforcement.
- Configured SQLite busy timeout.

The intended storage responsibilities are:

| Data                                         | Storage          |
| -------------------------------------------- | ---------------- |
| Campaigns, players, characters, and sessions | SQLite           |
| Document metadata and references             | SQLite           |
| Storytelling documents                       | Local filesystem |
| Images and attachments                       | Local filesystem |
| Application logs                             | Local filesystem |
| Backups                                      | Local filesystem |

The document storage lifecycle, backup strategy, and recovery procedures remain under development.

## Repository Layout

```text
apps/
├── dashboard/              # Angular renderer application
└── electron/               # Electron main process, preload, and packaging

libs/
├── database/               # SQLite infrastructure and migrations
├── ipc-bridge/             # Generic typed IPC infrastructure
├── logging/                # Structured application logging
├── i18n/                   # Translation resources
├── visual-identity/        # Shared visual assets and SCSS resources
└── scripts/                # Repository maintenance scripts
    └── copyright/          # Copyright header automation

.github/
└── workflows/              # GitHub Actions workflows

README.md
TODO.md
nx.json
package.json
package-lock.json
```

This represents the current high-level workspace organization. Additional domain and feature libraries will be introduced as product development progresses.

## Getting Started

### Prerequisites

The current development environment uses:

- Node.js 24.x (locally validated with 24.21.0).
- npm 11.x (locally validated with 11.6.2).

Use the committed root `package-lock.json` to install workspace dependencies consistently.

### Install Dependencies

```bash
npm ci
```

### Run the Angular Dashboard

```bash
npm run start:dashboard
```

This starts the Angular dashboard development server through Nx. It runs the renderer in the browser and does not launch the packaged Electron desktop application.

### Common Commands

| Command                                                     | Purpose                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------ |
| `npm run start:dashboard`                                   | Start the Angular dashboard development server                     |
| `npm run build:dashboard`                                   | Build the Angular dashboard                                        |
| `npm run test:dashboard`                                    | Run dashboard unit tests                                           |
| `npm run lint:dashboard`                                    | Lint the dashboard project                                         |
| `npm test`                                                  | Run workspace-wide tests                                           |
| `npm run lint`                                              | Run workspace-wide linting                                         |
| `npm run format`                                            | Apply Prettier formatting                                          |
| `npm run format:check`                                      | Check formatting without changing files                            |
| `npm run copyright:add`                                     | Add missing copyright headers to eligible source files             |
| `npm run copyright:check`                                   | Validate copyright headers                                         |
| `npx nx run-many --target=build --all --exclude=talemaster` | Build all workspace projects with build targets                    |
| `npx nx run electron:package`                               | Package the Electron application using the configured Forge target |

The current Electron Forge configuration creates a Windows x64 ZIP package. Other operating systems and distribution formats remain to be evaluated.

## Development Guidelines

- Keep domain logic independent of Angular and Electron.
- Keep privileged APIs in the Electron main process.
- Expose renderer capabilities through a restricted preload API and explicit IPC channels.
- Validate untrusted input at process boundaries.
- Use parameterized SQL; never interpolate untrusted values into SQL.
- Keep database connections and filesystem access out of the renderer.
- Keep external content providers optional. Imported content must be usable offline and retain source and licensing metadata.
- Prefer focused, independently testable modules over broad abstractions.
- Add or update tests when changing behavior.
- Run the relevant formatting, lint, test, and build checks before submitting changes.
- Maintain the project's copyright header requirements for eligible source files.

## Contributing

TaleMaster is open source and contributions are welcome.

1. Open an issue to discuss substantial changes before investing in implementation.
2. Keep pull requests focused and explain the motivation and behavior change.
3. Include or update tests when behavior changes.
4. Run the relevant formatting, lint, test, and build checks before submitting.
5. Avoid adding dependencies or expanding scope without a clear need.

Please check the repository's open issues and discussions before starting larger work.

## License

TaleMaster is licensed under the [Apache License 2.0](LICENSE).

## Acknowledgements and Trademarks

TaleMaster is an independent project. Dungeons & Dragons and related marks are the property of their respective owners; this project is not affiliated with or endorsed by Wizards of the Coast.

Any third-party game content must be used in accordance with its applicable license and terms.
