/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import type Database from "better-sqlite3";

const MAX_KEY_LENGTH = 128;
const MAX_VALUE_BYTES = 1024 * 1024;

function validateKey(key: string): void {
    if (!key.trim() || key.length > MAX_KEY_LENGTH) {
        throw new TypeError("Preference key must contain between 1 and 128 characters.");
    }
}

function serializeValue(value: unknown): string {
    let serialized: string | undefined;

    try {
        serialized = JSON.stringify(value);
    } catch {
        throw new TypeError("Preference value must be JSON-serializable.");
    }

    if (serialized === undefined || Buffer.byteLength(serialized, "utf8") > MAX_VALUE_BYTES) {
        throw new RangeError("Preference value is empty or exceeds the maximum supported size.");
    }

    return serialized;
}

export function getApplicationPreference<T>(
    database: Database.Database,
    key: string,
): T | undefined {
    validateKey(key);
    const row = database
        .prepare("SELECT value_json FROM application_preferences WHERE key = ?")
        .get(key) as { readonly value_json: string } | undefined;

    if (!row) {
        return undefined;
    }

    try {
        return JSON.parse(row.value_json) as T;
    } catch {
        throw new Error(`Stored application preference "${key}" contains invalid JSON.`);
    }
}

export function setApplicationPreference(
    database: Database.Database,
    key: string,
    value: unknown,
): void {
    validateKey(key);
    const serialized = serializeValue(value);

    database
        .prepare(
            `
            INSERT INTO application_preferences (key, value_json, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET
                value_json = excluded.value_json,
                updated_at = CURRENT_TIMESTAMP
        `,
        )
        .run(key, serialized);
}

export function deleteApplicationPreference(database: Database.Database, key: string): boolean {
    validateKey(key);
    return (
        database.prepare("DELETE FROM application_preferences WHERE key = ?").run(key).changes > 0
    );
}
