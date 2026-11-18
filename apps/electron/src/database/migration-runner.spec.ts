import Database from "better-sqlite3";

import { runMigrations } from "./migration-runner";
import { initialMigration } from "./migrations/001-initial";
import type { Migration } from "./migrations/migration.types";

describe("migration runner", () => {
    let database: Database.Database;

    beforeEach(() => {
        database = new Database(":memory:");
    });

    afterEach(() => {
        if (database.open) {
            database.close();
        }
    });

    it("applies migrations in ascending order", () => {
        const secondMigration: Migration = {
            version: 2,
            name: "second",
            up(connection) {
                connection.exec(`
                    CREATE TABLE test_table (
                        id INTEGER PRIMARY KEY
                    );
                `);
            },
        };

        runMigrations(database, [initialMigration, secondMigration]);

        const applied = database
            .prepare("SELECT version FROM schema_migrations ORDER BY version")
            .all();

        expect(applied).toEqual([{ version: 1 }, { version: 2 }]);

        expect(
            database
                .prepare(
                    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'test_table'",
                )
                .get(),
        ).toBeDefined();
    });

    it("does not reapply completed migrations", () => {
        runMigrations(database, [initialMigration]);
        runMigrations(database, [initialMigration]);

        const applied = database.prepare("SELECT version FROM schema_migrations").all();

        expect(applied).toEqual([{ version: 1 }]);
    });

    it("rolls back a failed migration", () => {
        const failingMigration: Migration = {
            version: 2,
            name: "failing",
            up(connection) {
                connection.exec(`
                    CREATE TABLE temporary_table (
                        id INTEGER PRIMARY KEY
                    );
                `);

                throw new Error("Migration failed");
            },
        };

        expect(() => {
            runMigrations(database, [initialMigration, failingMigration]);
        }).toThrow("Migration failed");

        const table = database
            .prepare(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'temporary_table'",
            )
            .get();

        expect(table).toBeUndefined();

        const applied = database.prepare("SELECT version FROM schema_migrations").all();

        expect(applied).toEqual([{ version: 1 }]);
    });

    it("rejects unknown migration versions", () => {
        const secondMigration: Migration = {
            version: 2,
            name: "second",
            up() {},
        };

        runMigrations(database, [initialMigration, secondMigration]);

        expect(() => {
            runMigrations(database, [initialMigration]);
        }).toThrow("unknown migration version 2");
    });

    it("rejects renamed migrations", () => {
        runMigrations(database, [initialMigration]);

        const renamedMigration: Migration = {
            ...initialMigration,
            name: "renamed-initial",
        };

        expect(() => {
            runMigrations(database, [renamedMigration]);
        }).toThrow("different name than the recorded migration");
    });

    it("rejects migration history with gaps", () => {
        runMigrations(database, [initialMigration]);

        database
            .prepare("INSERT INTO schema_migrations (version, name) VALUES (?, ?)")
            .run(3, "unexpected");

        const migrations: Migration[] = [
            initialMigration,
            {
                version: 2,
                name: "second",
                up() {},
            },
            {
                version: 3,
                name: "third",
                up() {},
            },
        ];

        expect(() => {
            runMigrations(database, migrations);
        }).toThrow("Invalid migration history");
    });
});
