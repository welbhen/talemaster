/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { dialog } from "electron";
import type { DatabaseContext, LocalProfile } from "@talemaster/database";
import {
    createLocalProfile,
    ensureDefaultLocalProfile,
    listLocalProfiles,
    setActiveLocalProfile,
    setLocalProfileAvatar,
    updateLocalProfile,
} from "@talemaster/database";
import type { IpcMainRegistrar } from "@talemaster/ipc-bridge";
import type { ApplicationStoragePaths } from "../../storage/application-storage";
import { ProfileAvatarStore } from "../../storage/profile-avatar-store";
import type { ProfileDto, ProfileRequest, ProfileResponse } from "../profile-ipc.types";
import type { TaleMasterIpcChannels } from "../ipc-contracts";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRequest(value: unknown): ProfileRequest {
    if (!isRecord(value) || typeof value.operation !== "string") {
        throw new TypeError("Invalid profile request.");
    }

    const keys = Object.keys(value).sort().join(",");
    switch (value.operation) {
        case "list":
            if (keys !== "operation") throw new TypeError("Invalid profile list request.");
            return { operation: "list" };
        case "create":
            if (keys !== "nickname,operation" || typeof value.nickname !== "string") {
                throw new TypeError("Invalid profile creation request.");
            }
            return { operation: "create", nickname: value.nickname };
        case "update":
            if (keys !== "nickname,operation,profileId" || typeof value.profileId !== "string" || typeof value.nickname !== "string") {
                throw new TypeError("Invalid profile update request.");
            }
            return { operation: "update", profileId: value.profileId, nickname: value.nickname };
        case "switch":
        case "choose-avatar":
            if (keys !== "operation,profileId" || typeof value.profileId !== "string") {
                throw new TypeError("Invalid profile selection request.");
            }
            return { operation: value.operation, profileId: value.profileId };
        default:
            throw new TypeError("Unsupported profile operation.");
    }
}

export interface ProfileIpcAdapterOptions {
    readonly database: DatabaseContext;
    readonly storage: ApplicationStoragePaths;
}

export function createProfilesIpcAdapter(options: ProfileIpcAdapterOptions) {
    const avatarStore = new ProfileAvatarStore(options.storage);
    const database = options.database.connection;

    async function toDto(profile: LocalProfile): Promise<ProfileDto> {
        const avatarDataUrl = profile.avatarFilename
            ? await avatarStore.read(profile.avatarFilename).catch(() => undefined)
            : undefined;

        return {
            id: profile.id,
            nickname: profile.nickname,
            ...(avatarDataUrl ? { avatarDataUrl } : {}),
            isActive: profile.isActive,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
        };
    }

    async function response(): Promise<ProfileResponse> {
        const active = ensureDefaultLocalProfile(database);
        const profiles = await Promise.all(listLocalProfiles(database).map(toDto));
        return { profiles, activeProfileId: active.id };
    }

    return {
        register(registrar: IpcMainRegistrar<TaleMasterIpcChannels>): void {
            registrar.handle("profiles:request", async (input) => {
                const request = validateRequest(input);

                switch (request.operation) {
                    case "list":
                        return response();
                    case "create":
                        createLocalProfile(database, request.nickname);
                        return response();
                    case "update":
                        updateLocalProfile(database, request.profileId, request.nickname);
                        return response();
                    case "switch":
                        setActiveLocalProfile(database, request.profileId);
                        return response();
                    case "choose-avatar": {
                        if (!listLocalProfiles(database).some((profile) => profile.id === request.profileId)) {
                            throw new Error("Profile was not found.");
                        }
                        const selection = await dialog.showOpenDialog({
                            properties: ["openFile"],
                            filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
                        });
                        if (selection.canceled || selection.filePaths.length === 0) return response();

                        const stored = await avatarStore.save(selection.filePaths[0]);
                        setLocalProfileAvatar(database, request.profileId, stored.filename);
                        return response();
                    }
                }
            });
        },
    };
}
