/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import type Database from "better-sqlite3";

export interface Migration {
    readonly version: number;
    readonly name: string;
    up(database: Database.Database): void;
}
