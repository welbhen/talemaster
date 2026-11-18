import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import type { DatabaseContext, DatabaseOptions } from "./db.types";
import { migrations } from "./migrations";
import { runMigrations } from "./migration-runner";

const DATABASE_FILENAME = "talemaster.sqlite";
const BUSY_TIMEOUT_MS = 5_000;

export function initializeDatabase(options: DatabaseOptions): DatabaseContext {
    mkdirSync(options.directory, { recursive: true });

    const path = join(options.directory, DATABASE_FILENAME);
    const connection = new Database(path);

    try {
        connection.pragma("foreign_keys = ON");
        connection.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`);

        runMigrations(connection, migrations);

        return {
            connection,
            path,
        };
    } catch (error) {
        try {
            connection.close();
        } catch (closeError) {
            throw new AggregateError(
                [error, closeError],
                "Database initialization failed and the connection could not be closed.",
            );
        }

        throw error;
    }
}

export function closeDatabase(context: DatabaseContext): void {
    if (context.connection.open) {
        context.connection.close();
    }
}
