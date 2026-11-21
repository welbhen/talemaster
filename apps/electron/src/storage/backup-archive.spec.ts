/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
    createBackupArchive,
    extractBackupArchive,
    verifyBackupArchive,
} from "./backup-archive";

describe("backup archive", () => {
    let directory: string;
    let sourceDirectory: string;
    let archivePath: string;

    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), "talemaster-archive-"));
        sourceDirectory = join(directory, "source");
        archivePath = join(directory, "backup.zip");
        await import("node:fs/promises").then(({ mkdir }) => mkdir(sourceDirectory));
        await writeFile(join(sourceDirectory, "campaign.json"), '{"name":"Test"}');
        await writeFile(join(sourceDirectory, "notes.txt"), "A campaign note.");
    });

    afterEach(async () => {
        await rm(directory, { recursive: true, force: true });
    });

    it("creates and verifies a ZIP archive with a manifest", async () => {
        const manifest = await createBackupArchive({
            sourceDirectory,
            archivePath,
            type: "full",
            applicationVersion: "1.0.0",
        });

        expect(manifest.files).toHaveLength(2);

        const verification = await verifyBackupArchive({ archivePath });

        expect(verification.valid).toBe(true);
        expect(verification.manifest?.backupId).toBe(manifest.backupId);
        expect(verification.errors).toEqual([]);
    });

    it("extracts a verified archive into a new staging directory", async () => {
        await createBackupArchive({
            sourceDirectory,
            archivePath,
            type: "campaign",
            campaignId: "campaign-123",
            applicationVersion: "1.0.0",
        });

        const destination = join(directory, "staging");
        const manifest = await extractBackupArchive({
            archivePath,
            destinationDirectory: destination,
        });

        expect(manifest.type).toBe("campaign");
        await expect(readFile(join(destination, "campaign.json"), "utf8")).resolves.toBe(
            '{"name":"Test"}',
        );
        await expect(readFile(join(destination, "manifest.json"), "utf8")).resolves.toContain(
            '"campaignId": "campaign-123"',
        );
    });

    it("rejects an existing archive destination without overwriting it", async () => {
        await writeFile(archivePath, "existing");

        await expect(
            createBackupArchive({
                sourceDirectory,
                archivePath,
                type: "full",
                applicationVersion: "1.0.0",
            }),
        ).rejects.toThrow();

        await expect(readFile(archivePath, "utf8")).resolves.toBe("existing");
    });

    it("rejects extraction into an existing destination", async () => {
        await createBackupArchive({
            sourceDirectory,
            archivePath,
            type: "full",
            applicationVersion: "1.0.0",
        });
        const destination = join(directory, "existing");
        await import("node:fs/promises").then(({ mkdir }) => mkdir(destination));

        await expect(
            extractBackupArchive({ archivePath, destinationDirectory: destination }),
        ).rejects.toThrow("The backup extraction destination must not already exist.");
    });

    it("rejects archives that exceed configured entry limits", async () => {
        await createBackupArchive({
            sourceDirectory,
            archivePath,
            type: "full",
            applicationVersion: "1.0.0",
        });

        const verification = await verifyBackupArchive({
            archivePath,
            limits: { maxEntries: 1 },
        });

        expect(verification.valid).toBe(false);
        expect(verification.errors[0]).toBe("The backup archive contains too many entries.");
    });
});
