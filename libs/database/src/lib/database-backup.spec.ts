/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";

import { closeDatabase, initializeDatabase } from "./db";
import { createDatabaseBackup } from "./database-backup";

describe("createDatabaseBackup", () => {
    let directory: string;
    let context: ReturnType<typeof initializeDatabase>;

    beforeEach(() => {
        directory = mkdtempSync(join(tmpdir(), "talemaster-db-backup-"));
        context = initializeDatabase({ directory: join(directory, "source") });
        context.connection.exec("CREATE TABLE backup_test (id INTEGER PRIMARY KEY, value TEXT NOT NULL)");
        context.connection.prepare("INSERT INTO backup_test (value) VALUES (?)").run("snapshot");
    });

    afterEach(() => {
        closeDatabase(context);
        rmSync(directory, { recursive: true, force: true });
    });

    it("creates a consistent, independently readable SQLite snapshot", async () => {
        const destination = join(directory, "backups", "snapshot.sqlite");

        await createDatabaseBackup(context, destination);

        expect(existsSync(destination)).toBe(true);

        const snapshot = new Database(destination, { readonly: true, fileMustExist: true });
        try {
            expect(snapshot.prepare("SELECT value FROM backup_test").pluck().get()).toBe("snapshot");
            expect(snapshot.pragma("integrity_check", { simple: true })).toBe("ok");
        } finally {
            snapshot.close();
        }
    });

    it("does not overwrite an existing destination", async () => {
        const destination = join(directory, "existing.sqlite");
        writeFileSync(destination, "preserve-existing-file");

        await expect(createDatabaseBackup(context, destination)).rejects.toThrow();

        expect(readFileSync(destination, "utf8")).toBe("preserve-existing-file");
    });

    it("rejects the source database as the destination", async () => {
        await expect(createDatabaseBackup(context, context.path)).rejects.toThrow(
            "The database backup destination must differ from the source database.",
        );
    });

    it("rejects a closed database connection", async () => {
        closeDatabase(context);

        await expect(
            createDatabaseBackup(context, join(directory, "closed.sqlite")),
        ).rejects.toThrow("Cannot back up a closed database connection.");
    });

    it("removes an incomplete destination when the backup operation fails", async () => {
        const destination = join(directory, "failed.sqlite");
        const backup = jest.fn().mockRejectedValue(new Error("backup failure"));
        const failingContext = {
            ...context,
            connection: {
                open: true,
                backup,
            },
        } as unknown as typeof context;

        await expect(createDatabaseBackup(failingContext, destination)).rejects.toThrow(
            "backup failure",
        );

        expect(existsSync(destination)).toBe(false);
    });
});
