/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import type { ApplicationStoragePaths } from "./application-storage";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const MIME_EXTENSIONS = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
} as const;

export interface StoredProfileAvatar {
    readonly filename: string;
    readonly dataUrl: string;
}

function detectImageMime(data: Buffer): keyof typeof MIME_EXTENSIONS | undefined {
    if (
        data.length >= 8 &&
        data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) return "image/png";

    if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
        return "image/jpeg";
    }

    if (
        data.length >= 12 &&
        data.toString("ascii", 0, 4) === "RIFF" &&
        data.toString("ascii", 8, 12) === "WEBP"
    ) return "image/webp";

    return undefined;
}

async function ensureAvatarDirectory(directory: string): Promise<void> {
    await mkdir(directory, { recursive: true });
    const metadata = await lstat(directory);
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
        throw new Error("Profile avatar storage is not a safe directory.");
    }
}

export class ProfileAvatarStore {
    private readonly directory: string;

    constructor(storage: ApplicationStoragePaths) {
        this.directory = storage.profileAvatars;
    }

    async save(sourcePath: string): Promise<StoredProfileAvatar> {
        await ensureAvatarDirectory(this.directory);
        const data = await readFile(sourcePath);

        if (data.byteLength === 0 || data.byteLength > MAX_AVATAR_BYTES) {
            throw new RangeError("Profile pictures must be smaller than 2 MiB.");
        }

        const mime = detectImageMime(data);
        if (!mime) throw new TypeError("Choose a valid PNG, JPEG, or WebP image.");

        const filename = `${randomUUID()}${MIME_EXTENSIONS[mime]}`;
        const destination = join(this.directory, filename);
        const temporary = join(this.directory, `.${randomUUID()}.tmp`);
        const handle = await open(temporary, "wx");

        try {
            await handle.writeFile(data);
            await handle.sync();
        } catch (error) {
            await handle.close();
            await rm(temporary, { force: true });
            throw error;
        }
        await handle.close();

        try {
            await rename(temporary, destination);
        } catch (error) {
            await rm(temporary, { force: true });
            throw error;
        }

        return { filename, dataUrl: `data:${mime};base64,${data.toString("base64")}` };
    }

    async read(filename: string): Promise<string | undefined> {
        if (!/^[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(filename)) {
            throw new TypeError("Profile avatar reference is invalid.");
        }

        await ensureAvatarDirectory(this.directory);
        const path = join(this.directory, filename);
        const metadata = await lstat(path);
        if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > MAX_AVATAR_BYTES) {
            throw new Error("Stored profile picture is not a supported regular file.");
        }

        const data = await readFile(path);
        const mime = detectImageMime(data);
        if (!mime) throw new Error("Stored profile picture has an invalid image signature.");

        return `data:${mime};base64,${data.toString("base64")}`;
    }
}
