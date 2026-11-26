/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, readdir, rename, rm } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import {
    assertPathWithin,
    assertSafeExistingPath,
    ensureCampaignStorage,
    getCampaignStoragePaths,
    validateStorageId,
    type ApplicationStoragePaths,
} from "./application-storage";
import {
    deserializeStoredDocument,
    serializeStoredDocument,
    type StoredDocument,
} from "./document-format";

export type CampaignAssetKind = "images" | "attachments";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const ATTACHMENT_EXTENSIONS = new Set([".pdf", ".txt", ".md", ".docx", ".xlsx", ".pptx", ".zip"]);

/**
 * Provisional safety limit only: 10 MiB is an arbitrary engineering default,
 * not a finalized product requirement. Revisit it when document-size expectations
 * and the editor's practical limits are defined.
 */
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/**
 * Provisional safety limit only: 100 MiB is an arbitrary engineering default,
 * not a finalized product requirement. Revisit it when supported asset types,
 * expected campaign sizes, and import workflows are defined.
 */
const MAX_ASSET_BYTES = 100 * 1024 * 1024;

export interface StoredAsset {
    readonly id: string;
    readonly kind: CampaignAssetKind;
    readonly extension: string;
    readonly size: number;
}

export interface CampaignStorageInventory {
    readonly documents: readonly string[];
    readonly images: readonly string[];
    readonly attachments: readonly string[];
    readonly unsafeEntries: readonly string[];
}

function normalizeExtension(kind: CampaignAssetKind, extension: string): string {
    const normalized = extension.toLowerCase().startsWith(".")
        ? extension.toLowerCase()
        : `.${extension.toLowerCase()}`;
    const allowed = kind === "images" ? IMAGE_EXTENSIONS : ATTACHMENT_EXTENSIONS;

    if (!allowed.has(normalized)) {
        throw new TypeError(`Unsupported ${kind} file extension.`);
    }

    return normalized;
}

async function atomicWrite(path: string, data: string | Uint8Array): Promise<void> {
    const directory = join(path, "..");
    await mkdir(directory, { recursive: true });
    const temporaryPath = join(directory, `.${basename(path)}.${randomUUID()}.tmp`);
    const handle = await open(temporaryPath, "wx");

    try {
        await handle.writeFile(data);
        await handle.sync();
    } catch (error) {
        await handle.close();
        await rm(temporaryPath, { force: true });
        throw error;
    }

    await handle.close();

    try {
        await rename(temporaryPath, path);
    } catch (error) {
        await rm(temporaryPath, { force: true });
        throw error;
    }
}

export class CampaignFileStore {
    constructor(private readonly storage: ApplicationStoragePaths) {}

    async initializeCampaign(campaignId: string): Promise<void> {
        const paths = getCampaignStoragePaths(this.storage, campaignId);
        await ensureCampaignStorage(paths);
    }

    async writeDocument(
        campaignId: string,
        documentId: string,
        document: StoredDocument,
    ): Promise<void> {
        const paths = getCampaignStoragePaths(this.storage, campaignId);
        await ensureCampaignStorage(paths);
        const id = validateStorageId(documentId, "Document ID");
        const destination = join(paths.documents, `${id}.json`);
        assertPathWithin(paths.documents, destination);
        const serialized = serializeStoredDocument(document);

        if (Buffer.byteLength(serialized, "utf8") > MAX_DOCUMENT_BYTES) {
            throw new RangeError("Document exceeds the maximum supported size.");
        }

        await atomicWrite(destination, serialized);
    }

    async readDocument(campaignId: string, documentId: string): Promise<StoredDocument> {
        const paths = getCampaignStoragePaths(this.storage, campaignId);
        const id = validateStorageId(documentId, "Document ID");
        const source = join(paths.documents, `${id}.json`);
        await assertSafeExistingPath(paths.documents, source);
        const metadata = await lstat(source);

        if (!metadata.isFile() || metadata.size > MAX_DOCUMENT_BYTES) {
            throw new Error("Document file is not a supported regular file.");
        }

        return deserializeStoredDocument(await readFile(source, "utf8"));
    }

    async writeAsset(
        campaignId: string,
        kind: CampaignAssetKind,
        extension: string,
        data: Uint8Array,
    ): Promise<StoredAsset> {
        const paths = getCampaignStoragePaths(this.storage, campaignId);
        await ensureCampaignStorage(paths);
        const normalizedExtension = normalizeExtension(kind, extension);

        if (data.byteLength === 0 || data.byteLength > MAX_ASSET_BYTES) {
            throw new RangeError("Asset size is outside the supported range.");
        }

        const id = randomUUID();
        const directory = paths[kind];
        const destination = join(directory, `${id}${normalizedExtension}`);
        assertPathWithin(directory, destination);
        await atomicWrite(destination, data);

        return { id, kind, extension: normalizedExtension, size: data.byteLength };
    }

    async scanCampaign(campaignId: string): Promise<CampaignStorageInventory> {
        const paths = getCampaignStoragePaths(this.storage, campaignId);
        await ensureCampaignStorage(paths);
        const unsafeEntries: string[] = [];

        const scan = async (directory: string, extension?: string): Promise<string[]> => {
            const entries = await readdir(directory, { withFileTypes: true });
            const files: string[] = [];

            for (const entry of entries) {
                if (entry.isSymbolicLink() || !entry.isFile()) {
                    unsafeEntries.push(`${directory}/${entry.name}`);
                    continue;
                }

                if (extension && extname(entry.name).toLowerCase() !== extension) {
                    unsafeEntries.push(`${directory}/${entry.name}`);
                    continue;
                }

                files.push(entry.name);
            }

            return files.sort();
        };

        return {
            documents: await scan(paths.documents, ".json"),
            images: await scan(paths.images),
            attachments: await scan(paths.attachments),
            unsafeEntries,
        };
    }
}
