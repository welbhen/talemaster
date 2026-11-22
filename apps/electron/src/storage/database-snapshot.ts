/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { createDatabaseBackup } from "@talemaster/database";
import type { DatabaseContext } from "@talemaster/database";

import type { StorageCoordinator } from "./storage-coordinator";

/**
 * Creates a database snapshot inside the application's shared storage
 * consistency barrier. Filesystem snapshot operations should use the same
 * coordinator when the full backup workflow is introduced.
 */
export function createConsistentDatabaseBackup(
    coordinator: StorageCoordinator,
    database: DatabaseContext,
    destinationPath: string,
): Promise<void> {
    return coordinator.createSnapshot(() => createDatabaseBackup(database, destinationPath));
}
