/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApplicationStoragePaths, ensureApplicationStorage } from "./application-storage";
import { ProfileAvatarStore } from "./profile-avatar-store";

describe("ProfileAvatarStore", () => {
    let directory: string;
    let store: ProfileAvatarStore;

    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), "talemaster-profile-"));
        const storage = createApplicationStoragePaths(directory);
        await ensureApplicationStorage(storage);
        store = new ProfileAvatarStore(storage);
    });

    afterEach(async () => rm(directory, { recursive: true, force: true }));

    it("copies a PNG into managed storage with a generated filename", async () => {
        const source = join(directory, "picked.png");
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
        await writeFile(source, png);

        const avatar = await store.save(source);
        expect(avatar.filename).toMatch(/^[0-9a-f-]{36}\.png$/i);
        await expect(readFile(join(directory, "talemaster", "profile-avatars", avatar.filename))).resolves.toEqual(png);
        await expect(store.read(avatar.filename)).resolves.toContain("data:image/png;base64,");
    });

    it("rejects unsupported file contents even when the extension is allowed", async () => {
        const source = join(directory, "spoofed.png");
        await writeFile(source, "not an image");
        await expect(store.save(source)).rejects.toThrow("valid PNG");
    });

    it("rejects invalid avatar references", async () => {
        await expect(store.read("../../outside.png")).rejects.toThrow("reference is invalid");
    });
});
