/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import * as fsPromises from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
    createBackupManifest,
    parseBackupManifest,
    verifyBackupDirectory,
    type BackupManifest,
} from "./backup-manifest";

describe("backup manifest", () => {
    let directory: string;

    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), "talemaster-manifest-"));
    });

    afterEach(async () => {
        jest.restoreAllMocks();
        await rm(directory, { recursive: true, force: true });
    });

    it("creates a sorted inventory with SHA-256 checksums", async () => {
        await mkdir(join(directory, "documents"));
        await writeFile(join(directory, "z.txt"), "last");
        await writeFile(join(directory, "documents", "a.txt"), "first");

        const manifest = await createBackupManifest({
            sourceDirectory: directory,
            type: "full",
            applicationVersion: "1.0.0",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
        });

        expect(manifest.files.map((file) => file.path)).toEqual(["documents/a.txt", "z.txt"]);
        expect(manifest.files[0]).toMatchObject({
            size: 5,
            sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        });
        expect(manifest).toMatchObject({
            formatVersion: 1,
            type: "full",
            createdAt: "2026-01-01T00:00:00.000Z",
        });
    });

    it("requires campaign metadata for campaign backups", async () => {
        await expect(
            createBackupManifest({
                sourceDirectory: directory,
                type: "campaign",
                applicationVersion: "1.0.0",
            }),
        ).rejects.toThrow("A campaign ID is required for a campaign backup.");
    });

    it("rejects symbolic links in the source tree without requiring OS symlink privileges", async () => {
        const target = join(directory, "target.txt");
        const link = join(directory, "link.txt");
        await writeFile(target, "content");
        await writeFile(link, "link placeholder");

        const realLstat = fsPromises.lstat.bind(fsPromises);
        jest.spyOn(fsPromises, "lstat").mockImplementation(async (path, ...args) => {
            if (String(path) === link) {
                return {
                    isSymbolicLink: () => true,
                    isDirectory: () => false,
                    isFile: () => false,
                } as unknown as Awaited<ReturnType<typeof fsPromises.lstat>>;
            }

            return realLstat(path, ...args);
        });

        await expect(
            createBackupManifest({
                sourceDirectory: directory,
                type: "full",
                applicationVersion: "1.0.0",
            }),
        ).rejects.toThrow("Backup source contains an unsupported symbolic link");
    });

    it("rejects unsupported source root types", async () => {
        const file = join(directory, "file.txt");
        await writeFile(file, "content");

        await expect(
            createBackupManifest({
                sourceDirectory: file,
                type: "full",
                applicationVersion: "1.0.0",
            }),
        ).rejects.toThrow("The backup source must be a real directory.");
    });

    it("rejects traversal paths and absolute paths in untrusted manifests", () => {
        const base: BackupManifest = {
            formatVersion: 1,
            backupId: "backup-id",
            type: "full",
            createdAt: "2026-01-01T00:00:00.000Z",
            applicationVersion: "1.0.0",
            files: [],
        };

        for (const path of ["../outside.txt", "/absolute.txt", "C:/outside.txt", "a\\b.txt"]) {
            expect(() =>
                parseBackupManifest({
                    ...base,
                    files: [{ path, size: 1, sha256: "a".repeat(64) }],
                }),
            ).toThrow("A backup file entry contains invalid or unsafe metadata.");
        }
    });

    it("rejects duplicate paths and malformed checksums", () => {
        const base: BackupManifest = {
            formatVersion: 1,
            backupId: "backup-id",
            type: "full",
            createdAt: "2026-01-01T00:00:00.000Z",
            applicationVersion: "1.0.0",
            files: [
                { path: "file.txt", size: 1, sha256: "a".repeat(64) },
                { path: "file.txt", size: 1, sha256: "b".repeat(64) },
            ],
        };

        expect(() => parseBackupManifest(base)).toThrow(
            "A backup file entry contains invalid or unsafe metadata.",
        );
        expect(() =>
            parseBackupManifest({
                ...base,
                files: [{ path: "file.txt", size: 1, sha256: "invalid" }],
            }),
        ).toThrow("A backup file entry contains invalid or unsafe metadata.");
    });

    it("rejects unsupported backup versions", () => {
        expect(() =>
            parseBackupManifest({
                formatVersion: 999,
            }),
        ).toThrow("The backup format version is not supported.");
    });

    it("rejects non-finite or unsafe file sizes", () => {
        const base = {
            formatVersion: 1,
            backupId: "backup-id",
            type: "full",
            createdAt: "2026-01-01T00:00:00.000Z",
            applicationVersion: "1.0.0",
        };

        expect(() =>
            parseBackupManifest({
                ...base,
                files: [
                    { path: "file.txt", size: Number.MAX_SAFE_INTEGER + 1, sha256: "a".repeat(64) },
                ],
            }),
        ).toThrow("A backup file entry contains invalid or unsafe metadata.");
    });

    it("verifies a backup directory and ignores its manifest file", async () => {
        await writeFile(join(directory, "content.txt"), "original");
        const manifest = await createBackupManifest({
            sourceDirectory: directory,
            type: "full",
            applicationVersion: "1.0.0",
        });
        await writeFile(join(directory, "manifest.json"), JSON.stringify(manifest), "utf8");

        await expect(
            verifyBackupDirectory({ sourceDirectory: directory, manifest }),
        ).resolves.toEqual({ valid: true, errors: [] });
    });

    it("detects modified and unexpected files", async () => {
        await writeFile(join(directory, "content.txt"), "original");
        const manifest = await createBackupManifest({
            sourceDirectory: directory,
            type: "full",
            applicationVersion: "1.0.0",
        });

        await writeFile(join(directory, "content.txt"), "modified");
        await writeFile(join(directory, "extra.txt"), "unexpected");

        const result = await verifyBackupDirectory({
            sourceDirectory: directory,
            manifest,
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Backup file checksum mismatch: content.txt");
        expect(result.errors).toContain("Unexpected backup file: extra.txt");
    });

    it("detects missing files and checksum mismatches", async () => {
        const { verifyBackupDirectory } = await import("./backup-manifest");

        await writeFile(join(directory, "content.txt"), "original");
        const manifest = await createBackupManifest({
            sourceDirectory: directory,
            type: "full",
            applicationVersion: "1.0.0",
        });

        await rm(join(directory, "content.txt"));

        const result = await verifyBackupDirectory({
            sourceDirectory: directory,
            manifest,
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Missing backup file: content.txt");
    });

    it("reports invalid untrusted manifests without reading backup files", async () => {
        const { verifyBackupDirectory } = await import("./backup-manifest");

        const result = await verifyBackupDirectory({
            sourceDirectory: directory,
            manifest: { formatVersion: 999 },
        });

        expect(result).toEqual({
            valid: false,
            errors: ["The backup format version is not supported."],
        });
    });
});
