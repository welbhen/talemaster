/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { lstat, mkdir } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ApplicationStoragePaths {
    readonly root: string;
    readonly database: string;
    readonly campaigns: string;
    readonly contentLibrary: string;
    readonly backups: string;
    readonly fullBackups: string;
    readonly campaignBackups: string;
    readonly logs: string;
}

export interface CampaignStoragePaths {
    readonly root: string;
    readonly documents: string;
    readonly images: string;
    readonly attachments: string;
}

export function createApplicationStoragePaths(userDataPath: string): ApplicationStoragePaths {
    if (!userDataPath.trim()) {
        throw new TypeError("The Electron userData path must not be empty.");
    }

    const root = resolve(userDataPath, "talemaster");
    const backups = join(root, "backups");

    return {
        root,
        database: join(root, "database"),
        campaigns: join(root, "campaigns"),
        contentLibrary: join(root, "content-library"),
        backups,
        fullBackups: join(backups, "full"),
        campaignBackups: join(backups, "campaigns"),
        logs: join(root, "logs"),
    };
}

export function validateStorageId(value: string, label = "Resource ID"): string {
    if (!UUID_PATTERN.test(value)) {
        throw new TypeError(`${label} must be a valid UUID.`);
    }

    return value.toLowerCase();
}

export function getCampaignStoragePaths(
    paths: ApplicationStoragePaths,
    campaignId: string,
): CampaignStoragePaths {
    const id = validateStorageId(campaignId, "Campaign ID");
    const root = join(paths.campaigns, id);

    return {
        root,
        documents: join(root, "documents"),
        images: join(root, "images"),
        attachments: join(root, "attachments"),
    };
}

/** Rejects paths that escape the supplied storage boundary. */
export function assertPathWithin(parent: string, candidate: string): void {
    const resolvedParent = resolve(parent);
    const resolvedCandidate = resolve(candidate);
    const pathFromParent = relative(resolvedParent, resolvedCandidate);

    if (
        pathFromParent === ".." ||
        pathFromParent.startsWith(`..${sep}`) ||
        resolve(resolvedCandidate) === resolvedParent && resolvedCandidate !== resolvedParent ||
        (!pathFromParent && resolvedCandidate !== resolvedParent)
    ) {
        throw new Error("Storage path escapes its permitted directory.");
    }
}

async function assertDirectory(path: string): Promise<void> {
    const metadata = await lstat(path);

    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
        throw new Error(`Unsafe storage directory: ${path}`);
    }
}

export async function ensureApplicationStorage(paths: ApplicationStoragePaths): Promise<void> {
    const directories = [
        paths.root,
        paths.database,
        paths.campaigns,
        paths.contentLibrary,
        paths.backups,
        paths.fullBackups,
        paths.campaignBackups,
        paths.logs,
    ];

    for (const directory of directories) {
        await mkdir(directory, { recursive: true });
        await assertDirectory(directory);
    }
}

export async function ensureCampaignStorage(paths: CampaignStoragePaths): Promise<void> {
    for (const directory of [paths.root, paths.documents, paths.images, paths.attachments]) {
        await mkdir(directory, { recursive: true });
        await assertDirectory(directory);
    }
}

export async function assertSafeExistingPath(root: string, candidate: string): Promise<void> {
    assertPathWithin(root, candidate);
    const relativePath = relative(resolve(root), resolve(candidate));
    let current = resolve(root);

    for (const segment of relativePath.split(sep).filter(Boolean)) {
        current = join(current, segment);
        const metadata = await lstat(current);
        if (metadata.isSymbolicLink()) {
            throw new Error("Symbolic links are not permitted in application storage.");
        }
    }

    const parent = dirname(resolve(candidate));
    assertPathWithin(root, parent);
}
