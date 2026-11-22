/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { BlobReader, TextReader, TextWriter, ZipReader, ZipWriter } from "@zip.js/zip.js";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, open, lstat, rm, writeFile } from "node:fs/promises";
import { openAsBlob } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, relative, resolve, sep, win32 } from "node:path";
import { Readable, Writable } from "node:stream";
import { finished } from "node:stream/promises";

import {
    BACKUP_MANIFEST_FILENAME,
    createBackupManifest,
    parseBackupManifest,
    verifyBackupDirectory,
    type BackupManifest,
} from "./backup-manifest";

export interface CreateBackupArchiveOptions {
    readonly sourceDirectory: string;
    readonly archivePath: string;
    readonly type: "full" | "campaign";
    readonly applicationVersion: string;
    readonly campaignId?: string;
}

export interface BackupArchiveLimits {
    readonly maxEntries: number;
    readonly maxManifestBytes: number;
    readonly maxFileBytes: number;
    readonly maxTotalUncompressedBytes: number;
}

export interface VerifyBackupArchiveOptions {
    readonly archivePath: string;
    readonly limits?: Partial<BackupArchiveLimits>;
}

export interface ExtractBackupArchiveOptions extends VerifyBackupArchiveOptions {
    readonly destinationDirectory: string;
}

export interface BackupArchiveVerificationResult {
    readonly valid: boolean;
    readonly manifest?: BackupManifest;
    readonly errors: readonly string[];
}

const DEFAULT_LIMITS: BackupArchiveLimits = {
    maxEntries: 100_000,
    maxManifestBytes: 64 * 1024 * 1024,
    maxFileBytes: 20 * 1024 * 1024 * 1024,
    maxTotalUncompressedBytes: 100 * 1024 * 1024 * 1024,
};

function getLimits(limits?: Partial<BackupArchiveLimits>): BackupArchiveLimits {
    const resolved = { ...DEFAULT_LIMITS, ...limits };

    for (const [name, value] of Object.entries(resolved)) {
        if (!Number.isSafeInteger(value) || value <= 0) {
            throw new Error(`The backup archive limit "${name}" must be a positive safe integer.`);
        }
    }

    return resolved;
}

function validateArchivePath(path: string): boolean {
    if (
        path.length === 0 ||
        path.includes("\\") ||
        path.includes("\0") ||
        path.startsWith("/") ||
        path.endsWith("/") ||
        isAbsolute(path) ||
        win32.isAbsolute(path) ||
        /^[a-zA-Z]:/.test(path)
    ) {
        return false;
    }

    const segments = path.split("/");

    return segments.every((segment) => {
        if (
            segment.length === 0 ||
            segment === "." ||
            segment === ".." ||
            /[<>:"|?*]/.test(segment) ||
            /[. ]$/.test(segment) ||
            [...segment].some((character) => {
                const code = character.charCodeAt(0);
                return code >= 0 && code <= 0x1f;
            })
        ) {
            return false;
        }

        const basename = segment.split(".")[0].toUpperCase();

        return !/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/.test(basename);
    });
}

function resolveContainedPath(rootDirectory: string, relativePath: string): string {
    if (!validateArchivePath(relativePath)) {
        throw new Error(`The backup archive contains an unsafe path: ${relativePath}`);
    }

    const root = resolve(rootDirectory);
    const target = resolve(root, ...relativePath.split("/"));
    const pathFromRoot = relative(root, target);

    if (
        pathFromRoot === "" ||
        pathFromRoot === ".." ||
        pathFromRoot.startsWith(`..${sep}`) ||
        isAbsolute(pathFromRoot)
    ) {
        throw new Error(`The backup archive path escapes its destination: ${relativePath}`);
    }

    return target;
}

async function readManifest(
    entries: Awaited<ReturnType<ZipReader<unknown>["getEntries"]>>,
    maxManifestBytes: number,
): Promise<BackupManifest> {
    const manifests = entries.filter((entry) => entry.filename === BACKUP_MANIFEST_FILENAME);

    if (manifests.length !== 1 || manifests[0].directory) {
        throw new Error("The backup archive must contain exactly one manifest.json file.");
    }

    const manifestEntry = manifests[0];

    if (
        !Number.isSafeInteger(manifestEntry.uncompressedSize) ||
        manifestEntry.uncompressedSize < 0 ||
        manifestEntry.uncompressedSize > maxManifestBytes
    ) {
        throw new Error("The backup manifest exceeds the permitted size.");
    }

    const manifestText = await manifestEntry.getData(new TextWriter());
    let value: unknown;

    try {
        value = JSON.parse(manifestText);
    } catch {
        throw new Error("The backup manifest is not valid JSON.");
    }

    return parseBackupManifest(value);
}

async function hashArchiveEntry(
    entry: {
        getData(writer: WritableStream<Uint8Array>): Promise<unknown>;
    },
    maxBytes: number,
): Promise<{ sha256: string; size: number }> {
    const hash = createHash("sha256");
    let size = 0;

    await entry.getData(
        new WritableStream<Uint8Array>({
            write(chunk) {
                size += chunk.byteLength;

                if (size > maxBytes) {
                    throw new Error(
                        "A backup archive entry exceeded its actual decompressed size limit.",
                    );
                }

                hash.update(chunk);
            },
        }),
    );

    return { sha256: hash.digest("hex"), size };
}

async function openArchive(archivePath: string): Promise<ZipReader<unknown>> {
    const metadata = await lstat(archivePath);

    if (!metadata.isFile() || metadata.isSymbolicLink()) {
        throw new Error("The backup archive must be a regular file.");
    }

    return new ZipReader(new BlobReader(await openAsBlob(archivePath)), { useWebWorkers: false });
}

/**
 * Creates a ZIP archive containing a versioned manifest and all source files.
 * The archive is verified before this operation is considered successful.
 */
export async function createBackupArchive(
    options: CreateBackupArchiveOptions,
): Promise<BackupManifest> {
    const sourceDirectory = resolve(options.sourceDirectory);
    const archivePath = resolve(options.archivePath);

    if (sourceDirectory === archivePath || archivePath.startsWith(`${sourceDirectory}${sep}`)) {
        throw new Error("The backup archive cannot be created inside its source directory.");
    }

    const sourceMetadata = await lstat(sourceDirectory);

    if (!sourceMetadata.isDirectory() || sourceMetadata.isSymbolicLink()) {
        throw new Error("The backup source must be a real directory.");
    }

    const manifest = await createBackupManifest({
        sourceDirectory,
        type: options.type,
        applicationVersion: options.applicationVersion,
        ...(options.campaignId ? { campaignId: options.campaignId } : {}),
    });

    await mkdir(dirname(archivePath), { recursive: true });

    const archiveHandle = await open(archivePath, "wx");
    const output = archiveHandle.createWriteStream({ autoClose: false });
    const zipWriter = new ZipWriter(Writable.toWeb(output) as WritableStream<Uint8Array>, {
        useWebWorkers: false,
    });
    let completed = false;

    try {
        await zipWriter.add(BACKUP_MANIFEST_FILENAME, new TextReader(JSON.stringify(manifest)));

        for (const file of manifest.files) {
            const filePath = resolveContainedPath(sourceDirectory, file.path);
            await zipWriter.add(
                file.path,
                Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>,
            );
        }

        await zipWriter.close();
        await finished(output);
        await archiveHandle.sync();
        const verification = await verifyBackupArchive({ archivePath });

        if (!verification.valid) {
            throw new Error(
                `The created backup archive failed verification: ${verification.errors.join("; ")}`,
            );
        }

        completed = true;
        return manifest;
    } finally {
        if (!output.destroyed) {
            output.destroy();
        }

        await archiveHandle.close();

        if (!completed) {
            await rm(archivePath, { force: true });
        }
    }
}

/**
 * Verifies archive structure and streams every file through SHA-256 validation.
 * Entry sizes are checked before any entry content is consumed.
 */
export async function verifyBackupArchive(
    options: VerifyBackupArchiveOptions,
): Promise<BackupArchiveVerificationResult> {
    const limits = getLimits(options.limits);
    let reader: ZipReader<unknown> | undefined;

    try {
        reader = await openArchive(options.archivePath);
        const entries = await reader.getEntries();

        if (entries.length > limits.maxEntries + 1) {
            throw new Error("The backup archive contains too many entries.");
        }

        const manifest = await readManifest(entries, limits.maxManifestBytes);
        const expectedByPath = new Map(manifest.files.map((file) => [file.path, file]));
        const seenPaths = new Set<string>();
        let totalSize = 0;
        const errors: string[] = [];

        for (const entry of entries) {
            if (entry.filename === BACKUP_MANIFEST_FILENAME) {
                continue;
            }

            if (entry.directory || !validateArchivePath(entry.filename)) {
                errors.push(`The backup archive contains an unsafe entry: ${entry.filename}`);
                continue;
            }

            if (seenPaths.has(entry.filename)) {
                errors.push(`The backup archive contains a duplicate entry: ${entry.filename}`);
                continue;
            }

            seenPaths.add(entry.filename);

            const expected = expectedByPath.get(entry.filename);

            if (!expected) {
                errors.push(`Unexpected backup archive entry: ${entry.filename}`);
                continue;
            }

            if (
                !Number.isSafeInteger(entry.uncompressedSize) ||
                entry.uncompressedSize < 0 ||
                entry.uncompressedSize > limits.maxFileBytes
            ) {
                errors.push(`Backup archive entry exceeds the permitted size: ${entry.filename}`);
                continue;
            }

            totalSize += entry.uncompressedSize;

            if (totalSize > limits.maxTotalUncompressedBytes) {
                throw new Error("The backup archive exceeds the total uncompressed size limit.");
            }

            if (entry.uncompressedSize !== expected.size) {
                errors.push(`Backup archive entry size mismatch: ${entry.filename}`);
                continue;
            }

            const actual = await hashArchiveEntry(entry, limits.maxFileBytes);

            if (actual.size !== expected.size) {
                errors.push(`Backup archive entry expanded size mismatch: ${entry.filename}`);
            } else if (actual.sha256 !== expected.sha256) {
                errors.push(`Backup archive entry checksum mismatch: ${entry.filename}`);
            }
        }

        for (const expected of manifest.files) {
            if (!seenPaths.has(expected.path)) {
                errors.push(`Missing backup archive entry: ${expected.path}`);
            }
        }

        return {
            valid: errors.length === 0,
            manifest,
            errors,
        };
    } catch (error) {
        return {
            valid: false,
            errors: [error instanceof Error ? error.message : "The backup archive is invalid."],
        };
    } finally {
        await reader?.close();
    }
}

/**
 * Extracts a previously verified archive into a new staging directory.
 * The destination must not exist; a failed extraction removes the staging tree.
 */
export async function extractBackupArchive(
    options: ExtractBackupArchiveOptions,
): Promise<BackupManifest> {
    const verification = await verifyBackupArchive(options);

    if (!verification.valid || !verification.manifest) {
        throw new Error(
            `Cannot extract an invalid backup archive: ${verification.errors.join("; ")}`,
        );
    }

    const destinationDirectory = resolve(options.destinationDirectory);

    try {
        await mkdir(destinationDirectory, { recursive: false });
    } catch (error) {
        throw new Error("The backup extraction destination must not already exist.", {
            cause: error,
        });
    }

    let reader: ZipReader<unknown> | undefined;

    try {
        reader = await openArchive(options.archivePath);
        const entries = await reader.getEntries();

        for (const entry of entries) {
            if (entry.filename === BACKUP_MANIFEST_FILENAME) {
                continue;
            }

            // ZipReader entries are DirectoryEntry | FileEntry.
            // Only FileEntry exposes getData(), so reject directories before extraction.
            if (entry.directory) {
                throw new Error(
                    `Unexpected directory entry in verified backup archive: ${entry.filename}`,
                );
            }

            const destinationPath = resolveContainedPath(destinationDirectory, entry.filename);
            await mkdir(dirname(destinationPath), { recursive: true });

            const output = createWriteStream(destinationPath, { flags: "wx" });

            try {
                await entry.getData(Writable.toWeb(output) as WritableStream<Uint8Array>);
                await finished(output);
            } catch (error) {
                output.destroy();
                throw error;
            }
        }

        const manifestPath = resolveContainedPath(destinationDirectory, BACKUP_MANIFEST_FILENAME);
        await writeFile(manifestPath, JSON.stringify(verification.manifest, null, 2), {
            encoding: "utf8",
            flag: "wx",
        });

        const extractedVerification = await verifyBackupDirectory({
            sourceDirectory: destinationDirectory,
            manifest: verification.manifest,
        });

        if (!extractedVerification.valid) {
            throw new Error(
                `Extracted backup failed integrity verification: ${extractedVerification.errors.join("; ")}`,
            );
        }

        return verification.manifest;
    } catch (error) {
        await rm(destinationDirectory, { recursive: true, force: true });
        throw error;
    } finally {
        await reader?.close();
    }
}
