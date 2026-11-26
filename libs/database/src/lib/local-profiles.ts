/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

const MAX_NICKNAME_LENGTH = 40;
const PROFILE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AVATAR_FILENAME_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpe?g|gif|webp)$/i;

export interface LocalProfile {
    readonly id: string;
    readonly nickname: string;
    readonly avatarFilename?: string;
    readonly isActive: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
}

interface ProfileRow {
    readonly id: string;
    readonly nickname: string;
    readonly avatar_filename: string | null;
    readonly is_active: number;
    readonly created_at: string;
    readonly updated_at: string;
}

function validateProfileId(id: string): string {
    if (!PROFILE_ID_PATTERN.test(id)) {
        throw new TypeError("Profile ID must be a valid UUID.");
    }
    return id.toLowerCase();
}

function validateNickname(nickname: string): string {
    if (typeof nickname !== "string") {
        throw new TypeError("Profile nickname must be a string.");
    }

    const normalized = nickname.trim();
    if (
        normalized.length === 0 ||
        normalized.length > MAX_NICKNAME_LENGTH ||
        /[\u0000-\u001f\u007f]/.test(normalized)
    ) {
        throw new TypeError("Profile nickname must contain 1 to 40 printable characters.");
    }

    return normalized;
}

function mapProfile(row: ProfileRow): LocalProfile {
    return {
        id: row.id,
        nickname: row.nickname,
        ...(row.avatar_filename ? { avatarFilename: row.avatar_filename } : {}),
        isActive: row.is_active === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function findProfile(database: Database.Database, id: string): ProfileRow | undefined {
    return database
        .prepare(
            `SELECT id, nickname, avatar_filename, is_active, created_at, updated_at
             FROM profiles WHERE id = ?`,
        )
        .get(id) as ProfileRow | undefined;
}

export function listLocalProfiles(database: Database.Database): LocalProfile[] {
    const rows = database
        .prepare(
            `SELECT id, nickname, avatar_filename, is_active, created_at, updated_at
             FROM profiles ORDER BY created_at ASC, id ASC`,
        )
        .all() as ProfileRow[];
    return rows.map(mapProfile);
}

export function getActiveLocalProfile(database: Database.Database): LocalProfile | undefined {
    const row = database
        .prepare(
            `SELECT id, nickname, avatar_filename, is_active, created_at, updated_at
             FROM profiles WHERE is_active = 1 LIMIT 1`,
        )
        .get() as ProfileRow | undefined;
    return row ? mapProfile(row) : undefined;
}

export function createLocalProfile(
    database: Database.Database,
    nickname: string,
): LocalProfile {
    const normalizedNickname = validateNickname(nickname);
    const id = randomUUID();
    const create = database.transaction(() => {
        const hasProfiles = database.prepare("SELECT 1 FROM profiles LIMIT 1").get() !== undefined;
        database
            .prepare(
                `INSERT INTO profiles (id, nickname, is_active)
                 VALUES (?, ?, ?)`,
            )
            .run(id, normalizedNickname, hasProfiles ? 0 : 1);
        return findProfile(database, id) as ProfileRow;
    });

    return mapProfile(create.immediate());
}

export function updateLocalProfile(
    database: Database.Database,
    id: string,
    nickname: string,
): LocalProfile {
    const profileId = validateProfileId(id);
    const normalizedNickname = validateNickname(nickname);
    const update = database
        .prepare(
            `UPDATE profiles
             SET nickname = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
        )
        .run(normalizedNickname, profileId);

    if (update.changes === 0) {
        throw new Error("Profile was not found.");
    }

    return mapProfile(findProfile(database, profileId) as ProfileRow);
}

export function setLocalProfileAvatar(
    database: Database.Database,
    id: string,
    filename: string,
): LocalProfile {
    const profileId = validateProfileId(id);
    if (!AVATAR_FILENAME_PATTERN.test(filename)) {
        throw new TypeError("Avatar filename is invalid.");
    }

    const update = database
        .prepare(
            `UPDATE profiles
             SET avatar_filename = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
        )
        .run(filename, profileId);

    if (update.changes === 0) {
        throw new Error("Profile was not found.");
    }

    return mapProfile(findProfile(database, profileId) as ProfileRow);
}

export function setActiveLocalProfile(
    database: Database.Database,
    id: string,
): LocalProfile {
    const profileId = validateProfileId(id);
    const activate = database.transaction(() => {
        if (!findProfile(database, profileId)) {
            throw new Error("Profile was not found.");
        }

        database.prepare("UPDATE profiles SET is_active = 0 WHERE is_active = 1").run();
        database
            .prepare(
                `UPDATE profiles
                 SET is_active = 1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
            )
            .run(profileId);
        return findProfile(database, profileId) as ProfileRow;
    });

    return mapProfile(activate.immediate());
}

export function ensureDefaultLocalProfile(database: Database.Database): LocalProfile {
    const existing = getActiveLocalProfile(database);
    if (existing) return existing;

    const first = listLocalProfiles(database)[0];
    if (first) return setActiveLocalProfile(database, first.id);

    return createLocalProfile(database, "Adventurer");
}
