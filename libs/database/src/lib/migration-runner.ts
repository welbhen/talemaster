/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import type Database from "better-sqlite3";

import type { Migration } from "./migrations/migration.types";

interface AppliedMigration {
    readonly version: number;
    readonly name: string;
}

const MIGRATION_TABLE = "schema_migrations";

function hasMigrationTable(database: Database.Database): boolean {
    const result = database
        .prepare(
            `
                SELECT 1
                FROM sqlite_master
                WHERE type = 'table'
                  AND name = ?
            `,
        )
        .get(MIGRATION_TABLE);

    return result !== undefined;
}

function validateMigrations(migrations: readonly Migration[]): void {
    const versions = new Set<number>();
    const names = new Set<string>();

    for (let index = 0; index < migrations.length; index++) {
        const migration = migrations[index];

        if (!Number.isSafeInteger(migration.version) || migration.version <= 0) {
            throw new Error(`Invalid migration version: ${migration.version}`);
        }

        if (migration.version !== index + 1) {
            throw new Error(
                `Expected migration version ${index + 1}, received ${migration.version}.`,
            );
        }

        if (versions.has(migration.version)) {
            throw new Error(`Duplicate migration version: ${migration.version}`);
        }

        if (!migration.name.trim() || names.has(migration.name)) {
            throw new Error(`Invalid or duplicate migration name: ${migration.name}`);
        }

        versions.add(migration.version);
        names.add(migration.name);
    }
}

function getAppliedMigrations(database: Database.Database): AppliedMigration[] {
    if (!hasMigrationTable(database)) {
        return [];
    }

    return database
        .prepare(
            `
                SELECT version, name
                FROM ${MIGRATION_TABLE}
                ORDER BY version ASC
            `,
        )
        .all() as AppliedMigration[];
}

export function runMigrations(database: Database.Database, migrations: readonly Migration[]): void {
    validateMigrations(migrations);

    const appliedMigrations = getAppliedMigrations(database);
    for (let index = 0; index < appliedMigrations.length; index++) {
        const expectedVersion = index + 1;
        const actualVersion = appliedMigrations[index].version;

        if (actualVersion !== expectedVersion) {
            throw new Error(
                `Invalid migration history: expected version ${expectedVersion}, received ${actualVersion}.`,
            );
        }
    }
    const appliedVersions = new Set<number>();

    for (const applied of appliedMigrations) {
        const migration = migrations.find((candidate) => candidate.version === applied.version);

        if (!migration) {
            throw new Error(`Database contains unknown migration version ${applied.version}.`);
        }

        if (migration.name !== applied.name) {
            throw new Error(
                `Migration ${applied.version} has a different name than the recorded migration.`,
            );
        }

        appliedVersions.add(applied.version);
    }

    for (const migration of migrations) {
        if (appliedVersions.has(migration.version)) {
            continue;
        }

        const expectedVersion = appliedVersions.size + 1;

        if (migration.version !== expectedVersion) {
            throw new Error(
                `Cannot apply migration ${migration.version}: expected version ${expectedVersion}.`,
            );
        }

        const applyMigration = database.transaction(() => {
            migration.up(database);

            database
                .prepare(
                    `
                        INSERT INTO ${MIGRATION_TABLE} (version, name)
                        VALUES (?, ?)
                    `,
                )
                .run(migration.version, migration.name);
        });

        applyMigration.immediate();
        appliedVersions.add(migration.version);
    }
}
