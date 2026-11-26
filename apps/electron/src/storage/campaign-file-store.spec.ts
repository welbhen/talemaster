/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createApplicationStoragePaths, ensureApplicationStorage } from "./application-storage";
import { CampaignFileStore } from "./campaign-file-store";

describe("CampaignFileStore", () => {
    let directory: string;
    let store: CampaignFileStore;
    const campaignId = "f6a5b7c8-1234-4123-8123-123456789abc";
    const documentId = "a6a5b7c8-1234-4123-8123-123456789abc";

    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), "talemaster-files-"));
        const paths = createApplicationStoragePaths(directory);
        await ensureApplicationStorage(paths);
        store = new CampaignFileStore(paths);
    });

    afterEach(async () => {
        await rm(directory, { recursive: true, force: true });
    });

    it("writes and reads versioned documents", async () => {
        const document = { formatVersion: 1 as const, content: { type: "doc" as const, content: [] } };
        await store.writeDocument(campaignId, documentId, document);
        await expect(store.readDocument(campaignId, documentId)).resolves.toEqual(document);
    });

    it("reads documents already present before the store is initialized", async () => {
        const document = { formatVersion: 1, content: { type: "doc", content: [] } };
        const documentPath = join(
            directory,
            "talemaster",
            "campaigns",
            campaignId,
            "documents",
            `${documentId}.json`,
        );
        await mkdir(join(documentPath, ".."), { recursive: true });
        await writeFile(documentPath, JSON.stringify(document));

        await store.initializeCampaign(campaignId);

        await expect(store.readDocument(campaignId, documentId)).resolves.toEqual(document);
    });

    it("updates an existing document without losing its campaign directory", async () => {
        const first = { formatVersion: 1 as const, content: { type: "doc" as const, content: [] } };
        const second = {
            formatVersion: 1 as const,
            content: { type: "doc" as const, content: [{ type: "paragraph" }] },
        };
        await store.writeDocument(campaignId, documentId, first);
        await store.writeDocument(campaignId, documentId, second);

        await expect(store.readDocument(campaignId, documentId)).resolves.toEqual(second);
    });

    it("writes assets using generated IDs and allowlisted extensions", async () => {
        const asset = await store.writeAsset(campaignId, "images", ".png", new Uint8Array([1, 2, 3]));
        expect(asset.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(asset.extension).toBe(".png");
        await expect(
            readFile(
                join(directory, "talemaster", "campaigns", campaignId, "images", `${asset.id}.png`),
            ),
        ).resolves.toEqual(Buffer.from([1, 2, 3]));
        await expect(
            store.writeAsset(campaignId, "images", ".exe", new Uint8Array([1])),
        ).rejects.toThrow("Unsupported");
    });

    it("reports existing inventory without deleting files", async () => {
        await store.writeDocument(campaignId, documentId, {
            formatVersion: 1,
            content: { type: "doc", content: [] },
        });
        const inventory = await store.scanCampaign(campaignId);
        expect(inventory.documents).toEqual([`${documentId}.json`]);
        expect(inventory.unsafeEntries).toEqual([]);
        await expect(
            readFile(
                join(
                    directory,
                    "talemaster",
                    "campaigns",
                    campaignId,
                    "documents",
                    `${documentId}.json`,
                ),
                "utf8",
            ),
        ).resolves.toContain('"formatVersion": 1');
    });

    it("rejects malformed pre-existing documents", async () => {
        const documentPath = join(
            directory,
            "talemaster",
            "campaigns",
            campaignId,
            "documents",
            `${documentId}.json`,
        );
        await mkdir(join(documentPath, ".."), { recursive: true });
        await writeFile(documentPath, "{ invalid json");
        await expect(store.readDocument(campaignId, documentId)).rejects.toThrow(
            "invalid JSON",
        );
    });
});
