/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { closeDatabase, initializeDatabase } from "./db";

describe("database", () => {
    let directory: string;

    beforeEach(() => {
        directory = mkdtempSync(join(tmpdir(), "talemaster-db-"));
    });

    afterEach(() => {
        rmSync(directory, { recursive: true, force: true });
    });

    it("creates the database directory and file", () => {
        const databaseDirectory = join(directory, "database");

        const context = initializeDatabase({
            directory: databaseDirectory,
        });

        expect(existsSync(context.path)).toBe(true);
        expect(context.path).toBe(join(databaseDirectory, "talemaster.sqlite"));

        closeDatabase(context);
    });

    it("enables foreign keys", () => {
        const context = initializeDatabase({ directory });

        expect(
            context.connection.pragma("foreign_keys", {
                simple: true,
            }),
        ).toBe(1);

        closeDatabase(context);
    });

    it("configures the busy timeout", () => {
        const context = initializeDatabase({ directory });

        expect(
            context.connection.pragma("busy_timeout", {
                simple: true,
            }),
        ).toBe(5000);

        closeDatabase(context);
    });

    it("closes the database connection", () => {
        const context = initializeDatabase({ directory });

        closeDatabase(context);

        expect(context.connection.open).toBe(false);
    });

    it("does not reapply migrations on subsequent startups", () => {
        const firstContext = initializeDatabase({ directory });

        const firstAppliedAt = firstContext.connection
            .prepare("SELECT applied_at FROM schema_migrations WHERE version = 1")
            .pluck()
            .get();

        closeDatabase(firstContext);

        const secondContext = initializeDatabase({ directory });

        const migrations = secondContext.connection
            .prepare("SELECT version FROM schema_migrations")
            .all();

        const secondAppliedAt = secondContext.connection
            .prepare("SELECT applied_at FROM schema_migrations WHERE version = 1")
            .pluck()
            .get();

        expect(migrations).toEqual([{ version: 1 }, { version: 2 }]);
        expect(secondAppliedAt).toBe(firstAppliedAt);

        closeDatabase(secondContext);
    });

    it("opens an existing version-1 database, preserves its data, and applies new migrations", () => {
        const databaseDirectory = join(directory, "existing-database");
        const databasePath = join(databaseDirectory, "talemaster.sqlite");
        mkdirSync(databaseDirectory, { recursive: true });
        const existingDatabase = new Database(databasePath);

        existingDatabase.exec(`
            CREATE TABLE schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO schema_migrations (version, name) VALUES (1, 'initial');
            CREATE TABLE legacy_records (
                id INTEGER PRIMARY KEY,
                value TEXT NOT NULL
            );
            INSERT INTO legacy_records (id, value) VALUES (1, 'keep-existing-data');
        `);
        existingDatabase.close();

        const context = initializeDatabase({ directory: databaseDirectory });

        expect(
            context.connection.prepare("SELECT value FROM legacy_records WHERE id = 1").pluck().get(),
        ).toBe("keep-existing-data");
        expect(
            context.connection
                .prepare("SELECT version, name FROM schema_migrations ORDER BY version")
                .all(),
        ).toEqual([
            { version: 1, name: "initial" },
            { version: 2, name: "application_preferences" },
        ]);
        expect(
            context.connection
                .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'application_preferences'")
                .get(),
        ).toBeDefined();

        closeDatabase(context);
    });

    it("reuses an existing database directory and database file on repeated initialization", () => {
        const first = initializeDatabase({ directory });
        first.connection.prepare("INSERT INTO application_preferences (key, value_json) VALUES (?, ?)")
            .run("preserved", JSON.stringify({ enabled: true }));
        closeDatabase(first);

        const second = initializeDatabase({ directory });
        expect(
            second.connection.prepare("SELECT value_json FROM application_preferences WHERE key = ?")
                .pluck()
                .get("preserved"),
        ).toBe(JSON.stringify({ enabled: true }));
        closeDatabase(second);
    });
});
