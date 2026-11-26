/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

jest.mock("electron", () => ({ dialog: { showOpenDialog: jest.fn() } }));

import { dialog } from "electron";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeDatabase, initializeDatabase } from "@talemaster/database";
import { createApplicationStoragePaths, ensureApplicationStorage } from "../../storage/application-storage";
import { createProfilesIpcAdapter } from "./profiles.ipc-adapter";

describe("profiles IPC adapter", () => {
    let database: ReturnType<typeof initializeDatabase>;
    let directory: string;
    let handler: (request: unknown) => Promise<unknown>;

    beforeEach(async () => {
        database = initializeDatabase({ directory: join(directory, "database") });
        directory = await mkdtemp(join(tmpdir(), "talemaster-profile-ipc-"));
        const storage = createApplicationStoragePaths(directory);
        await ensureApplicationStorage(storage);
        createProfilesIpcAdapter({
            database,
            storage,
        }).register({
            handle: (_channel: string, callback: (request: unknown) => Promise<unknown>) => {
                handler = callback;
            },
        } as never);
    });

    afterEach(async () => {
        closeDatabase(database);
        await rm(directory, { recursive: true, force: true });
        jest.clearAllMocks();
    });

    it("creates a default profile on first list and creates/switches profiles", async () => {
        const initial = await handler({ operation: "list" }) as { profiles: { nickname: string; isActive: boolean }[] };
        expect(initial.profiles).toHaveLength(1);
        expect(initial.profiles[0]).toMatchObject({ nickname: "Adventurer", isActive: true });

        await handler({ operation: "create", nickname: "Second" });
        const second = await handler({ operation: "list" }) as { profiles: { id: string; nickname: string; isActive: boolean }[] };
        const secondProfile = second.profiles.find((profile) => profile.nickname === "Second");
        expect(secondProfile?.isActive).toBe(false);

        await handler({ operation: "switch", profileId: secondProfile?.id });
        const switched = await handler({ operation: "list" }) as { profiles: { nickname: string; isActive: boolean }[] };
        expect(switched.profiles.find((profile) => profile.nickname === "Second")?.isActive).toBe(true);
    });

    it("rejects malformed requests", async () => {
        await expect(handler({ operation: "delete-all" })).rejects.toThrow("Unsupported profile operation");
        await expect(handler({ operation: "list", extra: true })).rejects.toThrow("Invalid profile list request");
    });

    it("treats avatar dialog cancellation as a no-op", async () => {
        (dialog.showOpenDialog as jest.Mock).mockResolvedValue({ canceled: true, filePaths: [] });
        const initial = await handler({ operation: "list" }) as { profiles: { id: string }[] };
        const response = await handler({ operation: "choose-avatar", profileId: initial.profiles[0].id });
        expect(response).toMatchObject({ profiles: [{ nickname: "Adventurer" }] });
    });
});
