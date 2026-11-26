/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Migration } from "./migration.types";

export const localProfilesMigration: Migration = {
    version: 3,
    name: "local-profiles",

    up(database) {
        database.exec(`
            CREATE TABLE profiles (
                id TEXT PRIMARY KEY NOT NULL,
                nickname TEXT NOT NULL CHECK (length(nickname) BETWEEN 1 AND 40),
                avatar_filename TEXT,
                is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE UNIQUE INDEX profiles_single_active
                ON profiles (is_active)
                WHERE is_active = 1;
        `);
    },
};
