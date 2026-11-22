/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";

import { closeDatabase, initializeDatabase } from "@talemaster/database";

import { createConsistentDatabaseBackup } from "./database-snapshot";
import { createStorageCoordinator } from "./storage-coordinator";

describe("createConsistentDatabaseBackup", () => {
    let directory: string;
    let database: ReturnType<typeof initializeDatabase>;

    beforeEach(() => {
        directory = mkdtempSync(join(tmpdir(), "talemaster-consistent-backup-"));
        database = initializeDatabase({ directory: join(directory, "database") });
        database.connection.exec(
            "CREATE TABLE snapshot_test (id INTEGER PRIMARY KEY, value TEXT NOT NULL)",
        );
    });

    afterEach(() => {
        closeDatabase(database);
        rmSync(directory, { recursive: true, force: true });
    });

    it("waits for active storage mutations before taking the database snapshot", async () => {
        const coordinator = createStorageCoordinator();
        const events: string[] = [];
        let releaseMutation!: () => void;

        const mutationGate = new Promise<void>((resolve) => {
            releaseMutation = resolve;
        });

        const mutation = coordinator.runMutation(async () => {
            database.connection
                .prepare("INSERT INTO snapshot_test (value) VALUES (?)")
                .run("before snapshot");
            events.push("mutation-started");
            await mutationGate;
            database.connection
                .prepare("INSERT INTO snapshot_test (value) VALUES (?)")
                .run("committed before snapshot");
            events.push("mutation-finished");
        });

        const destination = join(directory, "backups", "database.sqlite");
        const backup = createConsistentDatabaseBackup(coordinator, database, destination);

        await Promise.resolve();
        await Promise.resolve();

        expect(events).toEqual(["mutation-started"]);

        releaseMutation();
        await Promise.all([mutation, backup]);

        const snapshot = new Database(destination, { readonly: true, fileMustExist: true });
        try {
            const values = snapshot
                .prepare("SELECT value FROM snapshot_test ORDER BY id")
                .pluck()
                .all();

            expect(values).toEqual(["before snapshot", "committed before snapshot"]);
        } finally {
            snapshot.close();
        }
    });
});
