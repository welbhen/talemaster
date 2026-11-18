/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, mkdtempSync, rmSync } from "node:fs";
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

        expect(migrations).toEqual([{ version: 1 }]);
        expect(secondAppliedAt).toBe(firstAppliedAt);

        closeDatabase(secondContext);
    });
});
