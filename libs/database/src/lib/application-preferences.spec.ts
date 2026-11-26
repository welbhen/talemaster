/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import Database from "better-sqlite3";

import { getApplicationPreference, setApplicationPreference, deleteApplicationPreference } from "./application-preferences";
import { runMigrations } from "./migration-runner";
import { migrations } from "./migrations";

describe("application preferences", () => {
    let database: Database.Database;

    beforeEach(() => {
        database = new Database(":memory:");
        runMigrations(database, migrations);
    });

    afterEach(() => database.close());

    it("stores and retrieves JSON values", () => {
        setApplicationPreference(database, "appearance", { theme: "dark", compact: true });
        expect(getApplicationPreference(database, "appearance")).toEqual({
            theme: "dark",
            compact: true,
        });
    });

    it("returns undefined for missing values and supports deletion", () => {
        expect(getApplicationPreference(database, "missing")).toBeUndefined();
        setApplicationPreference(database, "locale", "pt-BR");
        expect(deleteApplicationPreference(database, "locale")).toBe(true);
        expect(deleteApplicationPreference(database, "locale")).toBe(false);
    });

    it("rejects invalid keys and non-JSON values", () => {
        expect(() => setApplicationPreference(database, "", "x")).toThrow(TypeError);
        expect(() => setApplicationPreference(database, "bad", BigInt(1))).toThrow(TypeError);
    });
});
