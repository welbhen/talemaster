/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import Database from "better-sqlite3";
import { runMigrations } from "./migration-runner";
import { migrations } from "./migrations";
import {
    createLocalProfile,
    ensureDefaultLocalProfile,
    getActiveLocalProfile,
    listLocalProfiles,
    setActiveLocalProfile,
    setLocalProfileAvatar,
    updateLocalProfile,
} from "./local-profiles";

describe("local profiles", () => {
    let database: Database.Database;

    beforeEach(() => {
        database = new Database(":memory:");
        runMigrations(database, migrations);
    });

    afterEach(() => database.close());

    it("creates a default profile only when no profiles exist", () => {
        const first = ensureDefaultLocalProfile(database);
        expect(first.nickname).toBe("Adventurer");
        expect(first.isActive).toBe(true);
        expect(ensureDefaultLocalProfile(database)).toEqual(first);
        expect(listLocalProfiles(database)).toHaveLength(1);
    });

    it("creates additional profiles without changing the active profile", () => {
        const active = ensureDefaultLocalProfile(database);
        const second = createLocalProfile(database, "Welberth");

        expect(second.isActive).toBe(false);
        expect(getActiveLocalProfile(database)?.id).toBe(active.id);
    });

    it("updates nicknames and switches the active profile transactionally", () => {
        const first = ensureDefaultLocalProfile(database);
        const second = createLocalProfile(database, "Player Two");

        expect(updateLocalProfile(database, second.id, "Updated").nickname).toBe("Updated");
        expect(setActiveLocalProfile(database, second.id).isActive).toBe(true);
        expect(getActiveLocalProfile(database)?.id).toBe(second.id);
        expect(listLocalProfiles(database).filter((profile) => profile.isActive)).toHaveLength(1);
        expect(setActiveLocalProfile(database, first.id).isActive).toBe(true);
    });

    it("validates profile IDs and nickname values", () => {
        expect(() => createLocalProfile(database, " ")).toThrow(TypeError);
        expect(() => createLocalProfile(database, "x".repeat(41))).toThrow(TypeError);
        expect(() => createLocalProfile(database, "Bad\nName")).toThrow(TypeError);
        expect(() => setActiveLocalProfile(database, "../invalid")).toThrow(TypeError);
        expect(() => updateLocalProfile(database, "not-a-uuid", "Name")).toThrow(TypeError);
    });

    it("stores only generated, allowlisted avatar filenames", () => {
        const profile = ensureDefaultLocalProfile(database);
        expect(() =>
            setLocalProfileAvatar(database, profile.id, "../../avatar.png"),
        ).toThrow(TypeError);

        const filename = "a6a5b7c8-1234-4123-8123-123456789abc.webp";
        expect(setLocalProfileAvatar(database, profile.id, filename).avatarFilename).toBe(filename);
    });

    it("rejects switching to a missing profile without deactivating the current one", () => {
        const profile = ensureDefaultLocalProfile(database);
        expect(() =>
            setActiveLocalProfile(database, "a6a5b7c8-1234-4123-8123-123456789abc"),
        ).toThrow("Profile was not found");
        expect(getActiveLocalProfile(database)?.id).toBe(profile.id);
    });
});
