/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import Database from "better-sqlite3";
import { closeSync, mkdirSync, openSync, statSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { DatabaseContext } from "./db.types";

/**
 * Creates and validates a consistent SQLite snapshot at a new destination.
 *
 * The destination must not already exist. Callers coordinating database and
 * filesystem state must hold their storage snapshot barrier for the duration
 * of this operation.
 */
export async function createDatabaseBackup(
    context: DatabaseContext,
    destinationPath: string,
): Promise<void> {
    if (!context.connection.open) {
        throw new Error("Cannot back up a closed database connection.");
    }

    if (!destinationPath.trim()) {
        throw new Error("A database backup destination is required.");
    }

    const sourcePath = resolve(context.path);
    const targetPath = resolve(destinationPath);

    if (sourcePath === targetPath) {
        throw new Error("The database backup destination must differ from the source database.");
    }

    mkdirSync(dirname(targetPath), { recursive: true });

    let destinationCreated = false;

    try {
        const descriptor = openSync(targetPath, "wx");
        destinationCreated = true;
        closeSync(descriptor);

        await context.connection.backup(targetPath);

        const snapshot = new Database(targetPath, {
            readonly: true,
            fileMustExist: true,
        });

        try {
            const integrity = snapshot.pragma("integrity_check", { simple: true });

            if (integrity !== "ok") {
                throw new Error("The database backup failed SQLite integrity verification.");
            }

            const foreignKeyViolations = snapshot.pragma("foreign_key_check") as unknown[];

            if (foreignKeyViolations.length > 0) {
                throw new Error("The database backup contains foreign-key violations.");
            }
        } finally {
            snapshot.close();
        }

        if (statSync(targetPath).size === 0) {
            throw new Error("The database backup is empty.");
        }
    } catch (error) {
        if (destinationCreated) {
            try {
                unlinkSync(targetPath);
            } catch (cleanupError) {
                throw new AggregateError(
                    [error, cleanupError],
                    "Database backup failed and its incomplete destination could not be removed.",
                );
            }
        }

        throw error;
    }
}
