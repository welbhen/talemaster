import type { Migration } from "./migration.types";

export const initialMigration: Migration = {
    version: 1,
    name: "initial",

    up(database) {
        database.exec(`
            CREATE TABLE schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);
    },
};
