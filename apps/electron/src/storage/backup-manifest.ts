/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_MANIFEST_FILENAME = "manifest.json";

export type BackupType = "full" | "campaign";

export interface BackupFileEntry {
    readonly path: string;
    readonly size: number;
    readonly sha256: string;
}

export interface BackupManifest {
    readonly formatVersion: typeof BACKUP_FORMAT_VERSION;
    readonly backupId: string;
    readonly type: BackupType;
    readonly createdAt: string;
    readonly applicationVersion: string;
    readonly campaignId?: string;
    readonly files: readonly BackupFileEntry[];
}

export interface CreateBackupManifestOptions {
    readonly sourceDirectory: string;
    readonly type: BackupType;
    readonly applicationVersion: string;
    readonly campaignId?: string;
    readonly createdAt?: Date;
}

function toManifestPath(filePath: string): string {
    return filePath.split(sep).join("/");
}

async function calculateFileHash(filePath: string): Promise<string> {
    const hash = createHash("sha256");

    for await (const chunk of createReadStream(filePath)) {
        hash.update(chunk);
    }

    return hash.digest("hex");
}

async function collectFiles(
    rootDirectory: string,
    currentDirectory: string,
): Promise<BackupFileEntry[]> {
    const entries = await readdir(currentDirectory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));

    const files: BackupFileEntry[] = [];

    for (const entry of entries) {
        const absolutePath = join(currentDirectory, entry.name);
        const metadata = await lstat(absolutePath);

        if (metadata.isSymbolicLink()) {
            throw new Error(`Backup source contains an unsupported symbolic link: ${absolutePath}`);
        }

        if (metadata.isDirectory()) {
            files.push(...(await collectFiles(rootDirectory, absolutePath)));
            continue;
        }

        if (!metadata.isFile()) {
            throw new Error(`Backup source contains an unsupported filesystem entry: ${absolutePath}`);
        }

        const path = toManifestPath(relative(rootDirectory, absolutePath));

        if (!path || path === BACKUP_MANIFEST_FILENAME) {
            throw new Error(`Backup source contains a reserved or invalid path: ${path}`);
        }

        files.push({
            path,
            size: metadata.size,
            sha256: await calculateFileHash(absolutePath),
        });
    }

    return files;
}

/**
 * Builds a deterministic, checksummed inventory for a backup source directory.
 * The manifest itself is excluded from the inventory.
 */
export async function createBackupManifest(
    options: CreateBackupManifestOptions,
): Promise<BackupManifest> {
    if (!options.sourceDirectory.trim()) {
        throw new Error("A backup source directory is required.");
    }

    if (!options.applicationVersion.trim()) {
        throw new Error("An application version is required for the backup manifest.");
    }

    if (options.type === "campaign" && !options.campaignId?.trim()) {
        throw new Error("A campaign ID is required for a campaign backup.");
    }

    if (options.type === "full" && options.campaignId !== undefined) {
        throw new Error("A full backup cannot specify a campaign ID.");
    }

    const sourceDirectory = options.sourceDirectory;
    const rootMetadata = await lstat(sourceDirectory);

    if (!rootMetadata.isDirectory() || rootMetadata.isSymbolicLink()) {
        throw new Error("The backup source must be a real directory.");
    }

    const createdAt = options.createdAt ?? new Date();

    if (Number.isNaN(createdAt.getTime())) {
        throw new Error("The backup creation date is invalid.");
    }

    const files = await collectFiles(sourceDirectory, sourceDirectory);

    return {
        formatVersion: BACKUP_FORMAT_VERSION,
        backupId: randomUUID(),
        type: options.type,
        createdAt: createdAt.toISOString(),
        applicationVersion: options.applicationVersion,
        ...(options.campaignId ? { campaignId: options.campaignId } : {}),
        files,
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateManifestPath(path: string): boolean {
    if (
        path.length === 0 ||
        path.includes("\\") ||
        path.includes("\0") ||
        path.startsWith("/") ||
        /^[a-zA-Z]:/.test(path)
    ) {
        return false;
    }

    const segments = path.split("/");

    return (
        segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..") &&
        path !== BACKUP_MANIFEST_FILENAME
    );
}

/**
 * Validates untrusted manifest data before any restore or extraction operation.
 */
export function parseBackupManifest(value: unknown): BackupManifest {
    if (!isRecord(value)) {
        throw new Error("The backup manifest must be an object.");
    }

    if (value.formatVersion !== BACKUP_FORMAT_VERSION) {
        throw new Error("The backup format version is not supported.");
    }

    if (
        typeof value.backupId !== "string" ||
        value.backupId.length === 0 ||
        typeof value.applicationVersion !== "string" ||
        value.applicationVersion.length === 0 ||
        typeof value.createdAt !== "string" ||
        Number.isNaN(Date.parse(value.createdAt))
    ) {
        throw new Error("The backup manifest metadata is invalid.");
    }

    if (value.type !== "full" && value.type !== "campaign") {
        throw new Error("The backup type is invalid.");
    }

    if (
        (value.type === "campaign" &&
            (typeof value.campaignId !== "string" || value.campaignId.length === 0)) ||
        (value.type === "full" && value.campaignId !== undefined)
    ) {
        throw new Error("The backup campaign metadata is invalid.");
    }

    if (!Array.isArray(value.files)) {
        throw new Error("The backup manifest file inventory is invalid.");
    }

    const seenPaths = new Set<string>();
    const files: BackupFileEntry[] = value.files.map((entry: unknown) => {
        if (!isRecord(entry)) {
            throw new Error("A backup file entry is invalid.");
        }

        if (
            typeof entry.path !== "string" ||
            !validateManifestPath(entry.path) ||
            seenPaths.has(entry.path) ||
            typeof entry.size !== "number" ||
            !Number.isSafeInteger(entry.size) ||
            entry.size < 0 ||
            typeof entry.sha256 !== "string" ||
            !/^[a-f0-9]{64}$/.test(entry.sha256)
        ) {
            throw new Error("A backup file entry contains invalid or unsafe metadata.");
        }

        seenPaths.add(entry.path);

        return {
            path: entry.path,
            size: entry.size,
            sha256: entry.sha256,
        };
    });

    return {
        formatVersion: BACKUP_FORMAT_VERSION,
        backupId: value.backupId,
        type: value.type,
        createdAt: value.createdAt,
        applicationVersion: value.applicationVersion,
        ...(value.type === "campaign" ? { campaignId: value.campaignId as string } : {}),
        files,
    };
}
