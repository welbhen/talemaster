/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { lstat, readdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { verifyBackupArchive } from "./backup-archive";

export interface ApplyBackupRetentionOptions {
    readonly backupDirectory: string;
    readonly newlyCreatedArchive: string;
    readonly keep: number;
}

interface VerifiedArchive {
    readonly path: string;
    readonly createdAt: string;
}

/**
 * Applies retention only after the newly created archive has passed integrity
 * verification. Retention is scoped to a single backup directory (full backups
 * or one campaign's backups); unrelated backup scopes are never deleted.
 */
export async function applyBackupRetention(
    options: ApplyBackupRetentionOptions,
): Promise<readonly string[]> {
    if (!Number.isSafeInteger(options.keep) || options.keep < 1) {
        throw new Error("Backup retention must be a positive safe integer.");
    }

    const backupDirectory = resolve(options.backupDirectory);
    const newlyCreatedArchive = resolve(options.newlyCreatedArchive);

    if (dirname(newlyCreatedArchive) !== backupDirectory) {
        throw new Error("The newly created backup must be inside its retention directory.");
    }

    const rootMetadata = await lstat(backupDirectory);

    if (!rootMetadata.isDirectory() || rootMetadata.isSymbolicLink()) {
        throw new Error("The backup retention directory must be a real directory.");
    }

    const newArchiveMetadata = await lstat(newlyCreatedArchive);

    if (!newArchiveMetadata.isFile() || newArchiveMetadata.isSymbolicLink()) {
        throw new Error("The newly created backup must be a regular file.");
    }

    const newVerification = await verifyBackupArchive({ archivePath: newlyCreatedArchive });

    if (!newVerification.valid || !newVerification.manifest) {
        throw new Error(
            `Retention cannot run because the new backup is invalid: ${newVerification.errors.join("; ")}`,
        );
    }

    const entries = await readdir(backupDirectory, { withFileTypes: true });
    const verified: VerifiedArchive[] = [];

    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".zip")) {
            continue;
        }

        const path = join(backupDirectory, entry.name);
        const metadata = await lstat(path);

        if (!metadata.isFile() || metadata.isSymbolicLink()) {
            continue;
        }

        const verification =
            path === newlyCreatedArchive
                ? newVerification
                : await verifyBackupArchive({ archivePath: path });

        if (!verification.valid || !verification.manifest) {
            continue;
        }

        if (
            verification.manifest.type !== newVerification.manifest.type ||
            verification.manifest.campaignId !== newVerification.manifest.campaignId
        ) {
            continue;
        }

        verified.push({
            path,
            createdAt: verification.manifest.createdAt,
        });
    }

    verified.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    const removed: string[] = [];

    for (const archive of verified.slice(options.keep)) {
        if (archive.path === newlyCreatedArchive) {
            continue;
        }

        await rm(archive.path);
        removed.push(archive.path);
    }

    return removed;
}
