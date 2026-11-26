/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Migration } from "./migration.types";

export const applicationPreferencesMigration: Migration = {
    version: 2,
    name: "application-preferences",

    up(database) {
        database.exec(`
            CREATE TABLE application_preferences (
                key TEXT PRIMARY KEY NOT NULL,
                value_json TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);
    },
};
