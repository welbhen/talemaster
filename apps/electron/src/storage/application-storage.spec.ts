/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
    assertPathWithin,
    assertSafeExistingPath,
    createApplicationStoragePaths,
    ensureApplicationStorage,
    getCampaignStoragePaths,
    validateStorageId,
} from "./application-storage";

describe("application storage paths", () => {
    let directory: string;

    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), "talemaster-storage-"));
    });

    afterEach(async () => {
        await rm(directory, { recursive: true, force: true });
    });

    it("roots all application data beneath userData/talemaster", () => {
        const paths = createApplicationStoragePaths(directory);
        expect(paths.root).toBe(join(directory, "talemaster"));
        expect(paths.database).toBe(join(paths.root, "database"));
        expect(paths.logs).toBe(join(paths.root, "logs"));
    });

    it("rejects invalid IDs and path traversal", () => {
        expect(() => validateStorageId("../campaign")).toThrow(TypeError);
        expect(() =>
            getCampaignStoragePaths(createApplicationStoragePaths(directory), "../x"),
        ).toThrow(TypeError);
        expect(() =>
            assertPathWithin(join(directory, "root"), join(directory, "outside")),
        ).toThrow();
    });

    it("creates the canonical directory structure", async () => {
        const paths = createApplicationStoragePaths(directory);
        await ensureApplicationStorage(paths);
        expect(paths.root).toContain(join(directory, "talemaster"));
    });

    it("is idempotent and preserves pre-existing directories and files", async () => {
        const paths = createApplicationStoragePaths(directory);
        const existingDirectory = join(paths.root, "campaigns");
        await mkdir(existingDirectory, { recursive: true });
        const markerPath = join(existingDirectory, "existing-marker.txt");
        await writeFile(markerPath, "preserve me");

        await ensureApplicationStorage(paths);
        await ensureApplicationStorage(paths);

        await expect(readFile(markerPath, "utf8")).resolves.toBe("preserve me");
    });

    it("rejects symbolic links in managed paths", async () => {
        const paths = createApplicationStoragePaths(directory);
        await mkdir(paths.root, { recursive: true });
        const linked = join(paths.root, "database");
        await symlink(directory, linked, "junction");
        await expect(ensureApplicationStorage(paths)).rejects.toThrow("Unsafe storage directory");
        await expect(assertSafeExistingPath(paths.root, linked)).rejects.toThrow();
    });
});
