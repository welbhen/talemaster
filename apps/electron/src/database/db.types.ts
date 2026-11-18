/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import type Database from "better-sqlite3";

export interface DatabaseOptions {
    readonly directory: string;
}

export interface DatabaseContext {
    readonly connection: Database.Database;
    readonly path: string;
}
